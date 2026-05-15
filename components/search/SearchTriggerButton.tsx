"use client";

/**
 * SearchTriggerButton — chrome-friendly button that opens the SearchOverlay.
 * Use this instead of <Link href="/search"> in nav surfaces.
 *
 * Note: the keyboard shortcut hint was removed from this label by request — the
 * shortcut still works globally (`/` or Cmd/Ctrl+K), just not advertised here.
 */

import { openSearchOverlay } from "@/components/search/SearchOverlay";

export function SearchTriggerButton({ label = "Search" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={openSearchOverlay}
      className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink-0)] transition-colors"
      aria-label="Open search"
    >
      <SearchIcon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
