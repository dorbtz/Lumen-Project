import { MOOD_PRESETS, MOOD_PRESET_LIST, getMoodPreset } from "@/lib/discover/presets";
import { describe, expect, it } from "vitest";

describe("mood presets", () => {
  it("has the 6 spec moments", () => {
    expect(MOOD_PRESET_LIST).toHaveLength(6);
    for (const slug of [
      "rainy-sunday",
      "dinner-party",
      "90-minutes",
      "post-breakup",
      "wired-awake",
      "comfort-rewatch",
    ]) {
      expect(MOOD_PRESETS[slug]).toBeDefined();
    }
  });

  it("every preset has in-range valence/arousal", () => {
    for (const p of MOOD_PRESET_LIST) {
      expect(p.valence).toBeGreaterThanOrEqual(-1);
      expect(p.valence).toBeLessThanOrEqual(1);
      expect(p.arousal).toBeGreaterThanOrEqual(-1);
      expect(p.arousal).toBeLessThanOrEqual(1);
    }
  });

  it("90-minutes carries a runtime cap", () => {
    expect(MOOD_PRESETS["90-minutes"]?.runtimeMax).toBeGreaterThan(0);
  });

  it("getMoodPreset returns null for unknown slug (→ 404)", () => {
    expect(getMoodPreset("does-not-exist")).toBeNull();
  });
});
