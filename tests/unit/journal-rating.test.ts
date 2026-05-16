import { computeTasteCentroid } from "@/lib/profile/centroid";
import { describe, expect, it } from "vitest";

/**
 * The journal rating folds into the SAME centroid path as onboarding
 * (plan WS9): ratings → weighted embeddings (score/10 == stars/5) →
 * computeTasteCentroid. These assert the combined math behaves.
 */
describe("journal rating → taste centroid", () => {
  it("blends onboarding + journal ratings into a unit vector", () => {
    const onboarding = { vec: [1, 0, 0], w: 1.0 }; // 5★ onboarding
    const journal = { vec: [0, 1, 0], w: 0.6 }; // 3★ journal
    const c = computeTasteCentroid([onboarding, journal]);
    expect(c).not.toBeNull();
    const norm = Math.sqrt((c as number[]).reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 6);
  });

  it("a new journal rating shifts the centroid toward the rated film", () => {
    const before = computeTasteCentroid([{ vec: [1, 0, 0], w: 1.0 }]);
    const after = computeTasteCentroid([
      { vec: [1, 0, 0], w: 1.0 },
      { vec: [0, 1, 0], w: 1.0 }, // newly journalled + 5★
    ]);
    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    // The 2nd dimension was 0 before and must become positive after.
    expect((before as number[])[1]).toBe(0);
    expect((after as number[])[1]).toBeGreaterThan(0);
  });

  it("higher stars pull the centroid harder (weight = score/10)", () => {
    const lightlyRated = computeTasteCentroid([
      { vec: [1, 0], w: 1.0 },
      { vec: [0, 1], w: 0.2 }, // 1★ → weak
    ]);
    const lovedIt = computeTasteCentroid([
      { vec: [1, 0], w: 1.0 },
      { vec: [0, 1], w: 1.0 }, // 5★ → equal pull
    ]);
    // With a stronger 2nd rating, dim[1] should be larger.
    expect((lovedIt as number[])[1]).toBeGreaterThan((lightlyRated as number[])[1] as number);
  });
});
