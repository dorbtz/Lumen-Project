import { isoWeek, weekSeed, weeklyIndex } from "@/lib/discover/week-seed";
import { describe, expect, it } from "vitest";

describe("isoWeek", () => {
  it("computes ISO week numbers", () => {
    // 2026-01-01 is a Thursday → ISO week 1 of 2026.
    expect(isoWeek(new Date("2026-01-01T12:00:00Z"))).toEqual({ year: 2026, week: 1 });
    // 2026-05-16 (the project's reference date) → week 20.
    expect(isoWeek(new Date("2026-05-16T12:00:00Z"))).toEqual({ year: 2026, week: 20 });
  });
});

describe("weekSeed", () => {
  it("is stable within a week and advances across weeks", () => {
    const mon = new Date("2026-05-11T08:00:00Z");
    const sun = new Date("2026-05-17T22:00:00Z");
    const nextWeek = new Date("2026-05-18T08:00:00Z");
    expect(weekSeed(mon)).toBe(weekSeed(sun)); // same ISO week
    expect(weekSeed(nextWeek)).not.toBe(weekSeed(mon)); // rotated
    expect(weekSeed(nextWeek)).toBeGreaterThan(weekSeed(mon));
  });
});

describe("weeklyIndex", () => {
  it("returns a valid in-range index and 0 for an empty pool", () => {
    expect(weeklyIndex(0)).toBe(0);
    for (const len of [1, 5, 100]) {
      const i = weeklyIndex(len, new Date("2026-05-16T12:00:00Z"));
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(len);
    }
  });
  it("changes the pick when the week changes", () => {
    const a = weeklyIndex(100, new Date("2026-05-12T00:00:00Z"));
    const b = weeklyIndex(100, new Date("2026-05-19T00:00:00Z"));
    expect(a).not.toBe(b);
  });
});
