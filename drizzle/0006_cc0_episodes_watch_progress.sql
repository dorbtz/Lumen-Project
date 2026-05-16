-- 0006 — CC0 series episodes + per-profile watch progress (additive only).
--
-- Zero disruption: no existing table/column is altered. `cc0_videos`,
-- the movie path, and the Mux path are untouched. Idempotent so it is
-- safe to re-run against live Neon.

CREATE TABLE IF NOT EXISTS "cc0_episodes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title_id" uuid NOT NULL REFERENCES "titles"("id") ON DELETE CASCADE,
  "episode_index" integer NOT NULL,
  "label" text NOT NULL,
  "source" varchar(16) DEFAULT 'archive' NOT NULL,
  "stream_url" text NOT NULL,
  "duration_sec" integer,
  "status" varchar(32) DEFAULT 'ready' NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "cc0_episodes_title_episode_unique"
  ON "cc0_episodes" ("title_id", "episode_index");

CREATE TABLE IF NOT EXISTS "watch_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "profile_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "title_id" uuid NOT NULL REFERENCES "titles"("id") ON DELETE CASCADE,
  "episode_index" integer DEFAULT 0 NOT NULL,
  "position_sec" integer DEFAULT 0 NOT NULL,
  "duration_sec" integer,
  "completed" boolean DEFAULT false NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "watch_progress_profile_title_ep_unique"
  ON "watch_progress" ("profile_id", "title_id", "episode_index");

CREATE INDEX IF NOT EXISTS "watch_progress_profile_idx"
  ON "watch_progress" ("profile_id");
