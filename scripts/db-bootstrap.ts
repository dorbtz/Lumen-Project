/**
 * Lumen — one-shot DB bootstrap.
 *
 *   1. Enables pgvector extension (drizzle/0000_init_pgvector.sql)
 *   2. Applies drizzle-managed structural migrations (creates tables)
 *   3. Creates ivfflat indexes (drizzle/0002_ivfflat_indexes.sql)
 *
 * Run with: npm run db:setup
 * Reads DATABASE_URL from .env.local (loaded via tsx --env-file flag).
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Node 23+ built-in env loader — reliable replacement for tsx --env-file
const envPath = join(root, ".env.local");
console.log(`[bootstrap] loading env from: ${envPath}`);
try {
  process.loadEnvFile(envPath);
  console.log(
    `[bootstrap] loadEnvFile OK, DATABASE_URL set? ${process.env.DATABASE_URL ? "yes" : "no"}`,
  );
} catch (err) {
  console.error("[bootstrap] loadEnvFile threw:", err);
}

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL not set. Run `vercel env pull .env.local --environment=preview` first.",
  );
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runSqlFile(label: string, relPath: string) {
  console.log(`\n→ ${label}`);
  const sql = readFileSync(join(root, relPath), "utf8");
  await pool.query(sql);
  console.log(`  ✓ ${label} done`);
}

async function main() {
  await runSqlFile("1/3 pgvector extension", "drizzle/0000_init_pgvector.sql");

  console.log("\n→ 2/3 drizzle-managed migrations (tables)");
  const drizzleBin = process.platform === "win32" ? "drizzle-kit.cmd" : "drizzle-kit";
  const result = spawnSync(drizzleBin, ["migrate"], {
    stdio: "inherit",
    cwd: root,
    env: process.env,
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error(`drizzle-kit migrate exited with code ${result.status}`);
  }
  console.log("  ✓ tables created");

  await runSqlFile("3/3 ivfflat indexes", "drizzle/0002_ivfflat_indexes.sql");

  console.log("\n✓ All migrations applied successfully");
}

main()
  .then(() => pool.end().then(() => process.exit(0)))
  .catch(async (err) => {
    console.error("\n✗ Migration failed:", err);
    await pool.end();
    process.exit(1);
  });
