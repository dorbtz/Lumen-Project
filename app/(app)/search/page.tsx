/**
 * /search — the dedicated, full search experience (plan WS6).
 *
 * Apple-glass page with a Netflix-style poster grid, franchise grouping
 * ("marvel" → the whole MCU via shared keywords/collections), and a People
 * strip. Profile-gated like the rest of /(app); the interactive surface is
 * a client component fed by the `searchCatalog` server action.
 */

import { AppChrome } from "@/components/chrome/AppChrome";
import { SearchExperience } from "@/components/search/SearchExperience";
import { getActiveProfileId } from "@/lib/auth/active-profile";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchRoute searchParams={searchParams} />
    </Suspense>
  );
}

function SearchSkeleton() {
  return (
    <main className="min-h-dvh px-6 pt-32">
      <div className="mx-auto max-w-2xl h-14 rounded-2xl bg-white/5 animate-pulse" />
    </main>
  );
}

async function SearchRoute({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    redirect("/profiles");
  }
  const { q } = await searchParams;

  return (
    <main className="relative min-h-dvh pb-24">
      <AppChrome />
      <section className="mx-auto max-w-6xl px-6 pt-28 pb-6">
        <p className="text-[11px] tracking-[0.28em] uppercase text-[var(--color-accent)]">Search</p>
        <h1
          className="mt-3 text-3xl md:text-5xl font-[var(--font-display)] tracking-tight leading-[1.04]"
          style={{ letterSpacing: "-0.025em" }}
        >
          Find anything
        </h1>
        <p className="mt-3 text-sm md:text-base text-[var(--color-ink-2)] max-w-prose">
          Search by title, mood, genre, or a franchise — try “marvel”, “heist”, or “a24”.
        </p>
      </section>
      <SearchExperience initialQuery={q ?? ""} />
    </main>
  );
}
