/**
 * Lumen — Recap service.
 *
 * Returns a discriminated result so the page can render a precise empty
 * state:
 *   - "ok"                  → recap available (fresh or cached)
 *   - "no_entries"          → no journal entries anywhere yet
 *   - "generation_failed"   → entries exist but Gemini errored
 *                             (reason: "quota" | "unknown")
 *
 * Time window: prefers the last 14 days. If the viewer has older entries but
 * nothing in the recent window, we widen to all-time so the recap surface
 * stays useful for slower journalers — the AI prompt is told which window
 * matched so it can shape the headline tone accordingly.
 */

import { type Recap, type RecapInputItem, generateRecap } from "@/lib/ai/recap";
import { db } from "@/lib/db/client";
import { parseVectorLiteral } from "@/lib/db/queries";
import { recapStates } from "@/lib/db/schema";
import { generateShareToken } from "@/lib/recap/share";
import { desc, eq, sql } from "drizzle-orm";

const TTL_MS = 24 * 60 * 60 * 1000;
const RECENT_WINDOW_DAYS = 14;
const MAX_ENTRIES = 20;

export interface RecapMoment {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  beat: string;
}

interface RecapStoryJson {
  headline: string;
  story: string;
  moments: RecapMoment[];
  entryCount: number;
  /** Days covered; 0 sentinel = all-time fallback was used. */
  windowDays: number;
}

export interface ResolvedRecap extends RecapStoryJson {
  generatedAt: Date;
  source: "fresh" | "cached";
}

export type RecapResult =
  | { kind: "ok"; recap: ResolvedRecap }
  | { kind: "no_entries" }
  | { kind: "generation_failed"; reason: "quota" | "unknown" };

export async function getOrGenerateRecap(
  profileId: string,
  opts: { force?: boolean } = {},
): Promise<RecapResult> {
  // Cache hit — recent and successful generations land here. The nightly
  // cron passes { force: true } to always rebuild (SPEC_COMPLETION §1 A4).
  const latest = await db.query.recapStates.findFirst({
    where: eq(recapStates.profileId, profileId),
    orderBy: [desc(recapStates.generatedAt)],
  });
  if (!opts.force && latest && Date.now() - latest.generatedAt.getTime() < TTL_MS) {
    return {
      kind: "ok",
      recap: {
        ...(latest.storyJson as RecapStoryJson),
        generatedAt: latest.generatedAt,
        source: "cached",
      },
    };
  }

  const { entries, usedFallback } = await loadEntries(profileId);
  if (entries.length === 0) return { kind: "no_entries" };

  const inputs: RecapInputItem[] = entries.map((e, i) => {
    const moodVec = e.mood ? parseVectorLiteral(e.mood) : [0, 0];
    return {
      index: i,
      title: e.title,
      watchedAt: new Date(e.watched_at).toISOString().slice(0, 10),
      reflection: e.reflection,
      question: e.generated_question,
      valence: moodVec[0] ?? 0,
      arousal: moodVec[1] ?? 0,
    };
  });

  const windowLabel = usedFallback
    ? "the viewer's full watch history"
    : `the last ${RECENT_WINDOW_DAYS} days`;
  const windowDays = usedFallback ? 0 : RECENT_WINDOW_DAYS;

  let recap: Recap;
  try {
    recap = await generateRecap({ items: inputs, windowLabel });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status =
      (err as { statusCode?: number; status?: number })?.statusCode ??
      (err as { status?: number })?.status;
    const isQuota = status === 429 || /quota|rate.?limit|exhaust/i.test(msg);
    if (isQuota) {
      console.info("[recap] skipped — Gemini quota exhausted", { profileId });
      return { kind: "generation_failed", reason: "quota" };
    }
    console.error("[recap] generation failed", { profileId, message: msg, status });
    return { kind: "generation_failed", reason: "unknown" };
  }

  const moments: RecapMoment[] = recap.moments
    .filter((m) => m.titleIndex >= 0 && m.titleIndex < entries.length)
    .map((m) => {
      const e = entries[m.titleIndex]!;
      return {
        tmdbId: e.tmdb_id,
        title: e.title,
        posterPath: e.poster_path,
        beat: m.beat,
      };
    });

  const storyJson: RecapStoryJson = {
    headline: recap.headline,
    story: recap.story,
    moments,
    entryCount: entries.length,
    windowDays,
  };

  // A fresh recap rotates the share token: a brand-new row gets a brand-new
  // token, so any previously-shared public link (pointing at the prior row's
  // token) is implicitly revoked (SPEC_COMPLETION §1 A2).
  await db.insert(recapStates).values({
    profileId,
    storyJson,
    shareToken: generateShareToken(),
  });

  return {
    kind: "ok",
    recap: { ...storyJson, generatedAt: new Date(), source: "fresh" },
  };
}

interface RecentEntryRow {
  reflection: string | null;
  generated_question: string | null;
  watched_at: string | Date;
  mood: string | null;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
}

async function loadEntries(
  profileId: string,
): Promise<{ entries: RecentEntryRow[]; usedFallback: boolean }> {
  // Recent window first.
  const recent = await db.execute(sql`
    SELECT
      je.reflection AS reflection,
      je.generated_question AS generated_question,
      je.watched_at AS watched_at,
      je.mood_at_watch::text AS mood,
      t.tmdb_id AS tmdb_id,
      t.title AS title,
      t.poster_path AS poster_path
    FROM journal_entries je
    INNER JOIN titles t ON t.id = je.title_id
    WHERE je.profile_id = ${profileId}
      AND je.watched_at >= NOW() - INTERVAL '${sql.raw(String(RECENT_WINDOW_DAYS))} days'
    ORDER BY je.watched_at DESC
    LIMIT ${MAX_ENTRIES}
  `);
  if (recent.rows.length > 0) {
    return { entries: recent.rows as unknown as RecentEntryRow[], usedFallback: false };
  }

  // Nothing recent — widen to all-time. Surfaces older entries so the page
  // stays useful for slower journalers; the AI prompt is told the window
  // is "full watch history" so the tone shifts accordingly.
  const all = await db.execute(sql`
    SELECT
      je.reflection AS reflection,
      je.generated_question AS generated_question,
      je.watched_at AS watched_at,
      je.mood_at_watch::text AS mood,
      t.tmdb_id AS tmdb_id,
      t.title AS title,
      t.poster_path AS poster_path
    FROM journal_entries je
    INNER JOIN titles t ON t.id = je.title_id
    WHERE je.profile_id = ${profileId}
    ORDER BY je.watched_at DESC
    LIMIT ${MAX_ENTRIES}
  `);
  return { entries: all.rows as unknown as RecentEntryRow[], usedFallback: true };
}
