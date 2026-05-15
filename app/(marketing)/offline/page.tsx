/**
 * /offline — PWA offline fallback (SPEC_COMPLETION §2 B1).
 *
 * Served by the service worker when a navigation fails with no network.
 * Public + fully static so it works with zero connectivity.
 */

import Link from "next/link";

export const metadata = {
  title: "Offline — Lumen",
};

export default function OfflinePage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6 text-center">
      <div className="max-w-sm">
        <p className="text-[11px] tracking-[0.28em] uppercase text-[var(--color-accent)]">
          Offline
        </p>
        <h1
          className="mt-3 text-3xl font-[var(--font-display)] tracking-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          You&apos;re off the grid
        </h1>
        <p className="mt-3 text-sm text-[var(--color-ink-2)] leading-relaxed">
          Lumen needs a connection for fresh recommendations and your journal. Reconnect and try
          again.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center min-h-[44px] px-6 rounded-full text-sm bg-white/5 ring-1 ring-white/10 text-[var(--color-ink-1)] hover:bg-white/10 transition-colors"
        >
          Retry
        </Link>
      </div>
    </main>
  );
}
