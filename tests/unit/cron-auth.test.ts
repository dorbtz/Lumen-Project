import { isAuthorizedCron } from "@/lib/cron/auth";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

function reqWith(auth?: string): Request {
  return new Request("https://example.com/api/cron/recap", {
    headers: auth ? { authorization: auth } : {},
  });
}

describe("isAuthorizedCron", () => {
  const original = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "s3cr3t-test-value";
  });
  afterEach(() => {
    process.env.CRON_SECRET = original;
  });

  it("accepts the exact Bearer secret", () => {
    expect(isAuthorizedCron(reqWith("Bearer s3cr3t-test-value"))).toBe(true);
  });

  it("rejects a wrong secret", () => {
    expect(isAuthorizedCron(reqWith("Bearer nope"))).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(isAuthorizedCron(reqWith())).toBe(false);
  });

  it("rejects when CRON_SECRET is unset (fail closed)", () => {
    process.env.CRON_SECRET = "";
    expect(isAuthorizedCron(reqWith("Bearer anything"))).toBe(false);
  });
});
