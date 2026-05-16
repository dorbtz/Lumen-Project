-- Lumen — TMDB franchise collections (plan WS6)
-- Adds belongs_to_collection.{id,name} to titles so search can group a
-- franchise ("marvel" → the whole MCU). Both columns nullable; additive
-- and idempotent so existing rows and live traffic stay valid. Backfilled
-- by scripts/backfill-collections.ts over the top titles by popularity.

ALTER TABLE "titles" ADD COLUMN IF NOT EXISTS "collection_id" integer;
--> statement-breakpoint
ALTER TABLE "titles" ADD COLUMN IF NOT EXISTS "collection_name" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "titles_collection_idx" ON "titles" ("collection_id");
