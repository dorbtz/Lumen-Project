import { fitsBudget, isViableBudget, runtimeCap } from "@/lib/discover/timebox-rule";
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
