"use client";

/**
 * SearchTriggerButton — chrome search entry point.
 *
 * Navigates to the full /search experience (Apple-glass poster grid +
 * franchise grouping). The ⌘K / `/` spotlight overlay still works globally
 * for power users; this visible button now leads to the richer page so the
 * primary search surface is the upgraded one.
 */

import Link from "next/link";

export function SearchTriggerButton({ label = "Search" }: { label?: string }) {
  return (
    <Link
      href="/search"
      prefetch={false}
      className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink-0)] transition-colors"
      aria-label="Open search"
    >
      <SearchIcon className="w-4 h-4" />
      <span>{label}</span>
    </Link>
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
      <title>Search</title>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
