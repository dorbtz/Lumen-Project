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
import { HeroBillboard, type HeroItem } from "@/components/title/HeroBillboard";
import { TitlePreviewCard, type TitlePreviewData } from "@/components/title/TitlePreviewCard";
import { TitleRow } from "@/components/title/TitleRow";
import { getActiveProfileId } from "@/lib/auth/active-profile";
import { isOnboardingSnoozed } from "@/lib/auth/onboarding-snooze";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import {
  getHeroCandidates,
  getPopularByType,
  getPopularTitles,
  getProfileById,
  getProfileTasteCentroid,
  getTitlesByTasteCentroid,
  getTonightPick,
  getWatchableTitles,
} from "@/lib/db/queries";
import type { Title } from "@/lib/db/schema";
import { tmdb } from "@/lib/tmdb/client";
import Link from "next/link";
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
  const [heroRows, tonightRow, trendingTmdb, taste, watchableRows, movieRows, seriesRows] =
    await Promise.all([
      getHeroCandidates(5),
      getTonightPick(),
      fetchTrendingFromTmdb(),
      getProfileTasteCentroid(profileId),
      getWatchableTitles(20),
      getPopularByType("movie", 20),
      getPopularByType("tv", 20),
    ]);

  // Cross-row de-dupe (plan WS3): a title shows in at most one row, in the
  // precedence Hero → Tonight → Trending → Taste → Stream now. Exclude
  // hero/tonight from the taste query at source via the existing excludeIds.
  const seenTmdb = new Set<number>();
  for (const t of heroRows) seenTmdb.add(t.tmdbId);
  if (tonightRow) seenTmdb.add(tonightRow.tmdbId);
  const heroExcludeUuids = [...heroRows.map((t) => t.id), ...(tonightRow ? [tonightRow.id] : [])];

  const closest = await getTitlesByTasteCentroid(taste, 24, heroExcludeUuids);

  const dedupe = (rows: TitlePreviewData[]): TitlePreviewData[] => {
    const out: TitlePreviewData[] = [];
    for (const r of rows) {
      if (seenTmdb.has(r.tmdbId)) continue;
      seenTmdb.add(r.tmdbId);
      out.push(r);
    }
    return out;
  };

  const trendingRow = dedupe(trendingTmdb);
  const closestRow = dedupe(closest.map(toPreview));
  const watchableRow = dedupe(watchableRows.map((t) => ({ ...toPreview(t), watchable: true })));
  const moviesRow = dedupe(movieRows.map(toPreview));
  const seriesRow = dedupe(seriesRows.map(toPreview));

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

      {/* Mood discovery lives at /discover/mood (plan WS4 — removed the
          duplicate inline dial). A glass CTA tile points there instead. */}
      <section className="px-6 md:px-10 py-8">
        <Link
          href="/discover/mood"
          className="group block glass-regular glass-specular rounded-3xl ring-1 ring-white/5 px-6 py-7 md:px-9 md:py-8 transition-colors hover:ring-white/15"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-accent)]">
                Discover by feeling
              </p>
              <h2 className="mt-2 text-xl md:text-2xl tracking-tight font-[var(--font-display)]">
                What do you want to feel tonight?
              </h2>
              <p className="mt-1 text-sm text-[var(--color-ink-2)]">
                Drag the mood orb — results stream as you move.
              </p>
            </div>
            <span
              aria-hidden
              className="text-2xl text-[var(--color-ink-3)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--color-ink-1)]"
            >
              →
            </span>
          </div>
        </Link>
      </section>

      <TitleRow label="Trending this week" hint="From TMDB" items={trendingRow} />

      <TitleRow
        label={taste ? "Closest to your taste" : "Most loved"}
        hint={taste ? "From your seed ratings" : "Popular on Lumen"}
        items={closestRow}
      />

      {moviesRow.length > 0 && <TitleRow label="Movies" hint="Popular films" items={moviesRow} />}

      {seriesRow.length > 0 && (
        <TitleRow label="TV series" hint="Popular shows" items={seriesRow} />
      )}

      {watchableRow.length > 0 && (
        <TitleRow
          label="Stream now — free"
          hint="Public-domain films, playable in Lumen"
          items={watchableRow}
        />
      )}
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
