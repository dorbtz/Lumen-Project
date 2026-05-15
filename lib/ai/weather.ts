/**
 * Lumen — Cinema Weather forecast generator (SPEC §3.1 Pillar 4).
 *
 * Generates a short mood-grounded "weather report" paragraph via Gemini structured
 * output. Wraps generateObject the same way lib/ai/why.ts does — Zod schema
 * enforces shape, errors propagate to the caller for graceful fallback.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { flashModel, requireGeminiKey } from "./client";

export const CinemaForecastSchema = z.object({
  headline: z.string().min(10).max(60),
  forecast: z.string().min(40).max(280),
  mood_label: z.string().min(3).max(32),
});

export type CinemaForecast = z.infer<typeof CinemaForecastSchema>;

export interface ForecastInput {
  valenceAvg: number;
  arousalAvg: number;
  recentTitles: string[];
  timeOfDay: "morning" | "afternoon" | "evening" | "late_night";
}

const SYSTEM = `You write brief, warm cinema "weather reports" for a viewer who just wants to know what to watch tonight. Use weather metaphors — overcast, bright skies, low pressure, electric charge — applied to mood, not literal weather. Be literate and specific, never generic or therapeutic. Write like a sharp-witted friend who's seen a lot of films. Under 3 sentences total.`;

export async function generateCinemaForecast(input: ForecastInput): Promise<CinemaForecast> {
  requireGeminiKey();

  const titlesLine =
    input.recentTitles.length > 0
      ? `Recent watches: ${input.recentTitles.slice(0, 5).join(", ")}.`
      : "No recent watches on record.";

  const { object } = await generateObject({
    model: flashModel,
    schema: CinemaForecastSchema,
    system: SYSTEM,
    prompt: `Viewer mood centroid — valence: ${input.valenceAvg.toFixed(2)} (−1 bleak to +1 joyful), arousal: ${input.arousalAvg.toFixed(2)} (−1 calm to +1 intense). Time of day: ${input.timeOfDay}. ${titlesLine}

Return: a short headline (weather metaphor, 10–60 chars), a 1–3 sentence forecast paragraph (40–280 chars) addressing the viewer directly, and a mood_label like "wistful" or "restless and bright" (3–32 chars).`,
    temperature: 0.7,
  });

  return object;
}
