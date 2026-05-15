"use client";

/**
 * ShareButton — copies the public recap share URL (SPEC_COMPLETION §1 A2).
 *
 * On click: calls the server action to ensure/rotate-aware-fetch the token,
 * copies the absolute URL to the clipboard, and shows a transient confirmation.
 * Falls back to Web Share API on mobile when available.
 */

import { getShareUrlAction } from "@/app/(app)/recap/actions";
import { useState, useTransition } from "react";

export function ShareButton() {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  const onClick = () => {
    startTransition(async () => {
      const res = await getShareUrlAction();
      if ("error" in res) {
        setState("error");
        setTimeout(() => setState("idle"), 2400);
        return;
      }
      try {
        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({ title: "My Lumen Recap", url: res.url });
          setState("copied");
        } else {
          await navigator.clipboard.writeText(res.url);
          setState("copied");
        }
      } catch {
        // Share sheet dismissed or clipboard blocked — best-effort fallback.
        try {
          await navigator.clipboard.writeText(res.url);
          setState("copied");
        } catch {
          setState("error");
        }
      }
      setTimeout(() => setState("idle"), 2400);
    });
  };

  const label =
    state === "copied"
      ? "Link copied"
      : state === "error"
        ? "Couldn't share"
        : pending
          ? "Preparing…"
          : "Share recap";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-live="polite"
      className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-full text-sm bg-white/5 ring-1 ring-white/10 text-[var(--color-ink-1)] hover:bg-white/10 hover:text-[var(--color-ink-0)] transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-accent)]/40"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        role="img"
        className="w-4 h-4"
      >
        <title>Share</title>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
      </svg>
      {label}
    </button>
  );
}
