-- Lumen — pgvector ivfflat indexes (SPEC §6 index priorities)
-- Run AFTER the drizzle-generated structural migration.
--
-- Notes on tuning:
--   - lists ≈ sqrt(rows). For ~20k titles, 142 lists is a reasonable start.
--   - Re-tune `lists` once the catalog grows past 100k rows.
--   - vector_cosine_ops for embeddings (semantic similarity).
--   - vector_l2_ops for mood/affect (Euclidean distance on a small affect plane is fine).
--
-- We use IF NOT EXISTS-style guards manually since CREATE INDEX doesn't support it
-- with USING ivfflat in older Postgres versions on Neon.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'titles_embedding_ivfflat') THEN
    CREATE INDEX titles_embedding_ivfflat
      ON titles USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 142);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'titles_mood_vector_ivfflat') THEN
    CREATE INDEX titles_mood_vector_ivfflat
      ON titles USING ivfflat (mood_vector vector_l2_ops)
      WITH (lists = 142);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'profiles_taste_centroid_ivfflat') THEN
    CREATE INDEX profiles_taste_centroid_ivfflat
      ON profiles USING ivfflat (taste_centroid vector_cosine_ops)
      WITH (lists = 16);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'journal_reflection_embedding_ivfflat') THEN
    CREATE INDEX journal_reflection_embedding_ivfflat
      ON journal_entries USING ivfflat (reflection_embedding vector_cosine_ops)
      WITH (lists = 32);
  END IF;
END$$;
