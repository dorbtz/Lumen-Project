import {
  MOOD_VECTOR_DIMS,
  clampUnit,
  moodQueryLiteral,
  moodQueryVector,
} from "@/lib/discover/mood-vector";
import { describe, expect, it } from "vitest";

describe("clampUnit", () => {
  it("clamps to [-1, 1]", () => {
    expect(clampUnit(5)).toBe(1);
    expect(clampUnit(-5)).toBe(-1);
    expect(clampUnit(0.3)).toBe(0.3);
  });
  it("maps NaN to 0", () => {
    expect(clampUnit(Number.NaN)).toBe(0);
  });
});

describe("moodQueryVector", () => {
  it("is 64-dimensional", () => {
    expect(moodQueryVector(0, 0)).toHaveLength(MOOD_VECTOR_DIMS);
  });
  it("places valence + arousal first, rest zero", () => {
    const v = moodQueryVector(0.5, -0.25);
    expect(v[0]).toBe(0.5);
    expect(v[1]).toBe(-0.25);
    expect(v.slice(2).every((x) => x === 0)).toBe(true);
  });
  it("clamps out-of-range inputs", () => {
    const v = moodQueryVector(3, -9);
    expect(v[0]).toBe(1);
    expect(v[1]).toBe(-1);
  });
  it("moodQueryLiteral produces pgvector text", () => {
    expect(moodQueryLiteral(1, 0).startsWith("[1,0,")).toBe(true);
  });
});
