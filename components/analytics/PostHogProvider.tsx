"use client";

/**
 * PostHogProvider — client analytics init (SPEC §12, SPEC_COMPLETION §2 B3).
 *
 * Gracefully no-ops when NEXT_PUBLIC_POSTHOG_KEY is absent (the spec marks
 * PostHog optional). When present: manual pageview capture on route change,
 * identify by the Clerk user id only (no other PII), session replay left at
 * PostHog project defaults.
 */

import { useAuth } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { Suspense, useEffect } from "react";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!KEY) return; // optional per spec — silent no-op
    if (posthog.__loaded) return;
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: false, // we send manual pageviews below
      capture_pageleave: true,
      autocapture: true,
    });
  }, []);

  if (!KEY) return <>{children}</>;

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      <PostHogIdentify />
      {children}
    </>
  );
}

function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!posthog.__loaded || !pathname) return;
    const qs = searchParams?.toString();
    posthog.capture("$pageview", {
      $current_url: window.location.origin + pathname + (qs ? `?${qs}` : ""),
    });
  }, [pathname, searchParams]);

  return null;
}

function PostHogIdentify() {
  const { userId, isLoaded } = useAuth();

  useEffect(() => {
    if (!posthog.__loaded || !isLoaded) return;
    if (userId) {
      // Clerk user id only — no email/name/other PII (SPEC §12).
      posthog.identify(userId);
    } else {
      posthog.reset();
    }
  }, [userId, isLoaded]);

  return null;
}
