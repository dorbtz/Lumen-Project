/**
 * /discover/watch — the free, playable CC0 catalog (plan WS5).
 *
 * Public-domain films with a ready Mux asset, surfaced as a poster grid so
 * the watchable catalog is actually discoverable (previously reachable only
 * by landing on a specific title page). Profile-gated like the rest of /(app).
 */

import { AppChrome } from "@/components/chrome/AppChrome";
import { TitlePreviewCard } from "@/components/title/TitlePreviewCard";
import { getActiveProfileId } from "@/lib/auth/active-profile";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { getWatchableTitles } from "@/lib/db/queries";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function WatchHubPage() {
  return (
    <Suspense fallback={<WatchSkeleton />}>
      <WatchHub />
    </Suspense>
  );
}

function WatchSkeleton() {
  return (
    <main className="min-h-dvh px-6 pt-32">
      <div className="mx-auto max-w-6xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="aspect-[2/3] rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </main>
  );
}

async function WatchHub() {
  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    redirect("/profiles");
  }

  const rows = await getWatchableTitles(48);

  return (
    <main className="relative min-h-dvh pb-24">
      <AppChrome />

      <section className="mx-auto max-w-6xl px-6 pt-32 pb-8 text-center">
        <p className="text-[11px] tracking-[0.28em] uppercase text-[var(--color-accent)]">
          Stream free
        </p>
        <h1
          className="mt-3 text-3xl md:text-5xl font-[var(--font-display)] tracking-tight leading-[1.04]"
          style={{ letterSpacing: "-0.025em" }}
        >
          Watch now
        </h1>
        <p className="mt-3 text-sm md:text-base text-[var(--color-ink-2)] max-w-prose mx-auto">
          Public-domain films, restored and playable right here — no account, no paywall.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 sm:px-10 pb-20">
        {rows.length === 0 ? (
          <p className="mt-8 text-sm text-center text-[var(--color-ink-3)]">
            The free catalog is being prepared — check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {rows.map((t) => (
              <TitlePreviewCard
                key={t.tmdbId}
                data={{
                  id: t.id,
                  tmdbId: t.tmdbId,
                  title: t.title,
                  posterPath: t.posterPath,
                  backdropPath: t.backdropPath ?? null,
                  releaseYear: t.releaseYear ?? null,
                  runtimeMin: t.runtimeMin ?? null,
                  voteAverage: t.voteAverage ?? null,
                  overview: t.overview ?? null,
                  genres: (t.genres as string[] | null) ?? null,
                  watchable: true,
                  mediaType: t.type === "tv" ? "tv" : undefined,
                }}
                posterWidth={170}
                className="w-full"
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
