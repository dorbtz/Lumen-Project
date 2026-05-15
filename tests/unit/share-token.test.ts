import { generateShareToken } from "@/lib/recap/token";
import { describe, expect, it } from "vitest";

describe("generateShareToken", () => {
  it("is URL-safe base64url (no +, /, =)", () => {
    const t = generateShareToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("has ~128 bits of entropy (>=20 chars)", () => {
    expect(generateShareToken().length).toBeGreaterThanOrEqual(20);
  });

  it("is unique across many draws (rotation = a fresh token)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(generateShareToken());
    expect(seen.size).toBe(2000);
  });
});
