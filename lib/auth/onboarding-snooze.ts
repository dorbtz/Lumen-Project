/**
 * Lumen — onboarding "remind me later" cookie.
 *
 * When the viewer chooses "Remind me later" from the skip dialog, we set a
 * short-lived cookie that suppresses /home's redirect to /onboarding. The
 * cookie expires after 24h, so the next day they'll be nudged again. When
 * onboarding actually completes (or is permanently skipped), `onboarding_done`
 * flips and this cookie becomes irrelevant.
 */

import { cookies } from "next/headers";

const COOKIE_NAME = "lumen_onboarding_snooze";
const MAX_AGE_SEC = 60 * 60 * 24; // 24 hours

export async function isOnboardingSnoozed(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === "1";
}

export async function setOnboardingSnooze(): Promise<void> {
  const store = await cookies();
  store.set({
    name: COOKIE_NAME,
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SEC,
    path: "/",
  });
}

export async function clearOnboardingSnooze(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
