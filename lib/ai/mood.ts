/**
 * Lumen — mood-vector tagging (Gemini structured output).
 *
 * Each movie maps to a 64-element vector in [-1, 1]:
 *   [0]  valence  — bleak (-1) to joyful (+1)
 *   [1]  arousal  — calm  (-1) to intense (+1)
 *   [2..63] 62 theme dimensions, in `MOOD_THEMES` order below.
 *
 * Stored in `titles.mood_vector vector(64)` and queried by the Mood Dial
 * (SPEC §3.1 Pillar 1) via pgvector L2.
 *
 * Earlier HF + Llama path returned malformed JSON ~100% of the time; this
 * implementation uses `generateObject` + Zod which Gemini honors natively.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { flashModel, requireGeminiKey } from "./client";

/** 62 theme dimensions in fixed order. Position is meaningful — do not reorder. */
export const MOOD_THEMES = [
  "melancholy",
  "hope",
  "dread",
  "awe",
  "romance",
  "irony",
  "absurdity",
  "tenderness",
  "rage",
  "grief",
  "wonder",
  "alienation",
  "nostalgia",
  "redemption",
  "paranoia",
  "mysticism",
  "hedonism",
  "restraint",
  "vulnerability",
  "swagger",
  "surrealism",
  "naturalism",
  "claustrophobia",
  "expansiveness",
  "intimacy",
  "epic_scope",
  "slow_burn",
  "kinetic",
  "dialogue_driven",
  "image_driven",
  "ensemble",
  "solo_journey",
  "chosen_family",
  "isolation",
  "urban",
  "rural",
  "period",
  "futurism",
  "supernatural",
  "grounded",
  "coming_of_age",
  "late_style",
  "political",
  "apolitical",
  "american",
  "international",
  "queer",
  "straight",
  "masculine",
  "feminine",
  "gen_z",
  "boomer_era",
  "indie",
  "studio",
  "lo_fi",
  "hi_fi",
  "comedy",
  "tragedy",
  "thriller_pulse",
  "horror_pulse",
  "action_pulse",
  "romance_pulse",
] as const;

export const MOOD_VECTOR_DIM = 2 + MOOD_THEMES.length; // 64

// Loose schema for Gemini's structured output. Strict length+range constraints
// were causing repeated "response did not match schema" failures even on
// reasonable outputs (model would emit 1.05 or have 63/65 elements). We
// accept any number[][], then sanitize length and clamp range client-side.
const MoodBatch = z.object({
  moods: z.array(z.array(z.number())),
});

export type MoodVector = number[];

export interface MoodInput {
  title: string;
  overview?: string | null;
}

const SYSTEM = `You are a film mood tagger. For each movie, output a 64-element array of numbers in the range [-1, 1].

Position [0] = valence: bleak (-1) ↔ joyful (+1).
Position [1] = arousal: calm (-1) ↔ intense (+1).
Positions [2..63] = these 62 themes in EXACTLY this fixed order:
${MOOD_THEMES.join(", ")}

Score every position. Be specific — most films load on only a few themes. Use 0 for irrelevant themes (not all -1). Never invent themes outside the list. Return an array of arrays, one per movie, in the input order.`;

/** Tag a batch of movies. Returns one 64-d vector per input, in order.
 *  Sanitizes Gemini output: pads/truncates each vector to MOOD_VECTOR_DIM
 *  and clamps each value into [-1, 1]. */
export async function tagMoods(items: MoodInput[]): Promise<MoodVector[]> {
  requireGeminiKey();
  if (items.length === 0) return [];

  const lines = items.map(
    (m, i) =>
      `${i + 1}. ${m.title}${m.overview ? ` — ${m.overview.slice(0, 240)}` : ""}`,
  );
  const prompt = `Movies:\n${lines.join("\n")}\n\nReturn EXACTLY ${items.length} mood vector(s), one per movie in input order. Each vector MUST be a JSON array of EXACTLY ${MOOD_VECTOR_DIM} numbers. Return JSON object: { "moods": [[64 numbers], ...] }`;

  const { object } = await generateObject({
    model: flashModel,
    schema: MoodBatch,
    system: SYSTEM,
    prompt,
    temperature: 0.2,
  });

  // Gemini sometimes returns extra mood vectors. If we got at least the
  // expected count, slice to length. Only throw if the model under-delivered.
  if (object.moods.length < items.length) {
    throw new Error(
      `[mood] under-delivered: got ${object.moods.length} mood vector(s), expected ${items.length}`,
    );
  }
  return object.moods.slice(0, items.length).map(normalizeMoodVector);
}

function normalizeMoodVector(v: number[]): MoodVector {
  // Pad with zeros if short, truncate if long.
  const out = v.slice(0, MOOD_VECTOR_DIM);
  while (out.length < MOOD_VECTOR_DIM) out.push(0);
  // Clamp each value into [-1, 1] and replace any NaN/Infinity with 0.
  for (let i = 0; i < out.length; i++) {
    const n = out[i]!;
    if (!Number.isFinite(n)) {
      out[i] = 0;
    } else if (n > 1) {
      out[i] = 1;
    } else if (n < -1) {
      out[i] = -1;
    }
  }
  return out;
}
