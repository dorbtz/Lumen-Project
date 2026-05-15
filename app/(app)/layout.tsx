/**
 * Authenticated app layout.
 * Middleware already ensures the user is signed in.
 * Per-profile gating happens further down via `getActiveProfileId()`.
 */

import { SearchOverlay } from "@/components/search/SearchOverlay";
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      {/* Ambient backdrop — aurora cyan + emerald wash on sapphire base.
       * Replaces the Week-1 orange/purple placeholder. Cinema Weather (Week 3)
       * will replace this with a content-driven WebGL orb. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(58% 78% at 78% 8%, oklch(0.66 0.17 200 / 0.22), transparent 60%), radial-gradient(48% 68% at 8% 92%, oklch(0.62 0.15 160 / 0.22), transparent 60%), var(--color-surface-0)",
        }}
      />
      {/* On mobile, BottomNav floats over the bottom edge. The padding here
       * lifts every page above it so content isn't covered. Desktop has no
       * bottom bar, so the padding collapses. */}
      <div className="md:pb-0 pb-[calc(env(safe-area-inset-bottom,0px)+5.25rem)]">
        {children}
      </div>
      <SearchOverlay />
    </div>
  );
}
