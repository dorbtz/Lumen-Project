/**
 * Lumen — taste-dimension extraction (Why Card input).
 *
 * The Why Card prompt needs human-readable phrases that describe the viewer's
 * taste — "slow-burn thrillers", "1970s neo-noir", "ensemble dramas".
 *
 * We don't have human-curated dimensions on hand, so we synthesize them from
 * what we already know: the profile's positively-rated films. Their genres +
 * keywords, weighted by rating, surface the dominant themes.
 *
 * Returns up to 6 phrases ordered by weight. Falls back to genre-only when
 * keywords aren't available.
 */

import { db } from "@/lib/db/client";
import { ratings, titles } from "@/lib/db/schema";
import { and, desc, eq, gte, or, sql } from "drizzle-orm";

const POSITIVE_SCORE = 7; // 7+ counts as a like
const MAX_DIMS = 6;

export async function getTopTasteDimensions(profileId: string): Promise<string[]> {
  // Pull all positively-rated titles (score ≥ 7 OR liked=true) for the profile.
  const rows = await db
    .select({
      score: ratings.score,
      liked: ratings.liked,
      genres: titles.genres,
      keywords: titles.keywords,
    })
    .from(ratings)
    .innerJoin(titles, eq(ratings.titleId, titles.id))
    .where(
      and(
        eq(ratings.profileId, profileId),
        or(gte(ratings.score, POSITIVE_SCORE), eq(ratings.liked, true)),
      ),
    )
    .orderBy(desc(ratings.ratedAt))
    .limit(60);

  if (rows.length === 0) return [];

  // Weight: a 10/10 contributes more than a 7/10. liked-only = weight 1.
  const counts = new Map<string, number>();
  for (const r of rows) {
    const w = typeof r.score === "number" ? Math.max(0, r.score - 6) : 1; // 7→1, 10→4
    for (const g of r.genres ?? []) bump(counts, g.toLowerCase(), w);
    for (const k of r.keywords ?? []) bump(counts, k.toLowerCase(), w * 0.6);
  }

  // Sort by weight, then alpha for stability when weights tie.
  const sorted = [...counts.entries()]
    .filter(([term]) => term.length >= 3 && term.length <= 40)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  return sorted.slice(0, MAX_DIMS).map(([term]) => term);
}

function bump(map: Map<string, number>, key: string, w: number) {
  map.set(key, (map.get(key) ?? 0) + w);
}

/** A short, friendly summary the Why Card can use when no rating data exists. */
export const DEFAULT_DIMENSIONS = [
  "cinematic visuals",
  "memorable characters",
  "strong storytelling",
];

/** Returns dimensions for the profile, or the default fallback. */
export async function getTopTasteDimensionsOrDefault(profileId: string): Promise<string[]> {
  const dims = await getTopTasteDimensions(profileId);
  return dims.length >= 2 ? dims : DEFAULT_DIMENSIONS;
}
