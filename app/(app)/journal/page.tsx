/**
 * Journal index (SPEC §3.1 #3 + §3.2 secondary surface).
 *
 * Chronological feed of the active profile's Echo Journal entries — poster
 * thumb, title, watched-at date, reflection, generated question. Empty state
 * nudges the viewer to open a title and journal their first watch.
 */

import { AppChrome } from "@/components/chrome/AppChrome";
import { GlassCard } from "@/components/glass";
import { JournalList } from "@/components/journal/JournalList";
import { getActiveProfileId } from "@/lib/auth/active-profile";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { listJournalEntries } from "@/lib/journal/service";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function JournalPage() {
  return (
    <Suspense fallback={<JournalSkeleton />}>
      <JournalIndex />
    </Suspense>
  );
}

function JournalSkeleton() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto max-w-4xl px-6 pt-28 pb-20 space-y-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </main>
  );
}

async function JournalIndex() {
  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    redirect("/profiles");
  }

  const entries = await listJournalEntries(profileId, 80);

  return (
    <main className="min-h-dvh pb-24">
      <AppChrome />

      <section className="mx-auto max-w-4xl px-6 pt-32 pb-6">
        <h1 className="text-3xl md:text-4xl font-[var(--font-display)] tracking-tight">
          Your journal
        </h1>
        <p className="mt-2 text-sm text-[var(--color-ink-2)] max-w-prose">
          A living record of the films you&apos;ve watched and what they left with you.
        </p>
      </section>

      {entries.length === 0 ? <EmptyState /> : <JournalList entries={entries} />}
    </main>
  );
}

function EmptyState() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <GlassCard>
        <h2 className="text-xs tracking-[0.22em] uppercase text-[var(--color-accent-secondary)]">
          No entries yet
        </h2>
        <p className="mt-3 text-base text-[var(--color-ink-1)] max-w-prose">
          Open a title you&apos;ve seen and write a few lines. Lumen will respond with a question
          worth sitting with.
        </p>
        <Link
          href="/home"
          className="inline-block mt-5 text-sm text-[var(--color-accent)] hover:underline"
        >
          Browse films →
        </Link>
      </GlassCard>
    </section>
  );
}
