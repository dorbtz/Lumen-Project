import { computeTasteCentroid, toVectorLiteral } from "@/lib/profile/centroid";
import { describe, expect, it } from "vitest";

describe("computeTasteCentroid", () => {
  it("returns null for no items", () => {
    expect(computeTasteCentroid([])).toBeNull();
  });

  it("returns null when all weights are non-positive", () => {
    expect(
      computeTasteCentroid([
        { vec: [1, 0, 0], w: 0 },
        { vec: [0, 1, 0], w: -1 },
      ]),
    ).toBeNull();
  });

  it("produces an L2-normalized vector (unit length)", () => {
    const c = computeTasteCentroid([
      { vec: [3, 4, 0], w: 1 },
      { vec: [3, 4, 0], w: 1 },
    ]);
    expect(c).not.toBeNull();
    const norm = Math.sqrt((c as number[]).reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 6);
  });

  it("weights higher-rated vectors more", () => {
    const c = computeTasteCentroid([
      { vec: [1, 0], w: 1.0 },
      { vec: [0, 1], w: 0.2 },
    ]) as number[];
    // x-axis dominates because its weight is far larger.
    expect(c[0]).toBeGreaterThan(c[1]!);
  });

  it("skips vectors of mismatched dimension", () => {
    const c = computeTasteCentroid([
      { vec: [1, 0, 0], w: 1 },
      { vec: [9, 9], w: 1 }, // wrong dim — ignored
    ]) as number[];
    expect(c).toHaveLength(3);
    expect(c[0]).toBeCloseTo(1, 6);
  });

  it("toVectorLiteral formats pgvector text", () => {
    expect(toVectorLiteral([0.1, 0.2, 0.3])).toBe("[0.1,0.2,0.3]");
  });
});
