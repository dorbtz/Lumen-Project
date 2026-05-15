"use server";

/**
 * Time-Box Discovery — server action (SPEC_COMPLETION §1 A1, SPEC §3.1 #5).
 *
 * Input: a runtime budget in minutes. Logic: filter
 * `titles.runtime_min <= budget (+8 grace)`, rank by the active profile's
 * taste-centroid cosine (the SAME pgvector path the Mood Dial / taste rows
 * use), tie-break popularity. No LLM — zero new AI call sites.
 *
 * Empty result if budget < 40 min (spec rule — surfaced as an empty state
 * by the page).
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

export async function searchByTimeboxAction(
  input: TimeboxSearchInput,
): Promise<TitlePreviewData[]> {
  const maxMinutes = Math.round(input.maxMinutes);
  // Spec: empty state below 40 minutes (pure rule, unit-tested).
  if (!isViableBudget(maxMinutes)) return [];

  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    return [];
  }

  const limit = Math.max(4, Math.min(48, input.limit ?? 24));
  const centroid = await getProfileTasteCentroid(profileId);
  const titles = await getTitlesByTimebox(maxMinutes, centroid, limit);
  return titles.map(toPreview);
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
