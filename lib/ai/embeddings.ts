/**
 * Lumen — embedding helpers (Gemini via Vercel AI SDK).
 * SPEC §8 — Gemini `text-embedding-004` configured for 384-d output to match
 * `titles.embedding vector(384)` and `profiles.taste_centroid vector(384)`.
 */

import { embed, embedMany } from "ai";
import {
  EMBED_DIM,
  EMBED_PROVIDER_OPTIONS,
  embeddingModel,
  requireGeminiKey,
} from "./client";

/** MRL-slice a Gemini 768-d embedding down to the schema's 384-d. The leading
 *  dimensions in a Matryoshka-trained embedding carry the most signal. */
function sliceToStoredDim(v: number[]): number[] {
  return v.length === EMBED_DIM ? v : v.slice(0, EMBED_DIM);
}

export interface TitleEmbedInput {
  title: string;
  overview?: string | null;
  keywords?: string[] | null;
  genres?: string[] | null;
}

/** Compose the canonical text we embed for a title. */
export function composeTitleText(input: TitleEmbedInput): string {
  const parts: string[] = [input.title];
  if (input.overview) parts.push(input.overview);
  if (input.keywords?.length) parts.push(input.keywords.join(", "));
  if (input.genres?.length) parts.push(input.genres.join(", "));
  return parts.join(" — ").slice(0, 4000); // keep request body bounded
}

/** Embed an arbitrary batch of texts. Returns 384-d vectors (sliced from 768). */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  requireGeminiKey();
  if (texts.length === 0) return [];
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
    providerOptions: EMBED_PROVIDER_OPTIONS,
  });
  return embeddings.map(sliceToStoredDim);
}

/** Embed many titles' catalog text in one call. */
export async function embedTitleTexts(inputs: TitleEmbedInput[]): Promise<number[][]> {
  if (inputs.length === 0) return [];
  return embedTexts(inputs.map(composeTitleText));
}

/** Embed a single title (convenience). */
export async function embedTitleText(input: TitleEmbedInput): Promise<number[]> {
  const [vec] = await embedTitleTexts([input]);
  if (!vec) throw new Error("[embeddings] no vector returned");
  return vec;
}

/** Embed a single user journal reflection. */
export async function embedReflection(text: string): Promise<number[]> {
  requireGeminiKey();
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
    providerOptions: EMBED_PROVIDER_OPTIONS,
  });
  return sliceToStoredDim(embedding);
}
