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
  /** "tv" only for our hosted CC0 series; everything else is a movie. */
  media?: "movie" | "tv";
  /** True for CC0 titles streamable in-app (shows a "Free" affordance). */
  watchable?: boolean;
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

// ---------------------------------------------------------------------------
// Separator-insensitive matching + CC0-series variant de-duplication
// ---------------------------------------------------------------------------

/**
 * Number-word ⇄ digit equivalence. Longest-first so "fourteen" → "14"
 * before "four" → "4". "Fantastic Four" and "Fantastic 4" both fold to
 * "fantastic4".
 */
const NUM_WORDS: readonly [string, string][] = [
  ["nineteen", "19"],
  ["eighteen", "18"],
  ["seventeen", "17"],
  ["sixteen", "16"],
  ["fifteen", "15"],
  ["fourteen", "14"],
  ["thirteen", "13"],
  ["twenty", "20"],
  ["twelve", "12"],
  ["eleven", "11"],
  ["ten", "10"],
  ["nine", "9"],
  ["eight", "8"],
  ["seven", "7"],
  ["six", "6"],
  ["five", "5"],
  ["four", "4"],
  ["three", "3"],
  ["two", "2"],
  ["one", "1"],
];

function numFold(s: string): string {
  let r = s.toLowerCase();
  for (const [w, d] of NUM_WORDS) r = r.split(w).join(d);
  return r;
}

/** Lowercase + number-fold + drop every non-alphanumeric. "Spider-Man"
 *  /"spider man" → "spiderman"; "Fantastic Four"/"Fantastic 4" → "fantastic4". */
function normLoose(s: string): string {
  return numFold(s).replace(/[^a-z0-9]+/g, "");
}

/**
 * SQL: fold number words → digits on a column then strip non-alphanumerics,
 * mirroring normLoose() so DB matching agrees with the JS-normalised query.
 */
function foldedSql(col: ReturnType<typeof sql>): ReturnType<typeof sql> {
  let expr = sql`lower(${col})`;
  for (const [w, d] of NUM_WORDS) expr = sql`replace(${expr}, ${w}, ${d})`;
  return sql`regexp_replace(${expr}, '[^a-z0-9]', '', 'g')`;
}

/** Encoding / quality / format / packaging tokens that don't identify a series. */
const DERIV_RX =
  /\b(?:x264|x265|h\.?264|h\.?265|hevc|xvid|divx|mkv|mp4|avi|webm|ogv|m4v|480p|576p|720p|1080p|1440p|2160p|4k|hd|sd|ai[\s_-]*upscale|upscale[d]?|remaster(?:ed)?|restored|complete(?:\s+series)?|full\s+series|season\s*\d+|s\d{1,2}|disc\s*\d+|cd\s*\d+|vol(?:ume)?\s*\d+)\b/gi;

/** Strip brackets, DERIV tokens and years, then collapse → a stable series id. */
function seriesKey(raw: string): string {
  return normLoose(
    raw
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/\([^)]*\)/g, " ")
      .replace(DERIV_RX, " ")
      .replace(/\b(?:19|20)\d{2}\b/g, " "),
  );
}

/** Human label: drop the "- 1981 - Season 1 - x264 MKV" tail, keep the name. */
function cleanSeriesLabel(raw: string): string {
  const stripped = raw
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(DERIV_RX, " ")
    .replace(/\b(?:19|20)\d{2}\b/g, " ");
  // Split on space-padded dashes so an internal hyphen ("Spider-Man") survives.
  const parts = stripped
    .split(/\s+[–—-]\s+/)
    .map((p) => p.replace(/\s{2,}/g, " ").trim())
    // Keep only segments with real text — drops "", "-" left by removed tokens.
    .filter((p) => /[a-z0-9]/i.test(p));
  const out = parts
    .join(" - ")
    .replace(/[\s_]+$/g, "")
    .trim();
  return out || raw.trim();
}

/** Higher = better encoding; used to pick which duplicate variant to keep. */
function qualityRank(raw: string): number {
  const s = raw.toLowerCase();
  if (/\b(?:2160p|4k|1440p)\b/.test(s)) return 6;
  if (/\b1080p\b/.test(s)) return 5;
  if (/\b(?:x265|h\.?265|hevc)\b/.test(s)) return 4;
  if (/\b720p\b/.test(s)) return 4;
  if (/\b(?:x264|h\.?264)\b/.test(s)) return 3;
  if (/\b(?:xvid|divx)\b/.test(s)) return 2;
  return 1;
}

interface Cc0SeriesRow extends CatalogRow {
  eps: number;
  popularity: number;
}

/**
 * CC0 *series* we host (type='tv' with a ready cc0_videos row). Separator-
 * insensitive title/original-title match ("spider man" == "spider-man" ==
 * "spiderman"), with encoding-variant rows (x264 MKV vs XviD …) collapsed to
 * the best single card and a cleaned display label. Negative synthetic
 * tmdb_ids never collide with TMDB ids. Resilient: degrades to [] if the
 * cc0_* tables aren't present yet.
 */
async function searchCc0SeriesRows(query: string): Promise<CatalogRow[]> {
  const norm = normLoose(query);
  if (norm.length < 2) return [];
  const nlike = `%${norm}%`;
  try {
    const res = await db.execute(sql`
      SELECT t.id, t.tmdb_id AS "tmdbId", t.title,
             t.release_year AS "releaseYear", t.runtime_min AS "runtimeMin",
             t.poster_path AS "posterPath", t.backdrop_path AS "backdropPath",
             t.vote_average AS "voteAverage", t.overview, t.genres,
             t.popularity AS "popularity",
             NULL::int AS "collectionId", NULL::text AS "collectionName",
             (SELECT count(*)::int FROM cc0_episodes e
                WHERE e.title_id = t.id AND e.status = 'ready') AS "eps"
      FROM titles t
      WHERE t.type = 'tv'
        AND t.poster_path IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM cc0_videos v
          WHERE v.title_id = t.id AND v.status = 'ready'
        )
        AND (
          ${foldedSql(sql`t.title`)} LIKE ${nlike}
          OR ${foldedSql(sql`coalesce(t.original_title, '')`)} LIKE ${nlike}
        )
      ORDER BY t.popularity DESC
      LIMIT 60
    `);
    const rows = res.rows as unknown as Cc0SeriesRow[];

    // Collapse encoding/quality/season variants: one card per series, keeping
    // the row with the most episodes, then the best encoding, then popularity.
    const best = new Map<string, Cc0SeriesRow>();
    for (const r of rows) {
      const key = seriesKey(r.title) || `id:${r.tmdbId}`;
      const cur = best.get(key);
      if (
        !cur ||
        r.eps > cur.eps ||
        (r.eps === cur.eps && qualityRank(r.title) > qualityRank(cur.title)) ||
        (r.eps === cur.eps &&
          qualityRank(r.title) === qualityRank(cur.title) &&
          r.popularity > cur.popularity)
      ) {
        best.set(key, r);
      }
    }
    return [...best.values()]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 24)
      .map((r) => ({ ...r, title: cleanSeriesLabel(r.title) }));
  } catch {
    return [];
  }
}

export async function searchAction(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  // CC0 series first (locally hosted, watchable) — these lead the overlay.
  const series = await searchCc0SeriesRows(q);
  const seriesHits: SearchHit[] = series.slice(0, 8).map((r) => ({
    kind: "title",
    tmdbId: r.tmdbId,
    title: r.title,
    posterPath: r.posterPath,
    year: r.releaseYear ?? null,
    overview: r.overview ?? null,
    voteAverage: r.voteAverage != null ? r.voteAverage / 10 : null,
    media: "tv",
    watchable: true,
  }));
  try {
    const page = await tmdb.searchMulti(q, 1);
    const hits: SearchHit[] = [];
    for (const r of page.results) {
      // Skip "ghost" TMDB records with no poster (e.g. "Rakshak Fantastic 4")
      // — they have no real data and lead to empty title pages.
      if (r.media_type === "movie" && r.poster_path) {
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
    return [...seriesHits, ...hits].slice(0, 30);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[search] failed", (err as Error).message);
    // TMDB down — still surface the locally hosted CC0 series.
    return seriesHits;
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
  /** Hosted CC0 TV series (watchable in-app) — kept separate from movies. */
  series: TitlePreviewData[];
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
  if (q.length < 2) return { collections: [], series: [], titles: [], people: [] };
  const like = `%${q}%`;
  // Separator-insensitive title match — additive (only broadens): "spider man"
  // now also matches the stored "Spider-Man". Empty fragment when the query
  // has <2 alphanumerics so we never widen to a bare "%%".
  const norm = normLoose(q);
  const nClause =
    norm.length >= 2
      ? sql`OR ${foldedSql(sql`title`)} LIKE ${`%${norm}%`}
            OR ${foldedSql(sql`coalesce(original_title, '')`)} LIKE ${`%${norm}%`}`
      : sql``;

  // CC0 TV series we host — surfaced as their own section, separate from
  // movies. Marked watchable so the poster card shows the "Free" badge.
  const series: TitlePreviewData[] = (await searchCc0SeriesRows(q)).map((r) => ({
    ...rowToPreview(r),
    watchable: true,
  }));

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
          ${nClause}
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
          ${nClause}
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
      // Skip poster-less "ghost" records (no real data → empty title page).
      if (r.media_type === "movie" && r.poster_path && !seen.has(r.id)) {
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
    series,
    titles: titles.slice(0, 60),
    people: people.slice(0, 12),
  };
}
