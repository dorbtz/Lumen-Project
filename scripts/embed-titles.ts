/**
 * Lumen — embeddings batch (Gemini via Vercel AI SDK).
 *
 * For every title row missing `embedding` or `mood_vector`:
 *   - text embedding via Gemini `text-embedding-004` (native 384-d output)
 *     on  `title + overview + keywords + genres`.
 *   - mood vector via Gemini `gemini-2.5-flash` with `generateObject` for
 *     schema-enforced JSON ({ moods: [[64 numbers], ...] }).
 *
 * Usage:
 *   NODE_OPTIONS=--use-system-ca npm run embed:titles -- \
 *     [--mode=estimate|run] [--pass=embed|mood|both] [--limit=N|all]
 *
 *   --mode=estimate  → print row counts and projection, NO Gemini calls
 *   --mode=run       → actually call Gemini
 *   --pass=embed     → only the embedding pass
 *   --pass=mood      → only the mood pass
 *   --pass=both      → both (default)
 *   --limit=N        → cap rows processed this run; --limit=all for everything
 *
 * Free-tier safety:
 *   - Embeddings (text-embedding-004): 150 RPM / 1500 RPD free. Batches of 100.
 *   - Mood (gemini-2.5-flash):         ~10 RPM free. We sleep 6.5s between
 *                                       batches to stay under the limit.
 *   - Honest counters separate succeeded vs failed; circuit breaker aborts
 *     after 3 consecutive batch failures.
 *   - Final DB sanity check confirms writes landed (not just call success).
 *
 * Idempotent: re-runs skip rows that already have the relevant column.
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Pool } from "@neondatabase/serverless";
import { composeTitleText, embedTexts } from "../lib/ai/embeddings.js";
import { type MoodInput, MOOD_VECTOR_DIM, tagMoods } from "../lib/ai/mood.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// --- env load (Node 23+ built-in; tsx --env-file is unreliable, lesson #8)
try {
  process.loadEnvFile(join(root, ".env.local"));
} catch {
  /* fall through to the checks below */
}

if (!process.env.DATABASE_URL) {
  console.error("[embed] DATABASE_URL not set. Did you `vercel env pull .env.local` + paste real values?");
  process.exit(1);
}
if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  console.error(
    "[embed] GOOGLE_GENERATIVE_AI_API_KEY not set. Get a free key at https://aistudio.google.com.",
  );
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
const MODE = args.mode ?? "estimate";
const LIMIT = args.limit ?? 200;
const PASS = args.pass ?? "both";

// Batch sizes tuned for Gemini free tier.
// Embeddings have a TPM (tokens-per-minute) cap on free tier that gemini-
// embedding-001 hits fast with batches of 100; 25 stays under reliably.
// Mood (flash-lite) needs ≥4s/call to keep under 15 RPM.
const EMBED_BATCH = 25;
const EMBED_INTER_BATCH_MS = 4500;
const MOOD_BATCH = 12;
const MOOD_INTER_BATCH_MS = 4500;
const CONSECUTIVE_FAILURE_LIMIT = 5;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

interface TitleRow {
  id: string;
  title: string;
  overview: string | null;
  keywords: string[] | null;
  genres: string[] | null;
}

async function main() {
  // 1. Counts
  const [totalRes, missingEmbRes, missingMoodRes] = await Promise.all([
    pool.query<{ count: string }>("SELECT count(*)::text AS count FROM titles"),
    pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM titles WHERE embedding IS NULL",
    ),
    pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM titles WHERE mood_vector IS NULL",
    ),
  ]);
  const total = Number(totalRes.rows[0]!.count);
  const missingEmb = Number(missingEmbRes.rows[0]!.count);
  const missingMood = Number(missingMoodRes.rows[0]!.count);

  console.log("\n[embed] catalog stats:");
  console.log(`  titles total:           ${total}`);
  console.log(`  missing embedding:      ${missingEmb}`);
  console.log(`  missing mood_vector:    ${missingMood}`);
  console.log(
    `\n[embed] mode = ${MODE}, pass = ${PASS}, limit = ${LIMIT === Number.POSITIVE_INFINITY ? "all" : LIMIT}`,
  );

  const targetEmb = Math.min(missingEmb, LIMIT);
  const targetMood = Math.min(missingMood, LIMIT);
  const embReqs = Math.ceil(targetEmb / EMBED_BATCH);
  const moodReqs = Math.ceil(targetMood / MOOD_BATCH);
  const moodWaitSec = Math.max(0, (moodReqs - 1) * (MOOD_INTER_BATCH_MS / 1000));

  console.log("\n[embed] projected calls:");
  console.log(`  embedding batches:      ${embReqs}  (~${EMBED_BATCH} titles each)`);
  console.log(`  mood LLM batches:       ${moodReqs}  (~${MOOD_BATCH} titles each)`);
  console.log(`  approx wall-clock:      ~${Math.ceil(moodReqs * 2 + moodWaitSec / 60 + embReqs * 0.05)} min`);
  console.log("  approx Gemini cost:     $0 (free tier — 1500 RPD per model)");

  if (MODE === "estimate") {
    console.log(
      "\n[embed] estimate mode — exiting without Gemini calls. Re-run with --mode=run to execute.",
    );
    await pool.end();
    return;
  }

  console.log("\n[embed] starting batch run...");

  let embSucceeded = 0;
  let embFailed = 0;
  let moodSucceeded = 0;
  let moodFailed = 0;

  if (PASS === "embed" || PASS === "both") {
    const r = await runEmbeddingPass(targetEmb);
    embSucceeded = r.succeeded;
    embFailed = r.failed;
  }
  if (PASS === "mood" || PASS === "both") {
    const r = await runMoodPass(targetMood);
    moodSucceeded = r.succeeded;
    moodFailed = r.failed;
  }

  // DB sanity check — source of truth, not in-memory counters.
  const [finalEmbRes, finalMoodRes] = await Promise.all([
    pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM titles WHERE embedding IS NOT NULL",
    ),
    pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM titles WHERE mood_vector IS NOT NULL",
    ),
  ]);
  const finalEmb = Number(finalEmbRes.rows[0]!.count);
  const finalMood = Number(finalMoodRes.rows[0]!.count);

  console.log("\n[embed] honest summary:");
  console.log(`  embedding pass: ${embSucceeded} ok, ${embFailed} failed`);
  console.log(`  mood pass:      ${moodSucceeded} ok, ${moodFailed} failed`);
  console.log("\n[embed] DB sanity check (source of truth):");
  console.log(`  titles WITH embedding:   ${finalEmb} / ${total}`);
  console.log(`  titles WITH mood_vector: ${finalMood} / ${total}`);

  await pool.end();

  if ((PASS === "embed" || PASS === "both") && embSucceeded === 0 && embFailed > 0) {
    console.error("\n[embed] EMBEDDING PASS FAILED ENTIRELY — see errors above.");
    process.exit(2);
  }
  if ((PASS === "mood" || PASS === "both") && moodSucceeded === 0 && moodFailed > 0) {
    console.error("\n[embed] MOOD PASS FAILED ENTIRELY — see errors above.");
    process.exit(2);
  }
}

async function runEmbeddingPass(target: number): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;
  let consecutiveFailures = 0;
  let batchIdx = 0;
  const failedIds = new Set<string>();

  while (succeeded + failed < target) {
    // Rate-limit between embedding batches (free-tier TPM cap).
    if (batchIdx > 0) await sleep(EMBED_INTER_BATCH_MS);
    batchIdx++;

    const remaining = target - (succeeded + failed);
    const batchSize = Math.min(EMBED_BATCH, remaining);
    const rows = await fetchMissing("embedding", batchSize, failedIds);
    if (rows.rowCount === 0) break;

    try {
      const inputs = rows.rows.map((r) => ({
        title: r.title,
        overview: r.overview,
        keywords: r.keywords,
        genres: r.genres,
      }));
      const vecs = await embedTexts(inputs.map(composeTitleText));
      if (vecs.length !== rows.rows.length) {
        throw new Error(`length mismatch: got ${vecs.length} vectors for ${rows.rows.length} rows`);
      }
      let writes = 0;
      for (let i = 0; i < rows.rows.length; i++) {
        const v = vecs[i]!;
        if (v.length !== 384) {
          failedIds.add(rows.rows[i]!.id);
          failed++;
          continue;
        }
        const literal = `[${v.join(",")}]`;
        await pool.query("UPDATE titles SET embedding = $1::vector(384) WHERE id = $2", [
          literal,
          rows.rows[i]!.id,
        ]);
        writes++;
      }
      succeeded += writes;
      consecutiveFailures = 0;
      console.log(`[embed] embedding: ${succeeded}/${target} written (last batch: ${writes})`);
    } catch (err) {
      consecutiveFailures++;
      const msg = (err as Error).message;
      console.warn(`[embed] embedding batch failed: ${msg.slice(0, 250)}`);
      for (const r of rows.rows) failedIds.add(r.id);
      failed += rows.rows.length;
      if (consecutiveFailures >= CONSECUTIVE_FAILURE_LIMIT) {
        console.error(
          `[embed] ${CONSECUTIVE_FAILURE_LIMIT} consecutive embedding failures — aborting pass`,
        );
        break;
      }
      await sleep(2000);
    }
  }
  return { succeeded, failed };
}

async function runMoodPass(target: number): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;
  let consecutiveFailures = 0;
  let batchIdx = 0;
  const failedIds = new Set<string>();

  while (succeeded + failed < target) {
    // Free-tier rate limit: keep mood calls under 10 RPM.
    if (batchIdx > 0) await sleep(MOOD_INTER_BATCH_MS);
    batchIdx++;

    const remaining = target - (succeeded + failed);
    const batchSize = Math.min(MOOD_BATCH, remaining);
    const rows = await fetchMissing("mood_vector", batchSize, failedIds);
    if (rows.rowCount === 0) break;

    try {
      const inputs: MoodInput[] = rows.rows.map((r) => ({
        title: r.title,
        overview: r.overview,
      }));
      const moods = await tagMoods(inputs);
      if (moods.length !== rows.rows.length) {
        throw new Error(`length mismatch: got ${moods.length} moods for ${rows.rows.length} rows`);
      }
      let writes = 0;
      for (let i = 0; i < rows.rows.length; i++) {
        const m = moods[i]!;
        if (m.length !== MOOD_VECTOR_DIM) {
          failedIds.add(rows.rows[i]!.id);
          failed++;
          continue;
        }
        const literal = `[${m.join(",")}]`;
        await pool.query("UPDATE titles SET mood_vector = $1::vector(64) WHERE id = $2", [
          literal,
          rows.rows[i]!.id,
        ]);
        writes++;
      }
      succeeded += writes;
      consecutiveFailures = 0;
      console.log(`[embed] mood: ${succeeded}/${target} written (last batch: ${writes})`);
    } catch (err) {
      consecutiveFailures++;
      const msg = (err as Error).message;
      console.warn(`[embed] mood batch failed: ${msg.slice(0, 250)}`);
      for (const r of rows.rows) failedIds.add(r.id);
      failed += rows.rows.length;
      if (consecutiveFailures >= CONSECUTIVE_FAILURE_LIMIT) {
        console.error(
          `[embed] ${CONSECUTIVE_FAILURE_LIMIT} consecutive mood failures — aborting pass`,
        );
        break;
      }
      await sleep(4000);
    }
  }
  return { succeeded, failed };
}

async function fetchMissing(
  column: "embedding" | "mood_vector",
  batchSize: number,
  failedIds: Set<string>,
) {
  const failedList = Array.from(failedIds);
  return failedList.length === 0
    ? pool.query<TitleRow>(
        `SELECT id, title, overview, keywords, genres
         FROM titles
         WHERE ${column} IS NULL
         ORDER BY popularity DESC
         LIMIT $1`,
        [batchSize],
      )
    : pool.query<TitleRow>(
        `SELECT id, title, overview, keywords, genres
         FROM titles
         WHERE ${column} IS NULL AND id != ALL($2::uuid[])
         ORDER BY popularity DESC
         LIMIT $1`,
        [batchSize, failedList],
      );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv: string[]): {
  mode?: "estimate" | "run";
  limit?: number;
  pass?: "embed" | "mood" | "both";
} {
  const out: { mode?: "estimate" | "run"; limit?: number; pass?: "embed" | "mood" | "both" } = {};
  for (const a of argv) {
    if (a.startsWith("--mode=")) {
      const v = a.slice("--mode=".length);
      if (v === "estimate" || v === "run") out.mode = v;
    } else if (a.startsWith("--limit=")) {
      const v = a.slice("--limit=".length);
      out.limit = v === "all" ? Number.POSITIVE_INFINITY : Math.max(1, Number(v));
    } else if (a.startsWith("--pass=")) {
      const v = a.slice("--pass=".length);
      if (v === "embed" || v === "mood" || v === "both") out.pass = v;
    }
  }
  return out;
}

main().catch(async (err) => {
  console.error("\n[embed] fatal:", err);
  await pool.end();
  process.exit(1);
});
