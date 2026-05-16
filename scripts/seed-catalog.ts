/**
 * Lumen — initial TMDB catalog seed.
 * SPEC §6.1: pulls top ~20k titles from /movie/popular + /trending/movie/week,
 * extracts 5-color vibrant palette per poster, upserts into `titles`.
 *
 * DO NOT run automatically — requires TMDB_API_KEY + owner confirmation.
 *
 * Usage:
 *   NODE_OPTIONS=--use-system-ca npm run seed:catalog
 *
 * Cost notes:
 *   - TMDB: ~1000 list requests + ~20k detail requests = well within free tier.
 *   - Palette: ~5 sec/100 titles on this machine; budget ~15 min for full run.
 *   - Does NOT compute HF embeddings (separate offline job — Week 1 cost guardrail).
 */

import { sql } from "drizzle-orm";
import { db } from "../lib/db/client";
import { titles } from "../lib/db/schema";
import { extractPalette } from "../lib/design/palette";
import { type TmdbMovie, tmdb } from "../lib/tmdb/client";

const TARGET_COUNT = 20_000;
const PAGES_POPULAR = 500; // TMDB caps at 500 pages × 20 results = 10k
const PAGES_TRENDING = 500;

async function upsertTitle(m: TmdbMovie & { keywords?: { keywords?: { name: string }[] } }) {
  // Fetch full detail once so we get runtime, tagline, imdb_id, keywords
  const full = await tmdb.movie(m.id);
  const posterUrl = tmdb.poster(full.poster_path, "w342");
  const palette = posterUrl ? await extractPalette(posterUrl).catch(() => null) : null;

  const row = {
    tmdbId: full.id,
    type: "movie" as const,
    title: full.title,
    originalTitle: full.original_title,
    releaseYear: full.release_date ? Number(full.release_date.slice(0, 4)) : null,
    runtimeMin: full.runtime ?? null,
    overview: full.overview ?? null,
    tagline: full.tagline ?? null,
    posterPath: full.poster_path,
    backdropPath: full.backdrop_path,
    vibrantPalette: palette,
    imdbId: full.imdb_id ?? null,
    popularity: Math.round(full.popularity ?? 0),
    voteAverage: Math.round((full.vote_average ?? 0) * 10),
    voteCount: full.vote_count ?? 0,
    keywords: full.keywords?.keywords?.map((k) => k.name) ?? [],
    genres: full.genres?.map((g) => g.name) ?? [],
    collectionId: full.belongs_to_collection?.id ?? null,
    collectionName: full.belongs_to_collection?.name ?? null,
    updatedAt: new Date(),
  };

  await db
    .insert(titles)
    .values(row)
    .onConflictDoUpdate({
      target: titles.tmdbId,
      set: {
        title: row.title,
        originalTitle: row.originalTitle,
        releaseYear: row.releaseYear,
        runtimeMin: row.runtimeMin,
        overview: row.overview,
        tagline: row.tagline,
        posterPath: row.posterPath,
        backdropPath: row.backdropPath,
        vibrantPalette: row.vibrantPalette,
        imdbId: row.imdbId,
        popularity: row.popularity,
        voteAverage: row.voteAverage,
        voteCount: row.voteCount,
        keywords: row.keywords,
        genres: row.genres,
        collectionId: row.collectionId,
        collectionName: row.collectionName,
        updatedAt: sql`now()`,
      },
    });
}

async function main() {
  // eslint-disable-next-line no-console
  console.log("[seed] starting TMDB catalog ingest...");
  if (!process.env.TMDB_API_KEY) {
    throw new Error("TMDB_API_KEY required. Get one at https://www.themoviedb.org/settings/api");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL required. Run `vercel env pull .env.local` first.");
  }

  const seen = new Set<number>();
  let ingested = 0;

  // Pass 1 — /movie/popular
  for (let page = 1; page <= PAGES_POPULAR && ingested < TARGET_COUNT; page++) {
    const data = await tmdb.popular(page).catch((e) => {
      // eslint-disable-next-line no-console
      console.warn(`[seed] popular p=${page} failed:`, e.message);
      return null;
    });
    if (!data) break;
    for (const m of data.results) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      try {
        await upsertTitle(m);
        ingested++;
        if (ingested % 25 === 0) {
          // eslint-disable-next-line no-console
          console.log(`[seed] ingested ${ingested} titles...`);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`[seed] upsert failed for tmdb_id=${m.id}:`, (e as Error).message);
      }
    }
    if (data.page >= data.total_pages) break;
  }

  // Pass 2 — /trending/movie/week (deduped against pass 1)
  for (let page = 1; page <= PAGES_TRENDING && ingested < TARGET_COUNT; page++) {
    const data = await tmdb.trending("week", page).catch(() => null);
    if (!data) break;
    for (const m of data.results) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      try {
        await upsertTitle(m);
        ingested++;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`[seed] trending upsert failed for tmdb_id=${m.id}:`, (e as Error).message);
      }
    }
    if (data.page >= data.total_pages) break;
  }

  // eslint-disable-next-line no-console
  console.log(`[seed] done — ${ingested} titles ingested.`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
