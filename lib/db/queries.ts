/**
 * Lumen — common read queries used by Server Components.
 * Centralised so route files stay declarative and we keep the schema usage in one place.
 *
 * Performance note (SPEC §7.2): these run on every page render. They're cheap
 * (indexed lookups + small limits) and we let `unstable_cache` layer below
 * memoise per-request when needed. Cache Components is OFF — see Week 1 lesson #1.
 */

import { moodQueryLiteral } from "@/lib/discover/mood-vector";
import { runtimeCap, runtimeFloor } from "@/lib/discover/timebox-rule";
import { and, desc, eq, ilike, isNotNull, or, sql } from "drizzle-orm";
import { db } from "./client";
import { type Title, profiles, titles } from "./schema";

/** Most popular titles overall — fallback row when no taste centroid exists. */
export async function getPopularTitles(limit = 20): Promise<Title[]> {
  return db
    .select()
    .from(titles)
    .where(and(isNotNull(titles.posterPath), eq(titles.type, "movie")))
    .orderBy(desc(titles.popularity))
    .limit(limit);
}

/** Trending row — same source for now (real "trending" is TMDB-fetched server-side at home). */
export async function getTrendingTitles(limit = 20): Promise<Title[]> {
  return db
    .select()
    .from(titles)
    .where(and(isNotNull(titles.posterPath), eq(titles.type, "movie")))
    .orderBy(desc(titles.voteAverage), desc(titles.popularity))
    .limit(limit);
}

/** One random "Tonight" pick from the top-N most popular. */
export async function getTonightPick(): Promise<Title | null> {
  const pool = await db
    .select()
    .from(titles)
    .where(
      and(isNotNull(titles.posterPath), isNotNull(titles.backdropPath), eq(titles.type, "movie")),
    )
    .orderBy(desc(titles.popularity))
    .limit(100);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

/** Hero billboard candidates — top titles WITH a backdrop image. */
export async function getHeroCandidates(limit = 6): Promise<Title[]> {
  return db
    .select()
    .from(titles)
    .where(
      and(isNotNull(titles.backdropPath), isNotNull(titles.posterPath), eq(titles.type, "movie")),
    )
    .orderBy(desc(titles.popularity))
    .limit(limit);
}

/** Lookup a single title by TMDB id. Caller decides whether to fetch from TMDB on miss. */
export async function getTitleByTmdbId(tmdbId: number): Promise<Title | null> {
  const rows = await db.select().from(titles).where(eq(titles.tmdbId, tmdbId)).limit(1);
  return rows[0] ?? null;
}

/** Get title row by Lumen UUID (internal). */
export async function getTitleById(id: string): Promise<Title | null> {
  const rows = await db.select().from(titles).where(eq(titles.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * pgvector cosine search: titles closest to `centroid` (a 384d embedding).
 * Falls back to popularity if the centroid is null.
 *
 * NB: drizzle-orm doesn't yet expose `<=>` cosine operator natively; we use
 * raw SQL. Centroid is JSON-encoded as `[a,b,c,...]` per pgvector text format.
 */
/**
 * Mood Dial query — find titles whose mood_vector is closest to a 2D
 * (valence, arousal) point chosen by the user.
 *
 * We build a 64-d L2 query vector of the form [valence, arousal, 0, 0, …, 0]
 * and use pgvector's `<->` distance. The 62 theme dimensions of each title's
 * stored mood_vector contribute to the distance but, in practice, this works
 * well as a "pure mood" search: heavily-themed films sit further from the
 * neutral [v, a, 0, …, 0] query, which gives the dial a calm "primary mood"
 * feel without surfacing intensely niche themed films when the user just
 * wants "joyful + calm".
 */
export async function getTitlesByMood(
  valence: number,
  arousal: number,
  limit = 24,
): Promise<Title[]> {
  const queryLiteral = moodQueryLiteral(valence, arousal);
  const rows = await db.execute(sql`
    SELECT id, tmdb_id AS "tmdbId", type, title, original_title AS "originalTitle",
           release_year AS "releaseYear", runtime_min AS "runtimeMin", overview, tagline,
           poster_path AS "posterPath", backdrop_path AS "backdropPath",
           vibrant_palette AS "vibrantPalette", imdb_id AS "imdbId",
           popularity, vote_average AS "voteAverage", vote_count AS "voteCount",
           keywords, genres,
           NULL::vector AS "moodVector", NULL::vector AS "embedding",
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM titles
    WHERE mood_vector IS NOT NULL
      AND poster_path IS NOT NULL
    ORDER BY mood_vector <-> ${queryLiteral}::vector(64)
    LIMIT ${limit}
  `);
  return rows.rows as unknown as Title[];
}

export async function getTitlesByTasteCentroid(
  centroid: number[] | null,
  limit = 20,
  excludeIds: string[] = [],
): Promise<Title[]> {
  if (!centroid || centroid.length !== 384) {
    return getPopularTitles(limit);
  }
  const centroidLiteral = `[${centroid.join(",")}]`;
  const excludeClause =
    excludeIds.length > 0
      ? sql`AND id NOT IN (${sql.join(
          excludeIds.map((id) => sql`${id}`),
          sql`, `,
        )})`
      : sql``;
  const rows = await db.execute(sql`
    SELECT id, tmdb_id AS "tmdbId", type, title, original_title AS "originalTitle",
           release_year AS "releaseYear", runtime_min AS "runtimeMin", overview, tagline,
           poster_path AS "posterPath", backdrop_path AS "backdropPath",
           vibrant_palette AS "vibrantPalette", imdb_id AS "imdbId",
           popularity, vote_average AS "voteAverage", vote_count AS "voteCount",
           keywords, genres,
           NULL::vector AS "moodVector", NULL::vector AS "embedding",
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM titles
    WHERE embedding IS NOT NULL
      AND poster_path IS NOT NULL
      ${excludeClause}
    ORDER BY embedding <=> ${centroidLiteral}::vector
    LIMIT ${limit}
  `);
  return rows.rows as unknown as Title[];
}

/**
 * Time-Box Discovery (SPEC_COMPLETION §1 A1) — titles whose runtime fits a
 * budget, ranked by taste-centroid cosine, tie-broken by popularity.
 *
 * Pure pgvector + SQL — ZERO new LLM call sites (reuses the same embedding
 * path the Mood Dial / taste rows already use). Grace of +8 min per spec.
 * If the centroid is absent we degrade to popularity within the runtime cap.
 */
const TIMEBOX_COLS = sql`id, tmdb_id AS "tmdbId", type, title, original_title AS "originalTitle",
  release_year AS "releaseYear", runtime_min AS "runtimeMin", overview, tagline,
  poster_path AS "posterPath", backdrop_path AS "backdropPath",
  vibrant_palette AS "vibrantPalette", imdb_id AS "imdbId",
  popularity, vote_average AS "voteAverage", vote_count AS "voteCount",
  keywords, genres,
  NULL::vector AS "moodVector", NULL::vector AS "embedding",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export async function getTitlesByTimebox(
  maxMinutes: number,
  centroid: number[] | null,
  limit = 24,
): Promise<Title[]> {
  const cap = runtimeCap(maxMinutes); // +8 grace (pure rule)
  const floor = runtimeFloor(maxMinutes); // band lower edge (pure rule)
  const hasCentroid = !!centroid && centroid.length === 384;
  const centroidLiteral = hasCentroid ? `[${centroid?.join(",")}]` : null;

  // Band the runtime so the budget acts like a *target length*, not just a
  // ceiling — otherwise short popular films top every preset. `min` is 0 for
  // the relaxation pass so we never show an empty/sparse grid on edge budgets
  // or a thin catalog.
  const run = async (min: number): Promise<Title[]> => {
    const order =
      hasCentroid && centroidLiteral
        ? sql`ORDER BY embedding <=> ${centroidLiteral}::vector, popularity DESC`
        : sql`ORDER BY popularity DESC`;
    const embeddingFilter =
      hasCentroid && centroidLiteral ? sql`AND embedding IS NOT NULL` : sql``;
    const rows = await db.execute(sql`
      SELECT ${TIMEBOX_COLS}
      FROM titles
      WHERE poster_path IS NOT NULL
        AND runtime_min IS NOT NULL
        AND runtime_min >= ${min}
        AND runtime_min <= ${cap}
        ${embeddingFilter}
      ${order}
      LIMIT ${limit}
    `);
    return rows.rows as unknown as Title[];
  };

  const banded = await run(floor);
  // Keep the band if it returns a usefully full grid; otherwise relax the
  // floor so a sparse band degrades gracefully to the old ceiling behavior.
  const minUseful = Math.min(limit, 8);
  if (banded.length >= minUseful) return banded;
  return run(0);
}

/** Similar titles to a given title via pgvector. Falls back to popularity if no embedding. */
export async function getSimilarTitlesByEmbedding(titleId: string, limit = 12): Promise<Title[]> {
  const rows = await db.execute(sql`
    WITH src AS (
      SELECT embedding FROM titles WHERE id = ${titleId}
    )
    SELECT t.id, t.tmdb_id AS "tmdbId", t.type, t.title, t.original_title AS "originalTitle",
           t.release_year AS "releaseYear", t.runtime_min AS "runtimeMin", t.overview, t.tagline,
           t.poster_path AS "posterPath", t.backdrop_path AS "backdropPath",
           t.vibrant_palette AS "vibrantPalette", t.imdb_id AS "imdbId",
           t.popularity, t.vote_average AS "voteAverage", t.vote_count AS "voteCount",
           t.keywords, t.genres,
           NULL::vector AS "moodVector", NULL::vector AS "embedding",
           t.created_at AS "createdAt", t.updated_at AS "updatedAt"
    FROM titles t, src
    WHERE t.id <> ${titleId}
      AND t.poster_path IS NOT NULL
      AND src.embedding IS NOT NULL
      AND t.embedding IS NOT NULL
    ORDER BY t.embedding <=> src.embedding
    LIMIT ${limit}
  `);
  return rows.rows as unknown as Title[];
}

/** Fallback "similar" using shared genres + popularity when embeddings aren't ready. */
export async function getSimilarTitlesByGenre(titleId: string, limit = 12): Promise<Title[]> {
  const rows = await db.execute(sql`
    WITH src AS (SELECT genres FROM titles WHERE id = ${titleId})
    SELECT t.id, t.tmdb_id AS "tmdbId", t.type, t.title, t.original_title AS "originalTitle",
           t.release_year AS "releaseYear", t.runtime_min AS "runtimeMin", t.overview, t.tagline,
           t.poster_path AS "posterPath", t.backdrop_path AS "backdropPath",
           t.vibrant_palette AS "vibrantPalette", t.imdb_id AS "imdbId",
           t.popularity, t.vote_average AS "voteAverage", t.vote_count AS "voteCount",
           t.keywords, t.genres,
           NULL::vector AS "moodVector", NULL::vector AS "embedding",
           t.created_at AS "createdAt", t.updated_at AS "updatedAt"
    FROM titles t, src
    WHERE t.id <> ${titleId}
      AND t.poster_path IS NOT NULL
      AND src.genres && t.genres
    ORDER BY t.popularity DESC
    LIMIT ${limit}
  `);
  return rows.rows as unknown as Title[];
}

/** Get profile by id (used to read taste_centroid). */
export async function getProfileById(profileId: string) {
  return db.query.profiles.findFirst({ where: eq(profiles.id, profileId) });
}

/**
 * Read the taste_centroid for a profile. Returns null if absent.
 * pgvector returns a string like "[0.1, 0.2, ...]" — we parse to number[].
 */
export async function getProfileTasteCentroid(profileId: string): Promise<number[] | null> {
  const rows = await db.execute(sql`
    SELECT taste_centroid::text AS centroid
    FROM profiles
    WHERE id = ${profileId}
    LIMIT 1
  `);
  const raw = rows.rows[0]?.centroid as string | null | undefined;
  if (!raw) return null;
  return parseVectorLiteral(raw);
}

/** Parse pgvector text format "[a,b,c]" → number[]. */
export function parseVectorLiteral(text: string): number[] {
  return text
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((n) => Number(n.trim()));
}

/**
 * Fetch a batch of titles by their TMDB ids — used by onboarding to load
 * the 10 seed films. Skips rows missing a poster.
 */
export async function getTitlesByTmdbIds(tmdbIds: number[]): Promise<Title[]> {
  if (tmdbIds.length === 0) return [];
  const rows = await db.execute(sql`
    SELECT id, tmdb_id AS "tmdbId", type, title, original_title AS "originalTitle",
           release_year AS "releaseYear", runtime_min AS "runtimeMin", overview, tagline,
           poster_path AS "posterPath", backdrop_path AS "backdropPath",
           vibrant_palette AS "vibrantPalette", imdb_id AS "imdbId",
           popularity, vote_average AS "voteAverage", vote_count AS "voteCount",
           keywords, genres,
           NULL::vector AS "moodVector", NULL::vector AS "embedding",
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM titles
    WHERE tmdb_id IN (${sql.join(
      tmdbIds.map((id) => sql`${id}`),
      sql`, `,
    )})
  `);
  return rows.rows as unknown as Title[];
}

/** Lookup an embedding for one title (used when building a centroid). */
export async function getTitleEmbedding(titleId: string): Promise<number[] | null> {
  const rows = await db.execute(sql`
    SELECT embedding::text AS embedding FROM titles WHERE id = ${titleId} LIMIT 1
  `);
  const raw = rows.rows[0]?.embedding as string | null | undefined;
  if (!raw) return null;
  return parseVectorLiteral(raw);
}

/** Database title search (poster-required) — used as offline fallback / autocomplete. */
export async function dbSearchTitles(query: string, limit = 20): Promise<Title[]> {
  if (!query.trim()) return [];
  return db
    .select()
    .from(titles)
    .where(
      and(
        isNotNull(titles.posterPath),
        or(ilike(titles.title, `%${query}%`), ilike(titles.originalTitle, `%${query}%`)),
      ),
    )
    .orderBy(desc(titles.popularity))
    .limit(limit);
}
