/**
 * /discover/mood — Mood Dial discovery surface (SPEC §3.1 Pillar 1).
 *
 * Profile-gated like the rest of /(app). The actual dial is a client component.
 */

import { AppChrome } from "@/components/chrome/AppChrome";
import { MoodDial } from "@/components/mood/MoodDial";
import { getActiveProfileId } from "@/lib/auth/active-profile";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function MoodDiscoverPage() {
  return (
    <Suspense fallback={<MoodSkeleton />}>
      <MoodDiscover />
    </Suspense>
  );
}

function MoodSkeleton() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="w-full max-w-[360px] aspect-square rounded-3xl bg-white/5 animate-pulse" />
    </main>
  );
}

async function MoodDiscover() {
  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    redirect("/profiles");
  }

  return (
    <main className="relative min-h-dvh pb-24">
      <AppChrome />

      <section className="mx-auto max-w-6xl px-6 pt-32 pb-10 text-center">
        <p className="text-[11px] tracking-[0.28em] uppercase text-[var(--color-accent)]">
          Discover by mood
        </p>
        <h1
          className="mt-3 text-3xl md:text-5xl font-[var(--font-display)] tracking-tight leading-[1.04]"
          style={{ letterSpacing: "-0.025em" }}
        >
          What do you want to feel tonight?
        </h1>
        <p className="mt-3 text-sm md:text-base text-[var(--color-ink-2)] max-w-prose mx-auto">
          Drag the orb to a mood. Films stream in as you move.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-10 pt-12 pb-20">
        <MoodDial />
      </section>
    </main>
  );
}
