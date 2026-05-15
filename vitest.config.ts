/**
 * Lumen — Vitest config (SPEC §12, SPEC_COMPLETION §2 B2).
 *
 * Unit tests target PURE lib logic only (no DB/AI/network). Playwright E2E
 * lives under tests/e2e and is excluded here so `vitest` and `playwright`
 * never collide.
 */

import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});
