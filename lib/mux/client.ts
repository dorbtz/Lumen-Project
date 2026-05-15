/**
 * Lumen — Mux client + CC0 lookups (SPEC_COMPLETION decision D1, SPEC §9).
 *
 * The Mux SDK is only constructed when MUX_TOKEN_ID / MUX_TOKEN_SECRET are
 * present (ingest script + any future signed-URL work). Page rendering never
 * needs the SDK — it reads playback ids straight from the `cc0_videos`
 * table, so the public catalog has zero Mux API calls on the request path.
 */

import { db } from "@/lib/db/client";
import Mux from "@mux/mux-node";
import { sql } from "drizzle-orm";

let _mux: Mux | null = null;

export function getMux(): Mux {
  if (_mux) return _mux;
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) {
    throw new Error("[lumen/mux] MUX_TOKEN_ID / MUX_TOKEN_SECRET are required for Mux operations.");
  }
  _mux = new Mux({ tokenId, tokenSecret });
  return _mux;
}

export function hasMuxCredentials(): boolean {
  return Boolean(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET);
}

export interface Cc0VideoRow {
  titleId: string;
  tmdbId: number;
  title: string;
  muxPlaybackId: string;
  durationSec: number | null;
  status: string | null;
}

/**
 * Look up the CC0 stream for a title by its TMDB id. Returns null for any
 * non-CC0 title (the common case) so the watch route can fall back to the
 * YouTube trailer embed.
 */
export async function getCc0ByTmdbId(tmdbId: number): Promise<Cc0VideoRow | null> {
  const rows = await db.execute(sql`
    SELECT t.id AS "titleId", t.tmdb_id AS "tmdbId", t.title AS "title",
           c.mux_playback_id AS "muxPlaybackId", c.duration_sec AS "durationSec",
           c.status AS "status"
    FROM cc0_videos c
    INNER JOIN titles t ON t.id = c.title_id
    WHERE t.tmdb_id = ${tmdbId}
    LIMIT 1
  `);
  const row = rows.rows[0] as unknown as Cc0VideoRow | undefined;
  if (!row || !row.muxPlaybackId) return null;
  return row;
}
