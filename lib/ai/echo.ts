/**
 * Lumen — Echo Journal question generator (SPEC §3.1 #3).
 *
 * After a user logs a film, this returns ONE thoughtful, open-ended question
 * to prompt their reflection. Output goes into the journal entry's
 * `generated_question` column.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { flashModel, requireGeminiKey } from "./client";

export const EchoQuestionSchema = z.object({
  question: z.string().min(10).max(220),
});

export type EchoQuestion = z.infer<typeof EchoQuestionSchema>;

export interface EchoInput {
  title: string;
  overview: string;
  recentReflectionThemes?: string[];
}

const SYSTEM = `You are a film-literate companion. After someone finishes a movie, ask exactly ONE thoughtful, open-ended question that helps them reflect. Avoid plot questions, the generic "how did it make you feel", and anything therapist-flavored. Ask the kind of question a great film professor would ask — about craft, about meaning, about what surprised them.`;

export async function generateEchoQuestion(input: EchoInput): Promise<EchoQuestion> {
  requireGeminiKey();
  const themeLine = input.recentReflectionThemes?.length
    ? `This viewer's recent reflections circle around: ${input.recentReflectionThemes.join(", ")}.\n`
    : "";
  const { object } = await generateObject({
    model: flashModel,
    schema: EchoQuestionSchema,
    system: SYSTEM,
    prompt: `Title: ${input.title}
Overview: ${input.overview}
${themeLine}
Return ONE question (no preamble).`,
    temperature: 0.7,
  });
  return object;
}
