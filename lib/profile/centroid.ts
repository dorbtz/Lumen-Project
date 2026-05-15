/**
 * Lumen — pure taste-centroid math (SPEC §6 / Appendix A.2).
 *
 * Extracted as a pure, dependency-free function so it can be unit-tested
 * without a DB (SPEC_COMPLETION §2 B2). The onboarding action composes this
 * with embedding lookups.
 *
 * Centroid = L2-normalized weighted mean of rated titles' embeddings.
 * Weight is stars/5 (0.2 … 1.0). Vectors of a different dimension than the
 * first are skipped. Returns null when there's nothing usable.
 */

export interface WeightedVector {
  vec: number[];
  /** Rating weight, e.g. stars/5 → 0.2 … 1.0 */
  w: number;
}

export function computeTasteCentroid(items: WeightedVector[]): number[] | null {
  if (items.length === 0) return null;
  const dim = items[0]?.vec.length ?? 0;
  if (dim === 0) return null;

  const accum = new Array<number>(dim).fill(0);
  let totalW = 0;
  for (const { vec, w } of items) {
    if (vec.length !== dim) continue;
    if (!(w > 0)) continue;
    for (let i = 0; i < dim; i++) accum[i] += (vec[i] ?? 0) * w;
    totalW += w;
  }
  if (totalW <= 0) return null;

  const mean = accum.map((x) => x / totalW);
  const norm = Math.sqrt(mean.reduce((s, x) => s + x * x, 0)) || 1;
  return mean.map((x) => x / norm);
}

/** Format a number[] as a pgvector text literal `[a,b,c]`. */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
