/**
 * Lumen — Playwright config (SPEC §12, SPEC_COMPLETION §2 B2).
 *
 * E2E happy paths. Auth uses a Clerk test session via storageState when
 * LUMEN_STORAGE_STATE points at a saved state file; unauthenticated specs
 * (the marketing→sign-in 307 gate) run without it.
 *
 * Run:  npm run test:e2e   (expects a server on BASE_URL, default :3000)
 */

import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    storageState: process.env.LUMEN_STORAGE_STATE || undefined,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
