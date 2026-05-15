/**
 * Lumen — AI client (Google Gemini via Vercel AI SDK).
 *
 * Free-tier path (no credit card required): Google AI Studio key signed into a
 * Free-tier project gives 1500 requests/day for both `text-embedding-004` and
 * `gemini-2.5-flash`. We use Gemini directly (no Vercel AI Gateway in the
 * call path) so there is no Vercel-side AI billing exposure — the hard cap is
 * Google's free-tier daily quota.
 *
 * Models:
 *   - `text-embedding-004`           → embeddings, configured for 384-d output
 *                                     to match `titles.embedding vector(384)`.
 *   - `gemini-2.5-flash`             → mood vectors, "Why this" copy, Echo
 *                                     Journal questions. Native JSON mode +
 *                                     schema-constrained outputs via the AI
 *                                     SDK's `generateObject`.
 *
 * Earlier (Week 2) we used Hugging Face Inference; that path is documented as
 * dead in `memory/project_lumen_lessons.md` — Llama via HF Router returned
 * malformed JSON and the embedding endpoints all 404/403'd. Switching to
 * Gemini + structured-output solves both.
 */

import { google } from "@ai-sdk/google";

// gemini-embedding-001 is the current free-tier embedding model (text-embedding-004
// was deprecated). Output dimensionality is MRL-truncated to a supported size
// (128 / 256 / 512 / 768 / 1536 / 3072) — 384 is not natively supported, so we
// request 768 and slice client-side in `lib/ai/embeddings.ts`.
const EMBEDDING_MODEL_ID = "gemini-embedding-001" as const;
// gemini-2.5-flash-lite is more reliably available on free tier than
// gemini-2.5-flash (which intermittently 503s under load). Lite still supports
// structured-output JSON via generateObject and handles 64-element arrays fine.
const FLASH_MODEL_ID = "gemini-2.5-flash-lite" as const;

/** Throws a clear error if the user hasn't pasted their Gemini key yet. */
export function requireGeminiKey(): void {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      "[lumen/ai] GOOGLE_GENERATIVE_AI_API_KEY not set. Get a free key at https://aistudio.google.com (no credit card required) and add it to .env.local.",
    );
  }
}

/** Shared model handles. Cheap to call repeatedly; AI SDK keeps these lazy. */
export const embeddingModel = google.textEmbedding(EMBEDDING_MODEL_ID);
export const flashModel = google(FLASH_MODEL_ID);

/** Final dimensionality stored in `titles.embedding vector(384)`. */
export const EMBED_DIM = 384;

/** Gemini's native return dimensionality — closest MRL-supported size to 384.
 *  We slice the leading EMBED_DIM dims client-side (MRL guarantees those
 *  are the most informative). */
export const NATIVE_EMBED_DIM = 768;

/** Provider options for every gemini-embedding-001 call. */
export const EMBED_PROVIDER_OPTIONS = {
  google: {
    outputDimensionality: NATIVE_EMBED_DIM,
    taskType: "RETRIEVAL_DOCUMENT" as const,
  },
};
