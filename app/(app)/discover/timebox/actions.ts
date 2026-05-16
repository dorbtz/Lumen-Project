"use server";

/**
 * Time-Box Discovery — server action (SPEC_COMPLETION §1 A1, SPEC §3.1 #5).
 *
 * Input: a runtime budget in minutes. Logic: filter
 * `runtime_min` to the band [floor..cap], rank by the active profile's
 * taste-centroid cosine (the SAME pgvector path the Mood Dial / taste rows
 * use), tie-break popularity. No LLM — zero new AI call sites.
 *
 * Returns Movies and Series separately (TV runtime = typical episode
 * length, so "I have 45 min" fits a drama episode). Empty below 40 min.
 */

import type { TitlePreviewData } from "@/components/title/TitlePreviewCard";
import { getActiveProfileId } from "@/lib/auth/active-profile";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { getProfileTasteCentroid, getTitlesByTimebox } from "@/lib/db/queries";
import type { Title } from "@/lib/db/schema";
import { isViableBudget } from "@/lib/discover/timebox-rule";

export interface TimeboxSearchInput {
  maxMinutes: number;
  limit?: number;
}

export interface TimeboxResult {
  movies: TitlePreviewData[];
  series: TitlePreviewData[];
}

export async function searchByTimeboxAction(input: TimeboxSearchInput): Promise<TimeboxResult> {
  const empty: TimeboxResult = { movies: [], series: [] };
  const maxMinutes = Math.round(input.maxMinutes);
  // Spec: empty state below 40 minutes (pure rule, unit-tested).
  if (!isViableBudget(maxMinutes)) return empty;

  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    return empty;
  }

  const limit = Math.max(4, Math.min(48, input.limit ?? 24));
  const centroid = await getProfileTasteCentroid(profileId);
  const [movies, series] = await Promise.all([
    getTitlesByTimebox(maxMinutes, centroid, limit, "movie"),
    getTitlesByTimebox(maxMinutes, centroid, limit, "tv"),
  ]);
  return {
    movies: movies.map(toPreview),
    series: series.map(toPreview),
  };
}

function toPreview(t: Title): TitlePreviewData {
  return {
    id: t.id,
    tmdbId: t.tmdbId,
    title: t.title,
    posterPath: t.posterPath,
    backdropPath: t.backdropPath ?? null,
    releaseYear: t.releaseYear ?? null,
    runtimeMin: t.runtimeMin ?? null,
    voteAverage: t.voteAverage ?? null,
    overview: t.overview ?? null,
    genres: (t.genres as string[] | null) ?? null,
  };
}
