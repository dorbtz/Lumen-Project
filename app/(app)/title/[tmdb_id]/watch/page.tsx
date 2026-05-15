/**
 * /title/[tmdb_id]/watch — the player (SPEC §4 IA, §9, decision D1).
 *
 *   CC0 catalog title → themed Mux HLS player (Apple-TV+ chrome).
 *   Any other title    → YouTube trailer fallback via TMDB /videos.
 *
 * Profile-gated like the rest of /(app). If neither a CC0 stream nor a
 * trailer exists, we explain that gracefully rather than 404.
 */

import { AppChrome } from "@/components/chrome/AppChrome";
import { WatchPlayer } from "@/components/title/WatchPlayer";
import { getActiveProfileId } from "@/lib/auth/active-profile";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { getCc0ByTmdbId } from "@/lib/mux/client";
import { tmdb } from "@/lib/tmdb/client";
import { getOrSyncTitle } from "@/lib/tmdb/sync";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

interface PageProps {
  params: Promise<{ tmdb_id: string }>;
}

export default function WatchPage({ params }: PageProps) {
  return (
    <main className="min-h-dvh pb-24">
      <AppChrome />
      <Suspense fallback={<WatchSkeleton />}>
        <WatchSurface params={params} />
      </Suspense>
    </main>
  );
}

function WatchSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-6 pt-28">
      <div className="w-full aspect-video rounded-2xl bg-white/5 animate-pulse" />
    </div>
  );
}

async function WatchSurface({ params }: PageProps) {
  const { tmdb_id } = await params;
  const tmdbId = Number(tmdb_id);
  if (!Number.isFinite(tmdbId)) notFound();

  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    redirect("/profiles");
  }

  const title = await getOrSyncTitle(tmdbId);
  if (!title) notFound();

  const posterUrl = title.posterPath ? `https://image.tmdb.org/t/p/w780${title.posterPath}` : null;

  // CC0 first (themed Mux player); otherwise the YouTube trailer.
  const cc0 = await getCc0ByTmdbId(tmdbId);

  let trailerKey: string | null = null;
  if (!cc0) {
    try {
      const fresh = await tmdb.movie(tmdbId);
      trailerKey = tmdb.pickTrailer(fresh?.videos?.results)?.key ?? null;
    } catch {
      trailerKey = null;
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-6 pt-28">
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.28em] uppercase text-[var(--color-accent)]">
            {cc0 ? "Now playing · CC0" : trailerKey ? "Trailer" : "Watch"}
          </p>
          <h1
            className="mt-1 text-2xl md:text-3xl font-[var(--font-display)] tracking-tight"
            style={{ letterSpacing: "-0.025em" }}
          >
            {title.title}
          </h1>
        </div>
        <Link
          href={`/title/${tmdbId}`}
          className="shrink-0 text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink-0)] transition-colors"
        >
          ← Back to detail
        </Link>
      </div>

      {cc0 ? (
        <WatchPlayer
          kind="mux"
          playbackId={cc0.muxPlaybackId}
          title={title.title}
          poster={posterUrl}
        />
      ) : trailerKey ? (
        <WatchPlayer kind="youtube" youtubeKey={trailerKey} title={title.title} />
      ) : (
        <div className="w-full aspect-video rounded-2xl ring-1 ring-white/10 bg-black/40 flex items-center justify-center text-center px-6">
          <p className="text-sm text-[var(--color-ink-2)] max-w-prose">
            No stream or trailer is available for this title yet. Public-domain films in
            Lumen&apos;s CC0 catalog play here in full.
          </p>
        </div>
      )}

      {cc0 && (
        <p className="mt-4 text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
          Public domain · streamed via Mux
        </p>
      )}
    </section>
  );
}
