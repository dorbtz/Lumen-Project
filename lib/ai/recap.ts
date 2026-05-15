/**
 * Lumen — Recap story generator (SPEC §3.1 Pillar 4 + §3.2).
 *
 * Given the viewer's recent journal entries (titles + reflections + Echo
 * questions + mood vectors), Gemini writes:
 *   - a short headline (~one line)
 *   - a 2-paragraph "week in films" narrative addressed to the viewer
 *   - up to 3 "moments" — standout entries with a one-line beat each
 *
 * We pass each entry as a numbered line so the model can reference moments
 * by index (titleIndex) and we resolve those back to poster cards on the
 * UI side. Numeric indices avoid the fuzzy-title-matching problem.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { flashModel, requireGeminiKey } from "./client";

export const RecapSchema = z.object({
  headline: z.string().min(6).max(90),
  story: z.string().min(80).max(900),
  moments: z
    .array(
      z.object({
        titleIndex: z.number().int().min(0),
        beat: z.string().min(8).max(160),
      }),
    )
    .max(3),
});

export type Recap = z.infer<typeof RecapSchema>;

export interface RecapInputItem {
  index: number;
  title: string;
  /** ISO date (YYYY-MM-DD). */
  watchedAt: string;
  reflection: string | null;
  question: string | null;
  /** -1..1 */
  valence: number;
  /** -1..1 */
  arousal: number;
}

const SYSTEM = `You are a film-literate companion writing a brief, personal recap of the viewer's recent watching. Tone: warm, observant, literate. Write in second person ("you"). Find a throughline — a mood, a question, a thread. Avoid generic praise. Never invent details about a film. If the reflections circle around a theme, name it specifically. Keep the story to two short paragraphs at most. No emojis, no exclamation marks.`;

export interface GenerateRecapInput {
  items: RecapInputItem[];
  /** Short phrase describing the time range — e.g. "the last 14 days" or
   *  "the viewer's full watch history". Steers the headline tone. */
  windowLabel: string;
}

export async function generateRecap(input: GenerateRecapInput): Promise<Recap> {
  requireGeminiKey();
  const { items, windowLabel } = input;
  if (items.length === 0) throw new Error("[recap] empty input");

  const lines = items.map((it) => {
    const refl = it.reflection ? ` · reflection: "${it.reflection.slice(0, 280)}"` : "";
    const q = it.question ? ` · echo: "${it.question.slice(0, 160)}"` : "";
    const mood = ` · mood(v=${it.valence.toFixed(2)},a=${it.arousal.toFixed(2)})`;
    return `[${it.index}] ${it.watchedAt} — ${it.title}${mood}${refl}${q}`;
  });

  const prompt = `Films the viewer journaled during ${windowLabel}:
${lines.join("\n")}

Return:
- headline (one line, 6-90 chars, no quotes, no period at the end). If the window is "the full watch history", the headline can lean retrospective; if recent, it can feel weekly.
- story (1-2 short paragraphs, max ~600 chars total, second person, address the viewer warmly)
- moments: up to 3 standout entries. Each is { titleIndex: a number from the list above, beat: a single sentence (8-160 chars) about why this one mattered }.
  Pick films with the richest reflection or the clearest emotional through-line. If fewer than 3 films deserve a beat, return fewer.`;

  const { object } = await generateObject({
    model: flashModel,
    schema: RecapSchema,
    system: SYSTEM,
    prompt,
    temperature: 0.6,
  });
  return object;
}
