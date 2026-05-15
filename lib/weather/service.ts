/**
 * Lumen — Cinema Weather aggregator (SPEC §3.1 Pillar 4).
 *
 * Loads 14 days of journal mood vectors, computes the valence/arousal centroid,
 * calls the LLM forecast generator, and surfaces 3 title picks matched to that
 * centroid. Never returns null — on LLM failure a hardcoded quadrant fallback
 * keeps the surface renderable.
 */

import { generateCinemaForecast } from "@/lib/ai/weather";
import { db } from "@/lib/db/client";
import { parseVectorLiteral, getTitlesByMood } from "@/lib/db/queries";
import { journalEntries } from "@/lib/db/schema";
import type { Title } from "@/lib/db/schema";
import { desc, eq, gte, sql } from "drizzle-orm";

export interface MoodPoint {
  v: number;
  a: number;
  watchedAt: Date;
}

export interface CinemaWeather {
  headline: string;
  forecast: string;
  moodLabel: string;
  centroid: { v: number; a: number };
  points: MoodPoint[];
  picks: Title[];
  timeOfDay: "morning" | "afternoon" | "evening" | "late_night";
}

function getTimeOfDay(): CinemaWeather["timeOfDay"] {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "late_night";
}

/** Quadrant-keyed hardcoded forecast lines used when Gemini is unavailable. */
function fallbackForecast(v: number, a: number): { headline: string; forecast: string; moodLabel: string } {
  if (v >= 0 && a >= 0) {
    return {
      headline: "Bright skies, electric charge",
      forecast: "High pressure system moving in. You've been riding an upbeat, energetic current — something kinetic and clever will keep that charge alive tonight.",
      moodLabel: "restless and bright",
    };
  }
  if (v < 0 && a >= 0) {
    return {
      headline: "Heavy clouds, charged air",
      forecast: "A storm front settling in. You've been gravitating toward intensity — something sharp and unrelenting will meet you where you are.",
      moodLabel: "charged and brooding",
    };
  }
  if (v >= 0 && a < 0) {
    return {
      headline: "Soft light, still air",
      forecast: "Gentle conditions all round. Your recent watches have leaned warm and unhurried — let the evening be quiet and generous.",
      moodLabel: "calm and warm",
    };
  }
  return {
    headline: "Overcast and contemplative",
    forecast: "Low pressure, low light. You've been pulling toward something wistful — give yourself something quietly observational tonight.",
    moodLabel: "wistful",
  };
}

export async function getCinemaWeather(profileId: string): Promise<CinemaWeather> {
  const since = new Date();
  since.setDate(since.getDate() - 14);

  // Raw SQL to get mood_at_watch as text — same pattern as getProfileTasteCentroid.
  const rows = await db.execute(sql`
    SELECT mood_at_watch::text AS mood_vec, watched_at
    FROM journal_entries
    WHERE profile_id = ${profileId}
      AND watched_at >= ${since}
    ORDER BY watched_at DESC
    LIMIT 50
  `);

  const points: MoodPoint[] = [];
  // `watched_at` comes back as a string from neon-http via db.execute(raw) —
  // Drizzle only coerces to Date for typed selects. Wrap each value before
  // storing so callers can safely call Date methods on it.
  for (const row of rows.rows as Array<{
    mood_vec: string | null;
    watched_at: string | Date;
  }>) {
    if (!row.mood_vec) continue;
    const vec = parseVectorLiteral(row.mood_vec);
    const v = vec[0] ?? 0;
    const a = vec[1] ?? 0;
    points.push({ v, a, watchedAt: new Date(row.watched_at) });
  }

  const centroid =
    points.length === 0
      ? { v: 0, a: 0 }
      : {
          v: points.reduce((s, p) => s + p.v, 0) / points.length,
          a: points.reduce((s, p) => s + p.a, 0) / points.length,
        };

  const timeOfDay = getTimeOfDay();

  // Picks: top 3 mood-matched titles.
  const allPicks = await getTitlesByMood(centroid.v, centroid.a, 9);
  const picks = allPicks.slice(0, 3);

  // LLM forecast — fall back to quadrant copy on any error.
  let headline: string;
  let forecast: string;
  let moodLabel: string;

  try {
    const result = await generateCinemaForecast({
      valenceAvg: centroid.v,
      arousalAvg: centroid.a,
      recentTitles: picks.map((t) => t.title),
      timeOfDay,
    });
    headline = result.headline;
    forecast = result.forecast;
    moodLabel = result.mood_label;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status =
      (err as { statusCode?: number })?.statusCode ?? (err as { status?: number })?.status;
    const isQuota = status === 429 || /quota|rate.?limit|exhaust/i.test(msg);
    if (isQuota) {
      console.info("[weather] forecast skipped — Gemini quota exhausted");
    } else {
      console.error("[weather] forecast generation failed", { message: msg, status });
    }
    const fb = fallbackForecast(centroid.v, centroid.a);
    headline = fb.headline;
    forecast = fb.forecast;
    moodLabel = fb.moodLabel;
  }

  return { headline, forecast, moodLabel, centroid, points, picks, timeOfDay };
}
