/**
 * Lumen — CC0 catalog ingest (SPEC_COMPLETION decision D1, SPEC §9 / §17).
 *
 * For each of the 20 public-domain films (lib/mux/cc0-catalog.ts):
 *   1. Ensure the TMDB title row exists (reuses lib/tmdb/sync.getOrSyncTitle).
 *   2. Resolve the largest MP4 on the film's Internet Archive item via the
 *      IA metadata API.
 *   3. Create a Mux asset from that public URL (Mux pulls it once; HLS +
 *      poster frames + scrub thumbnails are produced automatically).
 *   4. Poll the asset until `ready`, then upsert a `cc0_videos` row linking
 *      the Mux playback id to the title.
 *
 * Idempotent: skips a film that already has a ready cc0_videos row.
 *
 * Run:  NODE_OPTIONS=--use-system-ca npm run ingest:cc0
 * Requires MUX_TOKEN_ID / MUX_TOKEN_SECRET + DATABASE_URL + TMDB key in
 * .env.local (loaded below via process.loadEnvFile).
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
process.loadEnvFile(join(root, ".env.local"));

import { db } from "@/lib/db/client";
import { cc0Videos } from "@/lib/db/schema";
import { CC0_CATALOG, type Cc0CatalogEntry } from "@/lib/mux/cc0-catalog";
import { getMux } from "@/lib/mux/client";
import { getOrSyncTitle } from "@/lib/tmdb/sync";
import { eq, sql } from "drizzle-orm";

const POLL_INTERVAL_MS = 8000;
const POLL_MAX_ATTEMPTS = 90; // ~12 min ceiling per asset

interface IaFile {
  name: string;
  format?: string;
  size?: string;
  source?: string;
}

interface IaSearchDoc {
  identifier: string;
  title?: string;
  year?: number;
}

// IA quirk: GET /metadata/<bad-id> returns HTTP 200 with {} (no 404).
// Always check that meta.files is a non-empty array before trusting an id.

const MIN_VIDEO_BYTES = 3 * 1024 * 1024; // 3 MB — skip thumbnails/samples
const MAX_VIDEO_BYTES = 8 * 1024 * 1024 * 1024; // 8 GB — skip unprocessed raw dumps

/** Return true if a file entry looks like a playable video derivative. */
function isVideoFile(f: IaFile): boolean {
  const fmt = (f.format ?? "").toLowerCase();
  const name = f.name.toLowerCase();
  return (
    name.endsWith(".mp4") ||
    name.endsWith(".ia.mp4") ||
    fmt.includes("mpeg4") ||
    fmt.includes("h.264") ||
    fmt.includes("512kb")
  );
}

/** Pick the best video file from a metadata file list.
 *  Prefers the largest file that is within the practical [MIN, MAX] byte range.
 *  Returns null when no usable file exists.
 */
function pickBestVideo(files: IaFile[], identifier: string): string | null {
  const candidates = files
    .filter(isVideoFile)
    .map((f) => ({ name: f.name, size: Number(f.size ?? 0) }))
    .filter((f) => f.size >= MIN_VIDEO_BYTES && f.size <= MAX_VIDEO_BYTES)
    .sort((a, b) => b.size - a.size);

  if (candidates.length === 0) return null;
  const best = candidates[0]!;
  const id = identifier.trim();
  return `https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(best.name)}`;
}

/** Fetch IA metadata for one identifier. Returns the file list (may be empty). */
async function fetchIaMeta(identifier: string): Promise<IaFile[]> {
  const res = await fetch(
    `https://archive.org/metadata/${encodeURIComponent(identifier.trim())}`,
  );
  if (!res.ok) return [];
  const meta = (await res.json()) as { files?: IaFile[] };
  return meta.files ?? [];
}

/**
 * Resolve the best playable MP4 URL for an Internet Archive item.
 *
 * Strategy:
 *   1. Try the hardcoded catalog identifier directly.
 *   2. If it yields no usable video, run an IA advanced-search for the title
 *      and check each candidate identifier in order, preferring one whose
 *      year is within ±1 of the catalog year.
 *
 * NOTE: IA returns HTTP 200 with an empty body `{}` for unknown identifiers —
 * there is no 404.  Always validate that `files` is a non-empty array.
 */
async function resolveArchiveMp4(
  identifier: string,
  title: string,
  year: number,
): Promise<string | null> {
  // --- Pass 1: hardcoded identifier ---
  const files = await fetchIaMeta(identifier);
  const direct = pickBestVideo(files, identifier);
  if (direct) return direct;

  // --- Pass 2: IA title search fallback ---
  const q = encodeURIComponent(`title:(${title}) AND mediatype:movies`);
  const searchUrl =
    `https://archive.org/advancedsearch.php?q=${q}` +
    `&fl[]=identifier&fl[]=year&rows=15&output=json`;

  let docs: IaSearchDoc[] = [];
  try {
    const res = await fetch(searchUrl);
    if (res.ok) {
      const body = (await res.json()) as { response?: { docs?: IaSearchDoc[] } };
      docs = body.response?.docs ?? [];
    }
  } catch {
    // search is best-effort; fall through
  }

  // Sort: candidates whose year is within ±1 of catalog year first.
  docs.sort((a, b) => {
    const da = Math.abs((a.year ?? 9999) - year);
    const db = Math.abs((b.year ?? 9999) - year);
    return da - db;
  });

  for (const doc of docs) {
    if (!doc.identifier || doc.identifier === identifier) continue;
    const candidateFiles = await fetchIaMeta(doc.identifier);
    const url = pickBestVideo(candidateFiles, doc.identifier);
    if (url) return url;
  }

  return null;
}

async function alreadyIngested(titleId: string): Promise<boolean> {
  const rows = await db
    .select({ status: cc0Videos.status })
    .from(cc0Videos)
    .where(eq(cc0Videos.titleId, titleId))
    .limit(1);
  return rows.length > 0 && rows[0]?.status === "ready";
}

async function ingestOne(entry: Cc0CatalogEntry): Promise<void> {
  console.log(`\n→ ${entry.title} (${entry.year}) [tmdb ${entry.tmdbId}]`);

  const title = await getOrSyncTitle(entry.tmdbId);
  if (!title) {
    console.warn(`  ✗ could not resolve TMDB title ${entry.tmdbId} — skipping`);
    return;
  }

  if (await alreadyIngested(title.id)) {
    console.log("  ✓ already ingested (ready) — skip");
    return;
  }

  const input = await resolveArchiveMp4(entry.archiveIdentifier, entry.title, entry.year);
  if (!input) {
    console.warn(`  ✗ no MP4 found on archive.org item "${entry.archiveIdentifier}" — skipping`);
    return;
  }
  console.log(`  · source: ${input}`);

  const mux = getMux();
  const asset = await mux.video.assets.create({
    inputs: [{ url: input }],
    playback_policies: ["public"],
    video_quality: "basic",
  });

  console.log(`  · Mux asset ${asset.id} — polling for ready…`);
  let ready = asset;
  for (let i = 0; i < POLL_MAX_ATTEMPTS && ready.status !== "ready"; i++) {
    if (ready.status === "errored") {
      console.warn(`  ✗ Mux asset errored: ${JSON.stringify(ready.errors)}`);
      return;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    ready = await mux.video.assets.retrieve(asset.id);
  }
  if (ready.status !== "ready") {
    console.warn(`  ✗ asset not ready after ${POLL_MAX_ATTEMPTS} polls — leaving for a re-run`);
    return;
  }

  const playbackId = ready.playback_ids?.[0]?.id;
  if (!playbackId) {
    console.warn("  ✗ asset ready but no playback id — skipping");
    return;
  }

  await db
    .insert(cc0Videos)
    .values({
      titleId: title.id,
      muxAssetId: ready.id,
      muxPlaybackId: playbackId,
      durationSec: ready.duration ? Math.round(ready.duration) : null,
      hlsUrl: `https://stream.mux.com/${playbackId}.m3u8`,
      status: "ready",
    })
    .onConflictDoNothing();

  // If a prior non-ready row existed for this title, reconcile it.
  await db.execute(sql`
    UPDATE cc0_videos
    SET mux_asset_id = ${ready.id},
        mux_playback_id = ${playbackId},
        duration_sec = ${ready.duration ? Math.round(ready.duration) : null},
        hls_url = ${`https://stream.mux.com/${playbackId}.m3u8`},
        status = 'ready'
    WHERE title_id = ${title.id}
  `);

  console.log(`  ✓ ready — playback ${playbackId}`);
}

async function main() {
  if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
    console.error("MUX_TOKEN_ID / MUX_TOKEN_SECRET missing in .env.local — aborting.");
    process.exit(1);
  }
  console.log(`Lumen CC0 ingest — ${CC0_CATALOG.length} films`);
  for (const entry of CC0_CATALOG) {
    try {
      await ingestOne(entry);
    } catch (err) {
      console.error(`  ✗ ${entry.title} failed:`, err instanceof Error ? err.message : err);
    }
  }
  console.log("\n✓ CC0 ingest run complete");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
