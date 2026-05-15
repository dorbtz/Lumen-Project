"use server";

/**
 * Mood Dial — server action.
 * SPEC §3.1 Pillar 1: 2D affect dial → live results.
 *
 * Input: a (valence, arousal) point each in [-1, 1].
 * Output: top-N titles ranked by L2 distance to the (v, a, 0…) query vector.
 */

import type { TitlePreviewData } from "@/components/title/TitlePreviewCard";
import { getTitlesByMood } from "@/lib/db/queries";
import type { Title } from "@/lib/db/schema";

export interface MoodSearchInput {
  valence: number;
  arousal: number;
  limit?: number;
}

export async function searchByMoodAction(input: MoodSearchInput): Promise<TitlePreviewData[]> {
  const limit = Math.max(4, Math.min(48, input.limit ?? 24));
  const titles = await getTitlesByMood(input.valence, input.arousal, limit);
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
