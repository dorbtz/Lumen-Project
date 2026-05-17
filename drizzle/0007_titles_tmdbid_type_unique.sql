-- 0007 — titles unique key: (tmdb_id) → (tmdb_id, type).
--
-- TMDB movie-ids and tv-ids share one number space. To let a CC0 series be
-- re-pointed onto its real TMDB tv id even when a movie already owns that
-- numeric id, the uniqueness must be per (tmdb_id, type) instead of tmdb_id
-- alone. Idempotent; safe to re-run on live Neon. No data is altered.

DROP INDEX IF EXISTS "titles_tmdb_id_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "titles_tmdb_id_type_unique"
  ON "titles" ("tmdb_id", "type");
