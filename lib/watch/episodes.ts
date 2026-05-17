/**
 * CC0 series episodes + per-profile watch progress.
 *
 * Every query is wrapped so that on an environment where migration 0006
 * has not yet been applied it degrades to "no episodes / no progress"
 * instead of 500-ing — same zero-disruption rollout pattern as
 * getCc0ByTmdbId (migration 0005).
 */

import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import { parseSeasonEp } from "./episode-format";

// Re-export so existing server-side importers keep working; client
// components must import from "./episode-format" directly (no db).
export { cleanEpisodeName } from "./episode-format";

export interface Cc0EpisodeVM {
  episodeIndex: number;
  label: string;
  streamUrl: string;
  durationSec: number | null;
  /** Parsed from a "NNxNN" token in the label (null for flat collections). */
  season: number | null;
  episodeInSeason: number | null;
  /** TMDB episode still — filled in by the title page for re-pointed series. */
  stillPath: string | null;
}


export interface EpisodeProgress {
  positionSec: number;
  durationSec: number | null;
  completed: boolean;
}

/** Episodes for a CC0 series, by the title's TMDB id (incl. synthetic ids). */
export async function getCc0Episodes(tmdbId: number): Promise<Cc0EpisodeVM[]> {
  try {
    const rows = await db.execute(sql`
      SELECT e.episode_index AS "episodeIndex", e.label AS "label",
             e.stream_url AS "streamUrl", e.duration_sec AS "durationSec"
      FROM cc0_episodes e
      INNER JOIN titles t ON t.id = e.title_id
      WHERE t.tmdb_id = ${tmdbId} AND e.status = 'ready'
      ORDER BY e.episode_index ASC
    `);
    return (
      rows.rows as unknown as Array<{
        episodeIndex: number;
        label: string;
        streamUrl: string;
        durationSec: number | null;
      }>
    ).map((r) => {
      const { season, ep } = parseSeasonEp(r.label);
      return {
        ...r,
        season,
        episodeInSeason: ep,
        stillPath: null,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Progress map for one title keyed by episode_index (0 = single movie).
 * Empty map if there's no profile, no rows, or the table is absent.
 */
export async function getWatchProgressForTitle(
  profileId: string | null | undefined,
  tmdbId: number,
): Promise<Record<number, EpisodeProgress>> {
  if (!profileId) return {};
  try {
    const rows = await db.execute(sql`
      SELECT w.episode_index AS "episodeIndex", w.position_sec AS "positionSec",
             w.duration_sec AS "durationSec", w.completed AS "completed"
      FROM watch_progress w
      INNER JOIN titles t ON t.id = w.title_id
      WHERE w.profile_id = ${profileId}::uuid AND t.tmdb_id = ${tmdbId}
    `);
    const map: Record<number, EpisodeProgress> = {};
    for (const r of rows.rows as unknown as Array<EpisodeProgress & { episodeIndex: number }>) {
      map[r.episodeIndex] = {
        positionSec: r.positionSec ?? 0,
        durationSec: r.durationSec ?? null,
        completed: Boolean(r.completed),
      };
    }
    return map;
  } catch {
    return {};
  }
}

/** Upsert resume position / completion for (profile, title, episode). */
export async function recordWatchProgress(args: {
  profileId: string;
  tmdbId: number;
  episodeIndex: number;
  positionSec: number;
  durationSec: number | null;
  completed: boolean;
}): Promise<void> {
  const { profileId, tmdbId, episodeIndex, positionSec, durationSec, completed } = args;
  try {
    await db.execute(sql`
      INSERT INTO watch_progress
        (profile_id, title_id, episode_index, position_sec, duration_sec, completed, updated_at)
      SELECT ${profileId}::uuid, t.id, ${episodeIndex}, ${Math.max(0, Math.round(positionSec))},
             ${durationSec == null ? null : Math.round(durationSec)}, ${completed}, now()
      FROM titles t
      WHERE t.tmdb_id = ${tmdbId}
      ON CONFLICT (profile_id, title_id, episode_index) DO UPDATE SET
        position_sec = EXCLUDED.position_sec,
        duration_sec = COALESCE(EXCLUDED.duration_sec, watch_progress.duration_sec),
        completed = watch_progress.completed OR EXCLUDED.completed,
        updated_at = now()
    `);
  } catch {
    // Pre-0006 environment — silently no-op (feature simply inactive).
  }
}
