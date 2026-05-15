/**
 * Lumen — pure mood→query-vector mapping (SPEC §3.1 Pillar 1).
 *
 * Builds the 64-d L2 query vector `[valence, arousal, 0, 0, …, 0]` the Mood
 * Dial uses against titles.mood_vector. Pure + dependency-free so it can be
 * unit-tested without a DB (SPEC_COMPLETION §2 B2). Inputs are clamped to
 * [-1, 1] to match the dial's normalised coordinate space.
 */

export const MOOD_VECTOR_DIMS = 64;

export function clampUnit(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(-1, n));
}

export function moodQueryVector(valence: number, arousal: number): number[] {
  const v = clampUnit(valence);
  const a = clampUnit(arousal);
  return [v, a, ...new Array(MOOD_VECTOR_DIMS - 2).fill(0)];
}

export function moodQueryLiteral(valence: number, arousal: number): string {
  return `[${moodQueryVector(valence, arousal).join(",")}]`;
}
