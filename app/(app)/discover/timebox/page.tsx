/**
 * /discover/timebox — Time-Box Discovery (SPEC_COMPLETION §1 A1, SPEC §3.1 #5).
 *
 * Profile-gated like the rest of /(app). The budget UI is a client component.
 */

import { AppChrome } from "@/components/chrome/AppChrome";
import { TimeBox } from "@/components/mood/TimeBox";
import { getActiveProfileId } from "@/lib/auth/active-profile";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function TimeboxPage() {
  return (
    <Suspense fallback={<TimeboxSkeleton />}>
      <TimeboxDiscover />
    </Suspense>
  );
}

function TimeboxSkeleton() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="w-full max-w-xl h-72 rounded-3xl bg-white/5 animate-pulse" />
    </main>
  );
}

async function TimeboxDiscover() {
  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    redirect("/profiles");
  }

  return (
    <main className="relative min-h-dvh pb-24">
      <AppChrome />

      <section className="mx-auto max-w-6xl px-6 pt-32 pb-10 text-center">
        <p className="text-[11px] tracking-[0.28em] uppercase text-[var(--color-accent)]">
          Discover by time
        </p>
        <h1
          className="mt-3 text-3xl md:text-5xl font-[var(--font-display)] tracking-tight leading-[1.04]"
          style={{ letterSpacing: "-0.025em" }}
        >
          How much time do you have?
        </h1>
        <p className="mt-3 text-sm md:text-base text-[var(--color-ink-2)] max-w-prose mx-auto">
          Set a runtime budget. We rank what fits by your taste.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 sm:px-10 pt-6 pb-20">
        <TimeBox />
      </section>
    </main>
  );
}
