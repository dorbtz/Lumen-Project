"use server";

/**
 * Search server actions.
 *
 *  - `searchAction`     : fast TMDB /search/multi list (the Cmd+K overlay).
 *  - `searchCatalog`    : the dedicated /search page — searches the LOCAL
 *    catalog by title / keywords / genres / franchise, expands shared TMDB
 *    collections so "marvel" surfaces the franchise, and tops up with TMDB
 *    for anything not yet in our DB. Returns poster-card view-models.
 */

import type { TitlePreviewData } from "@/components/title/TitlePreviewCard";
import { db } from "@/lib/db/client";
import { tmdb } from "@/lib/tmdb/client";
import { sql } from "drizzle-orm";

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

// ---------------------------------------------------------------------------
// Dedicated /search page — local-catalog + franchise-aware (plan WS6)
// ---------------------------------------------------------------------------

export interface SearchCollectionGroup {
  collectionId: number;
  collectionName: string;
  items: TitlePreviewData[];
}

export interface SearchCatalogResult {
  collections: SearchCollectionGroup[];
  titles: TitlePreviewData[];
  people: SearchPersonHit[];
}

const TITLE_COLS = sql`id, tmdb_id AS "tmdbId", title,
  release_year AS "releaseYear", runtime_min AS "runtimeMin",
  poster_path AS "posterPath", backdrop_path AS "backdropPath",
  vote_average AS "voteAverage", overview, genres,
  collection_id AS "collectionId", collection_name AS "collectionName"`;

interface CatalogRow {
  id: string;
  tmdbId: number;
  title: string;
  releaseYear: number | null;
  runtimeMin: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number | null;
  overview: string | null;
  genres: string[] | null;
  collectionId: number | null;
  collectionName: string | null;
}

function rowToPreview(r: CatalogRow): TitlePreviewData {
  return {
    id: r.id,
    tmdbId: r.tmdbId,
    title: r.title,
    posterPath: r.posterPath,
    backdropPath: r.backdropPath ?? null,
    releaseYear: r.releaseYear ?? null,
    runtimeMin: r.runtimeMin ?? null,
    voteAverage: r.voteAverage ?? null,
    overview: r.overview ?? null,
    genres: r.genres ?? null,
  };
}

export async function searchCatalog(query: string): Promise<SearchCatalogResult> {
  const q = query.trim();
  if (q.length < 2) return { collections: [], titles: [], people: [] };
  const like = `%${q}%`;

  // 1. Local catalog: title / original title / franchise name / keyword /
  //    genre match over the FULL catalog (not embedding-gated). The
  //    collection_* columns are added by migration 0004; until that runs
  //    on a given environment we degrade gracefully to a non-franchise
  //    search so /search never 500s mid-rollout.
  let local: CatalogRow[];
  let collectionsAvailable = true;
  try {
    const localRes = await db.execute(sql`
      SELECT ${TITLE_COLS}
      FROM titles
      WHERE type = 'movie'
        AND poster_path IS NOT NULL
        AND (
          title ILIKE ${like}
          OR original_title ILIKE ${like}
          OR collection_name ILIKE ${like}
          OR EXISTS (SELECT 1 FROM unnest(keywords) k WHERE k ILIKE ${like})
          OR EXISTS (SELECT 1 FROM unnest(genres) g WHERE g ILIKE ${like})
        )
      ORDER BY popularity DESC
      LIMIT 60
    `);
    local = localRes.rows as unknown as CatalogRow[];
  } catch {
    collectionsAvailable = false;
    const localRes = await db.execute(sql`
      SELECT id, tmdb_id AS "tmdbId", title,
             release_year AS "releaseYear", runtime_min AS "runtimeMin",
             poster_path AS "posterPath", backdrop_path AS "backdropPath",
             vote_average AS "voteAverage", overview, genres,
             NULL::int AS "collectionId", NULL::text AS "collectionName"
      FROM titles
      WHERE type = 'movie'
        AND poster_path IS NOT NULL
        AND (
          title ILIKE ${like}
          OR original_title ILIKE ${like}
          OR EXISTS (SELECT 1 FROM unnest(keywords) k WHERE k ILIKE ${like})
          OR EXISTS (SELECT 1 FROM unnest(genres) g WHERE g ILIKE ${like})
        )
      ORDER BY popularity DESC
      LIMIT 60
    `);
    local = localRes.rows as unknown as CatalogRow[];
  }

  // 2. Expand the strongest shared franchises to the full collection so a
  //    franchise search returns the whole series, in release order.
  const colCounts = new Map<number, { name: string; n: number }>();
  for (const r of local) {
    if (r.collectionId == null) continue;
    const cur = colCounts.get(r.collectionId);
    if (cur) cur.n += 1;
    else colCounts.set(r.collectionId, { name: r.collectionName ?? "Collection", n: 1 });
  }
  const topCollections = [...colCounts.entries()]
    .filter(([, v]) => v.n >= 2)
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 3)
    .map(([id]) => id);

  const collections: SearchCollectionGroup[] = [];
  const groupedTmdbIds = new Set<number>();
  if (collectionsAvailable && topCollections.length > 0) {
    const colRes = await db.execute(sql`
      SELECT ${TITLE_COLS}
      FROM titles
      WHERE poster_path IS NOT NULL
        AND collection_id IN (${sql.join(
          topCollections.map((id) => sql`${id}`),
          sql`, `,
        )})
      ORDER BY collection_id, release_year NULLS LAST
    `);
    const byCol = new Map<number, CatalogRow[]>();
    for (const r of colRes.rows as unknown as CatalogRow[]) {
      if (r.collectionId == null) continue;
      const arr = byCol.get(r.collectionId) ?? [];
      arr.push(r);
      byCol.set(r.collectionId, arr);
      groupedTmdbIds.add(r.tmdbId);
    }
    for (const cid of topCollections) {
      const items = byCol.get(cid);
      if (items && items.length > 0) {
        collections.push({
          collectionId: cid,
          collectionName: items[0]?.collectionName ?? "Collection",
          items: items.map(rowToPreview),
        });
      }
    }
  }

  // 3. Loose titles = local matches not already shown inside a franchise group.
  const seen = new Set<number>(groupedTmdbIds);
  const titles: TitlePreviewData[] = [];
  for (const r of local) {
    if (seen.has(r.tmdbId)) continue;
    seen.add(r.tmdbId);
    titles.push(rowToPreview(r));
  }

  // 4. Top up from TMDB for catalog misses + people (best-effort).
  const people: SearchPersonHit[] = [];
  try {
    const page = await tmdb.searchMulti(q, 1);
    for (const r of page.results) {
      if (r.media_type === "movie" && !seen.has(r.id)) {
        seen.add(r.id);
        titles.push({
          tmdbId: r.id,
          title: r.title,
          posterPath: r.poster_path,
          backdropPath: r.backdrop_path ?? null,
          releaseYear: r.release_date ? Number(r.release_date.slice(0, 4)) : null,
          voteAverage: r.vote_average ? Math.round(r.vote_average * 10) : null,
          overview: r.overview ?? null,
          genres: null,
        });
      } else if (r.media_type === "person") {
        people.push({
          kind: "person",
          tmdbId: r.id,
          name: r.name,
          profilePath: r.profile_path,
          knownForDept: r.known_for_department ?? null,
          popularity: r.popularity ?? null,
        });
      }
    }
  } catch (err) {
    console.warn("[searchCatalog] TMDB top-up failed", (err as Error).message);
  }

  return {
    collections,
    titles: titles.slice(0, 60),
    people: people.slice(0, 12),
  };
}
