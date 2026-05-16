/**
 * Lumen — backfill TMDB franchise collections (plan WS6).
 *
 * For the top-N titles by popularity, fetch `belongs_to_collection` from
 * TMDB and store collection_id/collection_name so search can group a
 * franchise ("marvel" → the whole MCU). The seed/sync paths now capture
 * this for new rows; this is the one-time backfill for existing rows.
 *
 * Usage:
 *   NODE_OPTIONS=--use-system-ca npm run backfill:collections -- \
 *     [--limit=N] [--offset=N] [--mode=estimate|run]
 *
 *   --mode=estimate  → print how many rows would be processed, NO TMDB calls
 *   --mode=run       → fetch + update
 *   --limit=N        → cap rows this run (default 5000, ordered by popularity)
 *   --offset=N       → skip the first N (for resuming in windows)
 *
 * TMDB's free API has no cost; we still pace ~12 req/s to be polite.
 * Re-running over the same window is harmless (idempotent UPDATE).
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "@neondatabase/serverless";
import { tmdb } from "../lib/tmdb/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

try {
  process.loadEnvFile(join(root, ".env.local"));
} catch {
  /* fall through */
}

if (!process.env.DATABASE_URL) {
  console.error("[collections] DATABASE_URL not set.");
  process.exit(1);
}
if (!process.env.TMDB_API_KEY && !process.env.TMDB_API_READ_ACCESS_TOKEN) {
  console.error("[collections] TMDB credentials not set.");
  process.exit(1);
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m?.[1]) out[m[1]] = m[2] ?? "";
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const MODE = args.mode ?? "estimate";
const LIMIT = Number(args.limit ?? 5000);
const OFFSET = Number(args.offset ?? 0);
const PACE_MS = 80;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const { rows: countRows } = await pool.query<{ n: string }>(
    "SELECT count(*)::text AS n FROM titles WHERE type = 'movie'",
  );
  const total = Number(countRows[0]?.n ?? 0);
  console.log(
    `[collections] catalog movies: ${total} | window: offset ${OFFSET}, limit ${LIMIT} | mode: ${MODE}`,
  );
  if (MODE !== "run") {
    console.log("[collections] estimate only — pass --mode=run to write.");
    await pool.end();
    return;
  }

  const { rows } = await pool.query<{ id: string; tmdb_id: number; title: string }>(
    `SELECT id, tmdb_id, title FROM titles
     WHERE type = 'movie'
     ORDER BY popularity DESC
     OFFSET $1 LIMIT $2`,
    [OFFSET, LIMIT],
  );

  let updated = 0;
  let withCollection = 0;
  let failed = 0;
  let i = 0;
  for (const r of rows) {
    i += 1;
    try {
      const full = await tmdb.movie(r.tmdb_id);
      const cid = full.belongs_to_collection?.id ?? null;
      const cname = full.belongs_to_collection?.name ?? null;
      await pool.query("UPDATE titles SET collection_id = $1, collection_name = $2 WHERE id = $3", [
        cid,
        cname,
        r.id,
      ]);
      updated += 1;
      if (cid) withCollection += 1;
    } catch (err) {
      failed += 1;
      console.warn(`[collections] ${r.tmdb_id} "${r.title}" failed: ${(err as Error).message}`);
    }
    if (i % 200 === 0) {
      console.log(
        `[collections] ${i}/${rows.length} — updated ${updated}, in a collection ${withCollection}, failed ${failed}`,
      );
    }
    await sleep(PACE_MS);
  }

  console.log(
    `[collections] done. processed ${rows.length}, updated ${updated}, in a collection ${withCollection}, failed ${failed}`,
  );
  await pool.end();
}

void main();
