-- Lumen — direct-URL playback source for public-domain titles.
-- Additive & idempotent. The existing Mux rows are untouched (source
-- defaults to 'mux'). Mux columns become nullable so a row can instead
-- carry a direct Archive.org / Wikimedia stream URL. Zero disruption:
-- the current watch path keeps working byte-for-byte.

ALTER TABLE "cc0_videos" ALTER COLUMN "mux_asset_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "cc0_videos" ALTER COLUMN "mux_playback_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "cc0_videos" ADD COLUMN IF NOT EXISTS "source" varchar(16) DEFAULT 'mux';
--> statement-breakpoint
ALTER TABLE "cc0_videos" ADD COLUMN IF NOT EXISTS "stream_url" text;
--> statement-breakpoint
UPDATE "cc0_videos" SET "source" = 'mux' WHERE "source" IS NULL;
