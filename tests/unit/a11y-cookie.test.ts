import { parseAccessibilityCookie } from "@/lib/settings/a11y";
import { describe, expect, it } from "vitest";

describe("parseAccessibilityCookie", () => {
  it("defaults to all-off when absent", () => {
    expect(parseAccessibilityCookie(undefined)).toEqual({
      reduceTransparency: false,
      reduceMotion: false,
    });
  });

  it("parses both flags on", () => {
    expect(parseAccessibilityCookie(JSON.stringify({ rt: 1, rm: 1 }))).toEqual({
      reduceTransparency: true,
      reduceMotion: true,
    });
  });

  it("parses a single flag", () => {
    expect(parseAccessibilityCookie(JSON.stringify({ rt: 1, rm: 0 }))).toEqual({
      reduceTransparency: true,
      reduceMotion: false,
    });
  });

  it("falls back to all-off on malformed JSON", () => {
    expect(parseAccessibilityCookie("not json")).toEqual({
      reduceTransparency: false,
      reduceMotion: false,
    });
  });
});
