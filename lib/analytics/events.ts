/**
 * Lumen — typed product analytics events (SPEC §12, SPEC_COMPLETION §2 B3).
 *
 * `capture()` is a thin wrapper that no-ops gracefully when PostHog isn't
 * initialised (no key in the env, or SSR). No PII beyond the Clerk user id
 * (PostHog identifies by it via the provider). Import this from client
 * components only.
 */

import posthog from "posthog-js";

export type LumenEvent =
  | "rated_film"
  | "logged_journal"
  | "viewed_recap"
  | "mood_search"
  | "timebox_search";

export function capture(event: LumenEvent, props?: Record<string, unknown>): void {
  try {
    // posthog-js is a no-op until init(); __loaded guards SSR / missing key.
    if (typeof window === "undefined") return;
    if (!posthog.__loaded) return;
    posthog.capture(event, props);
  } catch {
    // Analytics must never break a user flow.
  }
}
