/**
 * Onboarding — 10-film taste seed (SPEC §A.2 + §14 Week 2).
 *
 * Server work: ensure all 10 seed films exist in our titles table (sync from
 * TMDB if not). Render a card-stack UI that lets the user rate 1–5 stars or
 * skip. After ≥5 ratings, server action:
 *   1. Inserts ratings rows (score 1–10 = stars * 2).
 *   2. Computes weighted-mean of those rated titles' embeddings → taste_centroid.
 *   3. Sets profiles.onboarding_done = true.
 *   4. Redirects to /home.
 *
 * If no titles have embeddings yet (e.g. embeddings batch not run), we still
 * persist ratings + mark onboarding done, but leave taste_centroid NULL so
 * Home falls back to popularity-based rows.
 */

import { GlassChrome } from "@/components/glass";
import { type OnboardingCard, OnboardingStack } from "@/components/onboarding/OnboardingStack";
import { getActiveProfileId } from "@/lib/auth/active-profile";
import { getOrCreateAccount, profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { getPopularTitles, getProfileById, getTitlesByTmdbIds } from "@/lib/db/queries";
import { MIN_RATINGS_FOR_CENTROID, ONBOARDING_SEED_FILMS } from "@/lib/onboarding/seed-films";
import { getOrSyncTitle } from "@/lib/tmdb/sync";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

const FALLBACK_POOL_SIZE = 40;

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <Onboarding />
    </Suspense>
  );
}

function OnboardingSkeleton() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="w-full max-w-md h-[560px] rounded-2xl bg-white/5 animate-pulse" />
    </main>
  );
}

async function Onboarding() {
  await getOrCreateAccount(); // race-safe JIT provisioning
  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    redirect("/profiles");
  }
  const profile = await getProfileById(profileId);
  if (!profile) redirect("/profiles");
  if (profile.onboardingDone) redirect("/home");

  // Ensure the 10 seed films are in our DB. Sync any missing ones from TMDB.
  // We run them in parallel for speed — getOrSyncTitle is idempotent.
  const seedIds = ONBOARDING_SEED_FILMS.map((f) => f.tmdbId);
  const existingBefore = await getTitlesByTmdbIds(seedIds);
  const havePresent = new Set(existingBefore.map((t) => t.tmdbId));
  await Promise.all(
    ONBOARDING_SEED_FILMS.filter((f) => !havePresent.has(f.tmdbId)).map((f) =>
      getOrSyncTitle(f.tmdbId).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn(`[onboarding] sync failed for tmdb_id=${f.tmdbId}`, err);
        return null;
      }),
    ),
  );

  const rows = await getTitlesByTmdbIds(seedIds);
  const byTmdbId = new Map(rows.map((r) => [r.tmdbId, r]));

  const seedCards: OnboardingCard[] = ONBOARDING_SEED_FILMS.map((f) => {
    const row = byTmdbId.get(f.tmdbId);
    return {
      tmdbId: f.tmdbId,
      titleRowId: row?.id ?? null,
      title: row?.title ?? f.fallbackTitle,
      director: f.director,
      year: row?.releaseYear ?? f.fallbackYear,
      posterPath: row?.posterPath ?? null,
      backdropPath: row?.backdropPath ?? null,
      axis: f.axis,
    };
  });

  // Popular fallback pool — extends the deck so the user can always reach
  // MIN_RATINGS_FOR_CENTROID even if they haven't seen most of the SPEC seed.
  const seedTmdbSet = new Set(seedIds);
  const popularRows = await getPopularTitles(FALLBACK_POOL_SIZE + seedIds.length);
  const fallbackCards: OnboardingCard[] = popularRows
    .filter((t) => !seedTmdbSet.has(t.tmdbId))
    .slice(0, FALLBACK_POOL_SIZE)
    .map((t) => ({
      tmdbId: t.tmdbId,
      titleRowId: t.id,
      title: t.title,
      director: null,
      year: t.releaseYear ?? 0,
      posterPath: t.posterPath,
      backdropPath: t.backdropPath,
      axis: "Popular",
    }));

  const cards: OnboardingCard[] = [...seedCards, ...fallbackCards];

  return (
    <main className="min-h-dvh pb-16">
      <GlassChrome
        as="header"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-5 px-5 py-3 rounded-full"
      >
        <Link href="/home" className="font-[var(--font-display)] text-lg tracking-tight">
          Lumen
        </Link>
        <span className="text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
          Taste seed
        </span>
      </GlassChrome>
      <section className="mx-auto max-w-2xl px-6 pt-32">
        <p className="text-[11px] tracking-[0.22em] uppercase text-[var(--color-accent)]">
          Welcome
        </p>
        <h1
          className="mt-3 text-3xl md:text-4xl font-[var(--font-display)] tracking-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          Rate ten films. We&apos;ll learn your taste.
        </h1>
        <p className="mt-3 text-sm text-[var(--color-ink-2)] max-w-prose">
          Tap stars for the ones you&apos;ve seen — skip the ones you haven&apos;t. We&apos;ll keep
          serving films from your library until you&apos;ve rated {MIN_RATINGS_FOR_CENTROID}.
        </p>
      </section>

      <section className="mx-auto max-w-2xl px-6 mt-10">
        <OnboardingStack cards={cards} />
      </section>
    </main>
  );
}
