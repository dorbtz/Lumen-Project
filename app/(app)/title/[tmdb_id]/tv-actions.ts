"use server";

/**
 * TV season loader — fetches a season's episodes on demand for the
 * Prime-style SeasonsBrowser (lazy: only the opened season is fetched).
 */

import { tmdb } from "@/lib/tmdb/client";

export interface EpisodeVM {
  episodeNumber: number;
  name: string;
  overview: string;
  stillPath: string | null;
  airDate: string | null;
  runtime: number | null;
  rating: number | null;
}

export async function loadSeasonAction(
  tvTmdbId: number,
  seasonNumber: number,
): Promise<EpisodeVM[]> {
  if (!Number.isFinite(tvTmdbId) || tvTmdbId <= 0) return [];
  try {
    const season = await tmdb.tvSeason(tvTmdbId, seasonNumber);
    return (season.episodes ?? []).map((e) => ({
      episodeNumber: e.episode_number,
      name: e.name,
      overview: e.overview ?? "",
      stillPath: e.still_path,
      airDate: e.air_date ?? null,
      runtime: e.runtime ?? null,
      rating:
        typeof e.vote_average === "number" && e.vote_average > 0
          ? Math.round(e.vote_average * 10) / 10
          : null,
    }));
  } catch {
    return [];
  }
}
