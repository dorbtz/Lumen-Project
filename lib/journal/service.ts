/**
 * Lumen — journal service (SPEC §3.1 #3 Echo Journal).
 *
 *   - createJournalEntry: embed reflection, generate a thoughtful Echo
 *     question via Gemini, persist a `journal_entries` row including the
 *     mood-at-watch vector.
 *   - listJournalEntries: chronological feed for the dedicated /journal page,
 *     joined with title metadata for poster/title rendering.
 *   - getRecentReflectionThemes: surfaces ~5 distinctive low-cost tokens from
 *     the viewer's recent reflections, used to colour the Echo prompt.
 */

import { generateEchoQuestion } from "@/lib/ai/echo";
import { embedReflection } from "@/lib/ai/embeddings";
import { db } from "@/lib/db/client";
import { getTitleEmbedding } from "@/lib/db/queries";
import { journalEntries, ratings, titles } from "@/lib/db/schema";
import { computeTasteCentroid, toVectorLiteral } from "@/lib/profile/centroid";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

export interface CreateJournalInput {
  profileId: string;
  titleUuid: string;
  reflection: string;
  /** -1..1 each — see MoodDial axes. */
  valence: number;
  arousal: number;
  /** Optional 1–5 star rating — persisted + folded into the taste centroid. */
  journalStars?: number;
}

export interface JournalEntryWithTitle {
  id: string;
  watchedAt: Date;
  reflection: string | null;
  generatedQuestion: string | null;
  title: {
    id: string;
    tmdbId: number;
    title: string;
    posterPath: string | null;
    releaseYear: number | null;
  };
}

/** Insert a journal entry. Returns the created row's id + the question. */
export async function createJournalEntry(input: CreateJournalInput): Promise<{
  id: string;
  generatedQuestion: string;
}> {
  const { profileId, titleUuid, reflection } = input;
  const trimmed = reflection.trim();
  if (trimmed.length < 4) throw new Error("Reflection too short");
  if (trimmed.length > 4000) throw new Error("Reflection too long");

  const title = await db.query.titles.findFirst({ where: eq(titles.id, titleUuid) });
  if (!title) throw new Error("Title not found");

  const v = clamp(input.valence, -1, 1);
  const a = clamp(input.arousal, -1, 1);
  const moodVec = buildMoodAtWatch(v, a);
  const moodLiteral = `[${moodVec.join(",")}]`;

  // Embed + question generation in parallel to shave ~400ms off the wait.
  const themesPromise = getRecentReflectionThemes(profileId);
  const [embedding, themes] = await Promise.all([
    embedReflection(trimmed).catch((err) => {
      console.error("[journal] embed failed", err);
      return null;
    }),
    themesPromise,
  ]);

  let question: string;
  try {
    const echo = await generateEchoQuestion({
      title: title.title,
      overview: title.overview ?? "",
      recentReflectionThemes: themes,
    });
    question = echo.question;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status =
      (err as { statusCode?: number; status?: number })?.statusCode ??
      (err as { status?: number })?.status;
    const isQuota = status === 429 || /quota|rate.?limit|exhaust/i.test(msg);
    if (isQuota) {
      console.info("[journal] echo skipped — Gemini quota exhausted");
    } else {
      console.error("[journal] echo generation failed", { message: msg, status });
    }
    // Graceful fallback — entry still saves, just without a generated question.
    question = "What lingered for you after this one?";
  }

  const embeddingLiteral = embedding ? `[${embedding.join(",")}]` : null;

  // Raw SQL for vector columns — drizzle-kit doesn't yet expose pgvector
  // parameterised values for insert.
  const rows = await db.execute(sql`
    INSERT INTO journal_entries
      (profile_id, title_id, reflection, reflection_embedding, generated_question, mood_at_watch)
    VALUES
      (${profileId}, ${titleUuid}, ${trimmed},
       ${embeddingLiteral ? sql`${embeddingLiteral}::vector(384)` : sql`NULL`},
       ${question},
       ${moodLiteral}::vector(64))
    RETURNING id
  `);
  const id = (rows.rows[0] as { id: string } | undefined)?.id;
  if (!id) throw new Error("[journal] insert returned no id");

  // Optional star rating (plan WS9): persist it and fold ALL of the
  // profile's ratings back into the taste centroid so journaling
  // continuously sharpens recommendations (SPEC §3.1 #3). Non-fatal —
  // a failure here must not lose the journal entry.
  if (
    typeof input.journalStars === "number" &&
    input.journalStars >= 1 &&
    input.journalStars <= 5
  ) {
    try {
      await applyJournalRating(profileId, titleUuid, input.journalStars);
    } catch (err) {
      console.error("[journal] rating/centroid update failed", err);
    }
  }

  return { id, generatedQuestion: question };
}

/**
 * Upsert a rating from the journal and recompute the profile's taste
 * centroid from EVERY rating it has (onboarding + journal), mirroring the
 * onboarding weighting (score/10 == stars/5). Never nulls an existing
 * centroid: if no rated title has an embedding yet we simply leave the
 * current centroid in place.
 */
async function applyJournalRating(
  profileId: string,
  titleUuid: string,
  stars: number,
): Promise<void> {
  const score = stars * 2; // 1..5 → 2..10, same scale as onboarding
  await db
    .insert(ratings)
    .values({ profileId, titleId: titleUuid, score, liked: stars >= 4 })
    .onConflictDoUpdate({
      target: [ratings.profileId, ratings.titleId],
      set: { score, liked: stars >= 4, ratedAt: sql`now()` },
    });

  const rated = await db
    .select({ titleId: ratings.titleId, score: ratings.score })
    .from(ratings)
    .where(eq(ratings.profileId, profileId));

  const weighted: Array<{ vec: number[]; w: number }> = [];
  for (const r of rated) {
    const emb = await getTitleEmbedding(r.titleId);
    if (!emb) continue;
    weighted.push({ vec: emb, w: (r.score ?? 6) / 10 }); // 0.2..1.0
  }

  const centroid = computeTasteCentroid(weighted);
  if (!centroid) return; // keep the existing centroid rather than wiping it
  await db.execute(sql`
    UPDATE profiles
    SET taste_centroid = ${toVectorLiteral(centroid)}::vector(384)
    WHERE id = ${profileId}
  `);
}

/** Most recent entries (with title) for the /journal index. */
export async function listJournalEntries(
  profileId: string,
  limit = 50,
): Promise<JournalEntryWithTitle[]> {
  const rows = await db
    .select({
      id: journalEntries.id,
      watchedAt: journalEntries.watchedAt,
      reflection: journalEntries.reflection,
      generatedQuestion: journalEntries.generatedQuestion,
      titleId: titles.id,
      titleTmdbId: titles.tmdbId,
      titleTitle: titles.title,
      titlePoster: titles.posterPath,
      titleYear: titles.releaseYear,
    })
    .from(journalEntries)
    .innerJoin(titles, eq(journalEntries.titleId, titles.id))
    .where(eq(journalEntries.profileId, profileId))
    .orderBy(desc(journalEntries.watchedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    watchedAt: r.watchedAt,
    reflection: r.reflection,
    generatedQuestion: r.generatedQuestion,
    title: {
      id: r.titleId,
      tmdbId: r.titleTmdbId,
      title: r.titleTitle,
      posterPath: r.titlePoster,
      releaseYear: r.titleYear,
    },
  }));
}

/**
 * Delete specific journal entries for a profile. Scoped by profileId so a
 * profile can only ever delete its own entries. Returns the number removed.
 * Ratings are intentionally left intact (a rating is separate from the
 * reflection — mirrors the taste-reset policy that keeps the journal).
 */
export async function deleteJournalEntries(profileId: string, ids: string[]): Promise<number> {
  const clean = ids.filter((s) => typeof s === "string" && s.length > 0);
  if (clean.length === 0) return 0;
  const res = await db
    .delete(journalEntries)
    .where(and(eq(journalEntries.profileId, profileId), inArray(journalEntries.id, clean)));
  return (res as { rowCount?: number }).rowCount ?? clean.length;
}

/** Delete ALL journal entries for a profile. Returns the number removed. */
export async function deleteAllJournalEntries(profileId: string): Promise<number> {
  const res = await db.delete(journalEntries).where(eq(journalEntries.profileId, profileId));
  return (res as { rowCount?: number }).rowCount ?? 0;
}

/** Cheap token frequency over the last ~10 reflections — enough signal for
 *  the Echo prompt without spending an LLM call. Returns up to 5 phrases. */
export async function getRecentReflectionThemes(profileId: string): Promise<string[]> {
  const rows = await db
    .select({ reflection: journalEntries.reflection })
    .from(journalEntries)
    .where(eq(journalEntries.profileId, profileId))
    .orderBy(desc(journalEntries.watchedAt))
    .limit(10);
  if (rows.length === 0) return [];

  const STOP = new Set([
    "the",
    "and",
    "that",
    "with",
    "this",
    "from",
    "have",
    "were",
    "what",
    "when",
    "they",
    "there",
    "about",
    "into",
    "over",
    "just",
    "very",
    "like",
    "also",
    "than",
    "then",
    "them",
    "some",
    "such",
    "more",
    "most",
    "only",
    "even",
    "still",
    "much",
    "many",
    "much",
    "each",
    "other",
    "another",
    "because",
    "while",
    "since",
    "being",
    "really",
    "quite",
    "could",
    "would",
    "should",
    "much",
    "find",
    "feel",
    "felt",
    "look",
    "make",
    "made",
    "film",
    "movie",
    "scene",
    "scenes",
    "character",
    "characters",
    "story",
    "plot",
    "seems",
    "seemed",
    "makes",
    "made",
    "does",
    "done",
    "know",
    "think",
    "sense",
    "kind",
    "sort",
    "every",
    "didn't",
    "wasn't",
    "don't",
    "didnt",
    "wasnt",
    "dont",
    "i've",
    "i'm",
    "it's",
    "that's",
  ]);
  const counts = new Map<string, number>();
  for (const r of rows) {
    const tokens = (r.reflection ?? "").toLowerCase().match(/[a-z'][a-z']{3,}/g) ?? [];
    for (const t of tokens) {
      if (STOP.has(t)) continue;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term]) => term);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Build the 64-d mood_at_watch vector: [valence, arousal, 0, 0, ..., 0]. */
function buildMoodAtWatch(valence: number, arousal: number): number[] {
  const out = new Array(64).fill(0);
  out[0] = valence;
  out[1] = arousal;
  return out;
}
