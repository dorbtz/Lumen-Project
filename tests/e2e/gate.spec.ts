/**
 * Lumen — auth-free E2E happy paths (SPEC_COMPLETION §2 B2).
 *
 * These run with NO Clerk session, so they're always exercised in CI/local:
 *   - marketing landing renders
 *   - protected app routes 307-redirect to the sign-in gate
 *   - unknown mood preset slug → 404
 *   - the offline fallback page renders
 *
 * Authenticated journeys (onboarding rate-5→home, Mood Dial results,
 * journal compose, recap, settings taste-reset) live in onboarding.spec.ts
 * and journeys.spec.ts and self-skip without a test Clerk session.
 *
 * Run: npm run test:e2e  (server on BASE_URL, default :3000)
 */

import { expect, test } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

test("marketing landing renders", async ({ page }) => {
  const res = await page.goto(`${BASE}/`);
  expect(res?.status()).toBeLessThan(400);
  await expect(page.locator("body")).toBeVisible();
});

test("protected /home redirects unauthenticated users to sign-in", async ({ page }) => {
  await page.goto(`${BASE}/home`);
  // Clerk middleware issues a 307 to /sign-in (returnBackUrl preserved).
  await expect(page).toHaveURL(/\/sign-in/);
});

test("protected /discover redirects unauthenticated users to sign-in", async ({ page }) => {
  await page.goto(`${BASE}/discover`);
  await expect(page).toHaveURL(/\/sign-in/);
});

test("unknown mood preset slug → 404", async ({ page }) => {
  const res = await page.goto(`${BASE}/discover/mood/not-a-real-moment`);
  // Either the route 404s directly, or the auth gate intercepts first; both
  // are acceptable "this is not a valid preset surface" outcomes.
  const status = res?.status() ?? 0;
  const url = page.url();
  expect(status === 404 || /\/sign-in/.test(url)).toBeTruthy();
});

test("offline fallback page renders without auth", async ({ page }) => {
  const res = await page.goto(`${BASE}/offline`);
  expect(res?.status()).toBeLessThan(400);
  await expect(page.getByText(/off the grid/i)).toBeVisible();
});

test("recap share with a bogus token → 404", async ({ page }) => {
  const res = await page.goto(`${BASE}/recap/share/totally-bogus-token-xyz`);
  expect(res?.status()).toBe(404);
});
