-- Lumen — bootstrap migration
-- Run FIRST, before any drizzle-generated migrations.
-- Enables the pgvector extension required by SPEC §6 (taste_centroid, embedding, mood_vector).

CREATE EXTENSION IF NOT EXISTS vector;
