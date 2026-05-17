/**
 * Lumen — TMDB ↔ Postgres sync helpers.
 * SPEC §6.1: on-demand title fetch when stale (>7d), background cron weekly refresh.
 *
 * Race-safe: every write uses ON CONFLICT DO NOTHING + fallback re-fetch
 * (Week 1 lesson #10). Suspense + parallel renders can call these concurrently.
 */

import { sql } from "drizzle-orm";
import { db } from "../db/client";
import { type Title, credits, people, titles, trailers } from "../db/schema";
import { extractPalette } from "../design/palette";
import { type TmdbCredits, type TmdbMovie, type TmdbVideo, tmdb } from "./client";

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

function isStale(t: Title): boolean {
  if (!t.updatedAt) return true;
  return Date.now() - new Date(t.updatedAt).getTime() > STALE_MS;
}

/**
 * Return a fully-hydrated title row, fetching from TMDB and upserting if
 * missing or stale. Idempotent.
 */
export async function getOrSyncTitle(tmdbId: number): Promise<Title | null> {
  const rows = await db.execute(sql`
    SELECT id, tmdb_id AS "tmdbId", type, title, original_title AS "originalTitle",
           release_year AS "releaseYear", runtime_min AS "runtimeMin", overview, tagline,
           poster_path AS "posterPath", backdrop_path AS "backdropPath",
           vibrant_palette AS "vibrantPalette", imdb_id AS "imdbId",
           popularity, vote_average AS "voteAverage", vote_count AS "voteCount",
           keywords, genres,
           NULL::vector AS "moodVector", NULL::vector AS "embedding",
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM titles WHERE tmdb_id = ${tmdbId}
    -- (tmdb_id,type) can now hold both a movie and a re-pointed tv row
    -- (0007). This path is the movie context; tv is reached via
    -- ?type=tv which skips it. Deterministically prefer the movie row.
    ORDER BY (type = 'movie') DESC LIMIT 1
  `);
  const existing = (rows.rows as unknown as Title[])[0];

  if (existing && !isStale(existing)) return existing;

  // Slow path: fetch from TMDB + upsert + sync trailers/credits.
  try {
    const full = await tmdb.movie(tmdbId);
    await upsertTitleFromTmdb(full);
    await upsertTrailersFromTmdb(tmdbId, full.videos?.results ?? []);
    if (full.credits) await upsertCreditsFromTmdb(tmdbId, full.credits);

    const refetched = await db.execute(sql`
      SELECT id, tmdb_id AS "tmdbId", type, title, original_title AS "originalTitle",
             release_year AS "releaseYear", runtime_min AS "runtimeMin", overview, tagline,
             poster_path AS "posterPath", backdrop_path AS "backdropPath",
             vibrant_palette AS "vibrantPalette", imdb_id AS "imdbId",
             popularity, vote_average AS "voteAverage", vote_count AS "voteCount",
             keywords, genres,
             NULL::vector AS "moodVector", NULL::vector AS "embedding",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM titles WHERE tmdb_id = ${tmdbId} LIMIT 1
    `);
    return (refetched.rows as unknown as Title[])[0] ?? existing ?? null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[tmdb/sync] getOrSyncTitle(${tmdbId}) failed:`, (err as Error).message);
    return existing ?? null;
  }
}

async function upsertTitleFromTmdb(full: TmdbMovie): Promise<void> {
  const posterUrl = tmdb.poster(full.poster_path, "w342");
  // Palette extraction is best-effort — never fail the request on a poster fetch hiccup.
  const palette = posterUrl ? await extractPalette(posterUrl).catch(() => null) : null;
  await db
    .insert(titles)
    .values({
      tmdbId: full.id,
      type: "movie",
      title: full.title,
      originalTitle: full.original_title ?? null,
      releaseYear: full.release_date ? Number(full.release_date.slice(0, 4)) : null,
      runtimeMin: full.runtime ?? null,
      overview: full.overview ?? null,
      tagline: full.tagline ?? null,
      posterPath: full.poster_path,
      backdropPath: full.backdrop_path,
      vibrantPalette: palette,
      imdbId: full.imdb_id ?? full.external_ids?.imdb_id ?? null,
      popularity: Math.round(full.popularity ?? 0),
      voteAverage: Math.round((full.vote_average ?? 0) * 10),
      voteCount: full.vote_count ?? 0,
      keywords: full.keywords?.keywords?.map((k) => k.name) ?? [],
      genres: full.genres?.map((g) => g.name) ?? [],
      collectionId: full.belongs_to_collection?.id ?? null,
      collectionName: full.belongs_to_collection?.name ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      // Composite to match the (tmdb_id, type) unique index (0007). This
      // upsert only ever writes type='movie', so behaviour is unchanged.
      target: [titles.tmdbId, titles.type],
      set: {
        title: full.title,
        originalTitle: full.original_title ?? null,
        releaseYear: full.release_date ? Number(full.release_date.slice(0, 4)) : null,
        runtimeMin: full.runtime ?? null,
        overview: full.overview ?? null,
        tagline: full.tagline ?? null,
        posterPath: full.poster_path,
        backdropPath: full.backdrop_path,
        vibrantPalette: palette,
        imdbId: full.imdb_id ?? full.external_ids?.imdb_id ?? null,
        popularity: Math.round(full.popularity ?? 0),
        voteAverage: Math.round((full.vote_average ?? 0) * 10),
        voteCount: full.vote_count ?? 0,
        keywords: full.keywords?.keywords?.map((k) => k.name) ?? [],
        genres: full.genres?.map((g) => g.name) ?? [],
        updatedAt: sql`now()`,
      },
    });
}

async function upsertTrailersFromTmdb(tmdbId: number, videos: TmdbVideo[]): Promise<void> {
  if (videos.length === 0) return;
  // Look up the internal title id once.
  const idRow = await db.execute(sql`SELECT id FROM titles WHERE tmdb_id = ${tmdbId} LIMIT 1`);
  const titleId = (idRow.rows[0] as { id?: string } | undefined)?.id;
  if (!titleId) return;

  // Wipe + re-insert is simplest for a small list; trailers refresh weekly.
  await db.execute(sql`DELETE FROM trailers WHERE title_id = ${titleId}`);
  for (const v of videos) {
    if (v.site !== "YouTube") continue;
    const kind: "trailer" | "teaser" | "clip" =
      v.type === "Teaser" ? "teaser" : v.type === "Clip" ? "clip" : "trailer";
    await db
      .insert(trailers)
      .values({
        titleId,
        source: "youtube",
        externalId: v.key,
        kind,
        language: v.iso_639_1 ?? "en",
        official: !!v.official,
      })
      .onConflictDoNothing()
      .catch(() => undefined);
  }
}

async function upsertCreditsFromTmdb(tmdbId: number, c: TmdbCredits): Promise<void> {
  const idRow = await db.execute(sql`SELECT id FROM titles WHERE tmdb_id = ${tmdbId} LIMIT 1`);
  const titleId = (idRow.rows[0] as { id?: string } | undefined)?.id;
  if (!titleId) return;

  // Cast — top 12 only
  const cast = c.cast.slice(0, 12);
  for (const m of cast) {
    const personId = await getOrInsertPersonId({
      tmdbId: m.id,
      name: m.name,
      profilePath: m.profile_path,
      popularity: m.popularity ?? 0,
    });
    await db
      .insert(credits)
      .values({
        titleId,
        personId,
        role: "cast",
        character: m.character ?? null,
        billingOrder: typeof m.order === "number" ? m.order : null,
      })
      .onConflictDoNothing()
      .catch(() => undefined);
  }

  // Crew — only the headline jobs
  const HEADLINE_JOBS = new Set([
    "Director",
    "Screenplay",
    "Writer",
    "Story",
    "Director of Photography",
    "Original Music Composer",
    "Editor",
    "Producer",
  ]);
  for (const m of c.crew) {
    if (!m.job || !HEADLINE_JOBS.has(m.job)) continue;
    const personId = await getOrInsertPersonId({
      tmdbId: m.id,
      name: m.name,
      profilePath: m.profile_path,
      popularity: m.popularity ?? 0,
      knownForDept: m.department ?? null,
    });
    await db
      .insert(credits)
      .values({
        titleId,
        personId,
        role: "crew",
        job: m.job,
      })
      .onConflictDoNothing()
      .catch(() => undefined);
  }
}

async function getOrInsertPersonId(p: {
  tmdbId: number;
  name: string;
  profilePath: string | null;
  popularity: number;
  knownForDept?: string | null;
}): Promise<string> {
  // Try insert first — UNIQUE on tmdb_id makes the duplicate a no-op.
  await db
    .insert(people)
    .values({
      tmdbId: p.tmdbId,
      name: p.name,
      profilePath: p.profilePath,
      popularity: Math.round(p.popularity ?? 0),
      knownForDept: p.knownForDept ?? null,
    })
    .onConflictDoNothing();
  // Re-fetch the row that's guaranteed to exist.
  const row = await db.execute(sql`SELECT id FROM people WHERE tmdb_id = ${p.tmdbId} LIMIT 1`);
  const id = (row.rows[0] as { id?: string } | undefined)?.id;
  if (!id) throw new Error(`[tmdb/sync] failed to upsert person ${p.tmdbId}`);
  return id;
}
