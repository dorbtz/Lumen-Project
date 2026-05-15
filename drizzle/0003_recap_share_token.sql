-- Lumen — Recap share token (SPEC_COMPLETION §1 A2)
-- Adds an unguessable, app-generated (nanoid) public share token to
-- recap_states. Nullable so existing rows and non-shared recaps stay
-- valid; partial-unique index permits many NULLs while guaranteeing
-- uniqueness of issued tokens. Token is rotated on recap rebuild to
-- revoke old public links.

ALTER TABLE "recap_states" ADD COLUMN IF NOT EXISTS "share_token" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "recap_states_share_token_unique"
  ON "recap_states" ("share_token")
  WHERE "share_token" IS NOT NULL;
