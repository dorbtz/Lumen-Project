import {
  fitsBudget,
  isViableBudget,
  runtimeCap,
  runtimeFloor,
} from "@/lib/discover/timebox-rule";
import { describe, expect, it } from "vitest";

describe("isViableBudget", () => {
  it("rejects budgets under 40 min (empty state)", () => {
    expect(isViableBudget(39)).toBe(false);
    expect(isViableBudget(0)).toBe(false);
    expect(isViableBudget(Number.NaN)).toBe(false);
  });
  it("accepts 40+ min", () => {
    expect(isViableBudget(40)).toBe(true);
    expect(isViableBudget(120)).toBe(true);
  });
});

describe("runtimeCap", () => {
  it("adds the 8-minute grace", () => {
    expect(runtimeCap(90)).toBe(98);
    expect(runtimeCap(120)).toBe(128);
  });
  it("rounds fractional budgets", () => {
    expect(runtimeCap(89.6)).toBe(98);
  });
});

describe("runtimeFloor", () => {
  it("scales the band lower edge with the budget", () => {
    // ~62% of budget → Quick / Standard / Epic target different lengths
    expect(runtimeFloor(90)).toBe(56);
    expect(runtimeFloor(120)).toBe(74);
    expect(runtimeFloor(150)).toBe(93);
  });
  it("makes the presets produce distinct bands (the bug fix)", () => {
    // A 92-min film (e.g. The Super Mario Bros. Movie) must fall OUT of the
    // Epic band so it can't top every preset.
    expect(runtimeFloor(150)).toBeGreaterThan(92);
    expect(runtimeFloor(90)).toBeLessThanOrEqual(92);
  });
  it("never drops below the viable minimum", () => {
    expect(runtimeFloor(40)).toBe(40);
    expect(runtimeFloor(50)).toBe(40);
  });
  it("stays strictly below the cap so the band is non-empty", () => {
    for (const m of [40, 73, 90, 120, 150, 240]) {
      expect(runtimeFloor(m)).toBeLessThan(runtimeCap(m));
    }
  });
});

describe("fitsBudget", () => {
  it("includes a film at exactly cap", () => {
    expect(fitsBudget(98, 90)).toBe(true);
  });
  it("includes a film within grace", () => {
    expect(fitsBudget(95, 90)).toBe(true);
  });
  it("excludes a film over cap", () => {
    expect(fitsBudget(140, 90)).toBe(false);
  });
  it("excludes a film with unknown runtime", () => {
    expect(fitsBudget(null, 120)).toBe(false);
  });
});
