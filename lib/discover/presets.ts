/**
 * Mood preset "moments" (SPEC_COMPLETION §1 A5, SPEC §4).
 *
 * Static slug → (valence, arousal [, runtimeMax]) map. Each preset reuses
 * the existing Mood Dial pgvector query (`getTitlesByMood`) — no new logic,
 * no LLM. Runtime, when present, additionally caps the runtime budget via
 * the Time-Box query so e.g. "90-minutes" stays short.
 *
 * Axes match the Mood Dial:
 *   valence: bleak (-1) ↔ joyful (+1)
 *   arousal: calm  (-1) ↔ intense (+1)
 */

export interface MoodPreset {
  slug: string;
  label: string;
  /** Short evocative subtitle for the hub + header. */
  blurb: string;
  valence: number;
  arousal: number;
  /** Optional runtime cap in minutes (Time-Box style). */
  runtimeMax?: number;
}

export const MOOD_PRESETS: Record<string, MoodPreset> = {
  "rainy-sunday": {
    slug: "rainy-sunday",
    label: "Rainy Sunday",
    blurb: "Warm, slow, unhurried — something to sink into.",
    valence: 0.35,
    arousal: -0.55,
  },
  "dinner-party": {
    slug: "dinner-party",
    label: "Dinner Party",
    blurb: "Bright and buoyant — easy to half-watch with friends.",
    valence: 0.7,
    arousal: 0.25,
  },
  "90-minutes": {
    slug: "90-minutes",
    label: "90 Minutes",
    blurb: "Tight, complete, no filler — in and out by bedtime.",
    valence: 0.2,
    arousal: 0.2,
    runtimeMax: 100,
  },
  "post-breakup": {
    slug: "post-breakup",
    label: "Post-Breakup",
    blurb: "Tender and cathartic — the good kind of ache.",
    valence: -0.35,
    arousal: -0.3,
  },
  "wired-awake": {
    slug: "wired-awake",
    label: "Wired Awake",
    blurb: "Loud, fast, propulsive — match the adrenaline.",
    valence: 0.1,
    arousal: 0.85,
  },
  "comfort-rewatch": {
    slug: "comfort-rewatch",
    label: "Comfort Rewatch",
    blurb: "Familiar warmth — the cinematic equivalent of a blanket.",
    valence: 0.6,
    arousal: -0.2,
  },
};

export const MOOD_PRESET_LIST: MoodPreset[] = Object.values(MOOD_PRESETS);

export function getMoodPreset(slug: string): MoodPreset | null {
  return MOOD_PRESETS[slug] ?? null;
}
