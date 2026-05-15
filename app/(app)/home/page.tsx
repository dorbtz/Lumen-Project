/**
 * Authenticated Home (SPEC §3.2 + §14 Week 2).
 *
 *   Hero billboard (auto-rotates) →
 *   Tonight (single suggestion) →
 *   Trending this week (TMDB) →
 *   Closest to your taste (pgvector → popularity fallback).
 *
 * Cache Components is OFF (Week 1 lesson #1). Dynamic auth/cookie reads live
 * inside <Suspense>. No `force-dynamic` exports anywhere.
 */

import { AppChrome } from "@/components/chrome/AppChrome";
import { MoodDial } from "@/components/mood/MoodDial";
import { HeroBillboard, type HeroItem } from "@/components/title/HeroBillboard";
import { TitlePreviewCard, type TitlePreviewData } from "@/components/title/TitlePreviewCard";
import { TitleRow } from "@/components/title/TitleRow";
import { getActiveProfileId } from "@/lib/auth/active-profile";
import { isOnboardingSnoozed } from "@/lib/auth/onboarding-snooze";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import {
  getHeroCandidates,
  getPopularTitles,
  getProfileById,
  getProfileTasteCentroid,
  getTitlesByTasteCentroid,
  getTonightPick,
} from "@/lib/db/queries";
import type { Title } from "@/lib/db/schema";
import { tmdb } from "@/lib/tmdb/client";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function AppHomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <AppHome />
    </Suspense>
  );
}

function HomeSkeleton() {
  return (
    <main className="min-h-dvh">
      <div className="h-[68dvh] bg-[var(--color-surface-1)] animate-pulse" />
      <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-72 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </main>
  );
}

async function AppHome() {
  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    redirect("/profiles");
  }

  const profile = await getProfileById(profileId);
  if (!profile) redirect("/profiles");
  if (!profile.onboardingDone && !(await isOnboardingSnoozed())) {
    redirect("/onboarding");
  }

  // Run independent queries in parallel.
  const [heroRows, tonightRow, trendingTmdb, taste] = await Promise.all([
    getHeroCandidates(5),
    getTonightPick(),
    fetchTrendingFromTmdb(),
    getProfileTasteCentroid(profileId),
  ]);

  const closest = await getTitlesByTasteCentroid(taste, 20);

  const heroItems: HeroItem[] = heroRows.map((t) => ({
    tmdbId: t.tmdbId,
    title: t.title,
    backdropPath: t.backdropPath,
    releaseYear: t.releaseYear ?? null,
    overview: t.overview ?? null,
    tagline: t.tagline ?? null,
    voteAverage: t.voteAverage ?? null,
    genres: (t.genres as string[] | null) ?? null,
    dominantColor: dominantHex(t),
  }));

  return (
    <main className="min-h-dvh pb-24">
      <AppChrome />

      <HeroBillboard items={heroItems} />

      {tonightRow && (
        <section className="px-6 md:px-10 py-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg md:text-xl tracking-tight font-[var(--font-display)]">
              Tonight
            </h2>
            <p className="text-[11px] uppercase tracking-widest text-[var(--color-ink-3)]">
              One pick, chosen for now
            </p>
          </div>
          <div className="pt-4">
            <TitlePreviewCard data={toPreview(tonightRow)} posterWidth={224} priority />
          </div>
        </section>
      )}

      {/* A6 — Home Mood Dial (SPEC_COMPLETION §1 A6). Pure composition of the
          existing client component; no new logic. */}
      <section className="px-6 md:px-10 py-10">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-lg md:text-xl tracking-tight font-[var(--font-display)]">
            What do you want to feel tonight?
          </h2>
          <p className="text-[11px] uppercase tracking-widest text-[var(--color-ink-3)]">
            Drag the orb
          </p>
        </div>
        <div className="pt-6">
          <MoodDial />
        </div>
      </section>

      <TitleRow label="Trending this week" hint="From TMDB" items={trendingTmdb} />

      <TitleRow
        label={taste ? "Closest to your taste" : "Most loved"}
        hint={taste ? "From your seed ratings" : "Popular on Lumen"}
        items={closest.map(toPreview)}
      />
    </main>
  );
}

function toPreview(t: Title): TitlePreviewData {
  return {
    id: t.id,
    tmdbId: t.tmdbId,
    title: t.title,
    posterPath: t.posterPath,
    backdropPath: t.backdropPath,
    releaseYear: t.releaseYear ?? null,
    runtimeMin: t.runtimeMin ?? null,
    voteAverage: t.voteAverage ?? null,
    overview: t.overview ?? null,
    genres: (t.genres as string[] | null) ?? null,
  };
}

function dominantHex(t: Title): string | null {
  const p = t.vibrantPalette as
    | { dominant?: string | null; vibrant?: string | null }
    | null
    | undefined;
  return p?.dominant ?? p?.vibrant ?? null;
}

/**
 * Live TMDB /trending/all/week — picks movie results, intersects with our DB
 * if possible (so links resolve), otherwise falls back to the TMDB ID.
 */
async function fetchTrendingFromTmdb(): Promise<TitlePreviewData[]> {
  try {
    const page = await tmdb.trendingAll("week", 1);
    return page.results
      .filter((r): r is Extract<typeof r, { media_type: "movie" }> => r.media_type === "movie")
      .slice(0, 20)
      .map((r) => ({
        tmdbId: r.id,
        title: r.title,
        posterPath: r.poster_path,
        backdropPath: r.backdrop_path,
        releaseYear: r.release_date ? Number(r.release_date.slice(0, 4)) : null,
        voteAverage: r.vote_average ? Math.round(r.vote_average * 10) : null,
        overview: r.overview ?? null,
        genres: null,
      }));
  } catch (err) {
    // Fall back to our cached popular titles if TMDB hiccups.
    // eslint-disable-next-line no-console
    console.warn("[home] TMDB trending failed, using DB popularity:", (err as Error).message);
    const rows = await getPopularTitles(20);
    return rows.map(toPreview);
  }
}
