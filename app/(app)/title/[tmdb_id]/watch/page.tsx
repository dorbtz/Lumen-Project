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
import { posterUrl } from "@/lib/img/poster";
import { getCc0ByTmdbId } from "@/lib/mux/client";
import { tmdb } from "@/lib/tmdb/client";
import { getOrSyncTitle } from "@/lib/tmdb/sync";
import {
  type EpisodeProgress,
  getCc0Episodes,
  getWatchProgressForTitle,
} from "@/lib/watch/episodes";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

interface PageProps {
  params: Promise<{ tmdb_id: string }>;
  searchParams: Promise<{ ep?: string }>;
}

export default function WatchPage({ params, searchParams }: PageProps) {
  return (
    <main className="min-h-dvh pb-24">
      <AppChrome />
      <Suspense fallback={<WatchSkeleton />}>
        <WatchSurface params={params} searchParams={searchParams} />
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

async function WatchSurface({ params, searchParams }: PageProps) {
  const { tmdb_id } = await params;
  const { ep } = await searchParams;
  const tmdbId = Number(tmdb_id);
  if (!Number.isFinite(tmdbId)) notFound();

  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    redirect("/profiles");
  }

  const title = await getOrSyncTitle(tmdbId);
  if (!title) notFound();

  const poster = posterUrl(title.posterPath, "w780");

  // CC0 first (themed Mux player); otherwise the YouTube trailer.
  const cc0 = await getCc0ByTmdbId(tmdbId);

  // CC0 *series* — if a specific episode was requested (?ep=N) play that
  // file; otherwise (movie / single file) episodeIndex 0 tracks the title.
  const epNum = ep != null && /^\d+$/.test(ep) ? Number(ep) : null;
  const episodes = cc0 ? await getCc0Episodes(tmdbId).catch(() => []) : [];
  const activeEpisode =
    epNum != null ? (episodes.find((e) => e.episodeIndex === epNum) ?? null) : null;
  const trackedIndex = activeEpisode ? activeEpisode.episodeIndex : 0;

  // Resume position for the stream we're about to play.
  const progressMap: Record<number, EpisodeProgress> = cc0
    ? await getWatchProgressForTitle(profileId, tmdbId).catch(() => ({}))
    : {};
  const resumeAt = progressMap[trackedIndex]?.positionSec ?? 0;
  const progressCtx = cc0 ? { tmdbId, episodeIndex: trackedIndex, startAt: resumeAt } : undefined;

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
          {activeEpisode && (
            <p className="mt-1 text-sm text-[var(--color-ink-2)]">
              E{activeEpisode.episodeIndex} · {activeEpisode.label}
            </p>
          )}
        </div>
        <Link
          href={`/title/${tmdbId}`}
          className="shrink-0 text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink-0)] transition-colors"
        >
          ← Back to detail
        </Link>
      </div>

      {activeEpisode ? (
        <WatchPlayer
          kind="direct"
          src={activeEpisode.streamUrl}
          title={title.title}
          poster={poster}
          progress={progressCtx}
        />
      ) : cc0?.streamUrl && cc0.source !== "mux" ? (
        <WatchPlayer
          kind="direct"
          src={cc0.streamUrl}
          title={title.title}
          poster={poster}
          progress={progressCtx}
        />
      ) : cc0?.muxPlaybackId ? (
        <WatchPlayer
          kind="mux"
          playbackId={cc0.muxPlaybackId}
          title={title.title}
          poster={poster}
          progress={progressCtx}
        />
      ) : trailerKey ? (
        <WatchPlayer kind="youtube" youtubeKey={trailerKey} title={title.title} />
      ) : (
        <div className="w-full aspect-video rounded-2xl ring-1 ring-white/10 bg-black/40 flex items-center justify-center text-center px-6">
          <p className="text-sm text-[var(--color-ink-2)] max-w-prose">
            No stream or trailer is available for this title yet. Public-domain films in
            Lumen&apos;s catalog play here in full.
          </p>
        </div>
      )}

      {cc0 && (
        <p className="mt-4 text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
          Public domain ·{" "}
          {cc0.source === "archive"
            ? "streamed from the Internet Archive"
            : cc0.source === "wikimedia"
              ? "streamed from Wikimedia"
              : "streamed via Mux"}
        </p>
      )}
    </section>
  );
}
