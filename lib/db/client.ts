/**
 * Lumen — Neon serverless Drizzle client.
 * Uses HTTP driver (best for short Vercel function lifetimes — SPEC §7).
 */

import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Re-use fetch caching — Neon HTTP driver is built for serverless
neonConfig.fetchConnectionCache = true;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "[lumen/db] DATABASE_URL is required. Run `NODE_OPTIONS=--use-system-ca vercel env pull .env.local` after Marketplace provisioning.",
  );
}

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
export { schema };
export type Database = typeof db;
