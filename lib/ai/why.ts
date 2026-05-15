/**
 * Lumen — Why Card LLM helper (SPEC §3.1 #2 + §8).
 *
 * Generates a personalized 1–2 sentence explanation for why a film matches
 * a viewer's taste, grounded in three specific dimensions of their profile.
 * Uses Gemini structured output via the Vercel AI SDK — Zod schema enforces
 * the shape so we never deal with malformed JSON.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { flashModel, requireGeminiKey } from "./client";

export const WhyCardSchema = z.object({
  reasons: z
    .array(
      z.object({
        dimension: z.string().min(2).max(64),
        contribution: z.number().min(0).max(1),
        copy: z.string().min(10).max(160),
      }),
    )
    .length(3),
  explanation_text: z.string().min(20).max(280),
});

export type WhyCard = z.infer<typeof WhyCardSchema>;

export interface WhyInput {
  title: string;
  overview: string;
  /** e.g. ["quiet endings", "naturalistic dialogue", "restrained color"] */
  topUserDimensions: string[];
}

const SYSTEM = `You explain movie recommendations in plain, warm language. Ground every reason in the viewer's known taste dimensions. Be specific, never generic. Never mention algorithms, vectors, embeddings, or scores. Write like a film-literate friend who knows the viewer well.`;

export async function generateWhyCard(input: WhyInput): Promise<WhyCard> {
  requireGeminiKey();
  const { object } = await generateObject({
    model: flashModel,
    schema: WhyCardSchema,
    system: SYSTEM,
    prompt: `Title: ${input.title}
Overview: ${input.overview}
This viewer responds to: ${input.topUserDimensions.join(", ")}

Return three "reasons" (each: dimension name, 0–1 contribution score, short phrase of copy) and one combined 1–2 sentence explanation_text addressed to the viewer.`,
    temperature: 0.5,
  });
  return object;
}
