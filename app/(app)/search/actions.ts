"use server";

/**
 * Search server action — TMDB /search/multi backed.
 * Returns a typed, posterised view-model for the client to render.
 */

import { tmdb } from "@/lib/tmdb/client";

export interface SearchTitleHit {
  kind: "title";
  tmdbId: number;
  title: string;
  posterPath: string | null;
  year: number | null;
  overview: string | null;
  voteAverage: number | null; // 0–10 from TMDB, not pre-multiplied
}

export interface SearchPersonHit {
  kind: "person";
  tmdbId: number;
  name: string;
  profilePath: string | null;
  knownForDept: string | null;
  popularity: number | null;
}

export type SearchHit = SearchTitleHit | SearchPersonHit;

export async function searchAction(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const page = await tmdb.searchMulti(q, 1);
    const hits: SearchHit[] = [];
    for (const r of page.results) {
      if (r.media_type === "movie") {
        hits.push({
          kind: "title",
          tmdbId: r.id,
          title: r.title,
          posterPath: r.poster_path,
          year: r.release_date ? Number(r.release_date.slice(0, 4)) : null,
          overview: r.overview ?? null,
          voteAverage: r.vote_average ?? null,
        });
      } else if (r.media_type === "person") {
        hits.push({
          kind: "person",
          tmdbId: r.id,
          name: r.name,
          profilePath: r.profile_path,
          knownForDept: r.known_for_department ?? null,
          popularity: r.popularity ?? null,
        });
      }
      // We skip tv for now — Lumen MVP is movies-only per SPEC.
    }
    // Sort by popularity-ish heuristic: movies with poster ahead, then people.
    hits.sort((a, b) => {
      const ap =
        a.kind === "title"
          ? (a.voteAverage ?? 0) * 5 + (a.year ?? 0) / 200
          : (a.popularity ?? 0) / 50;
      const bp =
        b.kind === "title"
          ? (b.voteAverage ?? 0) * 5 + (b.year ?? 0) / 200
          : (b.popularity ?? 0) / 50;
      return bp - ap;
    });
    return hits.slice(0, 30);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[search] failed", (err as Error).message);
    return [];
  }
}
