/**
 * Title detail (SPEC §4.1 + §14 Week 2).
 *
 *   Hero (poster + backdrop, title, year, runtime, rating, genres)
 *   Synopsis + tagline
 *   Trailer (YouTube via TMDB /videos)
 *   Cast (top-billed 12 from /credits)
 *   Crew (director, writer, DP, composer)
 *   More Like This (pgvector cosine on titles.embedding; genre fallback)
 *   Vibrant palette tints the surrounding chrome.
 */

import { AppChrome } from "@/components/chrome/AppChrome";
import { GlassCard } from "@/components/glass";
import { JournalComposer } from "@/components/journal/JournalComposer";
import { HorizontalScroller } from "@/components/title/HorizontalScroller";
import { type SeasonSummaryVM, SeasonsBrowser } from "@/components/title/SeasonsBrowser";
import { TitlePreviewCard } from "@/components/title/TitlePreviewCard";
import { WhyCard, WhyCardSkeleton } from "@/components/title/WhyCard";
import { WatchlistButton } from "@/components/watchlist/WatchlistButton";
import { getActiveProfileId } from "@/lib/auth/active-profile";
import { getSimilarTitlesByEmbedding, getSimilarTitlesByGenre } from "@/lib/db/queries";
import type { Title } from "@/lib/db/schema";
import { backdropUrl as backdropSrc, posterUrl as posterSrc } from "@/lib/img/poster";
import { getCc0ByTmdbId } from "@/lib/mux/client";
import { type TmdbCastMember, type TmdbCrewMember, tmdb } from "@/lib/tmdb/client";
import { getOrSyncTitle } from "@/lib/tmdb/sync";
import { isInWatchlist } from "@/lib/watchlist/service";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface PageProps {
  params: Promise<{ tmdb_id: string }>;
}

export default function TitlePage({ params }: PageProps) {
  return (
    <Suspense fallback={<TitleSkeleton />}>
      <TitleDetail params={params} />
    </Suspense>
  );
}

function TitleSkeleton() {
  return (
    <main className="min-h-dvh">
      <div className="h-[64dvh] bg-[var(--color-surface-1)] animate-pulse" />
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <div className="h-48 rounded-2xl bg-white/5 animate-pulse" />
        <div className="h-72 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    </main>
  );
}

async function TitleDetail({ params }: PageProps) {
  const { tmdb_id } = await params;
  const tmdbId = Number(tmdb_id);
  if (!Number.isFinite(tmdbId)) notFound();

  // Hit TMDB up front so we have videos/credits even if our DB row was pre-seeded
  // without them. Local DB row provides the palette + internal UUID.
  const [row, fresh, activeProfileId] = await Promise.all([
    getOrSyncTitle(tmdbId),
    tmdb.movie(tmdbId).catch(() => null),
    getActiveProfileId(),
  ]);

  // Watchlist state — only needed when both the DB row and active profile exist.
  const inWatchlist =
    row?.id && activeProfileId
      ? await isInWatchlist(activeProfileId, row.id).catch(() => false)
      : false;

  if (!row && !fresh) notFound();

  const t: TitleViewModel = projectTitle(row, fresh);

  const trailer = tmdb.pickTrailer(fresh?.videos?.results);
  const cc0 = await getCc0ByTmdbId(tmdbId).catch(() => null);
  const cc0Available = Boolean(cc0);
  const cast = (fresh?.credits?.cast ?? []).slice(0, 12);
  const crew = extractHeadlineCrew(fresh?.credits?.crew ?? []);

  // More-Like-This: pgvector if we have an embedding + internal id, else genre fallback.
  let similar: Title[] = [];
  if (row?.id) {
    similar = await getSimilarTitlesByEmbedding(row.id, 12);
    if (similar.length < 6) {
      const genreFallback = await getSimilarTitlesByGenre(row.id, 12);
      const seen = new Set(similar.map((s) => s.id));
      for (const g of genreFallback) {
        if (!seen.has(g.id)) similar.push(g);
        if (similar.length >= 12) break;
      }
    }
  }

  // TV titles → fetch the season list for the Prime-style browser. Movies
  // skip this entirely (zero overhead, unchanged path).
  const isTv = row?.type === "tv" && tmdbId > 0;
  let tvSeasons: SeasonSummaryVM[] = [];
  if (isTv) {
    const tv = await tmdb.tv(tmdbId).catch(() => null);
    tvSeasons = (tv?.seasons ?? [])
      .filter((s) => s.episode_count > 0)
      .map((s) => ({
        seasonNumber: s.season_number,
        name: s.name,
        episodeCount: s.episode_count,
        posterPath: s.poster_path,
        airYear: s.air_date ? Number(s.air_date.slice(0, 4)) : null,
      }));
  }

  const tint = t.dominantColor;
  const backdropUrl = backdropSrc(t.backdropPath, "original");
  const posterUrl = posterSrc(t.posterPath, "w500");

  return (
    <main
      className="min-h-dvh pb-24"
      style={tint ? ({ "--color-content-tint": tint } as React.CSSProperties) : undefined}
    >
      <AppChrome />

      {/* Hero — cinematic backdrop with ken-burns + triple gradient stack */}
      <section className="relative h-[75dvh] min-h-[520px] w-full overflow-hidden">
        {backdropUrl && (
          <div className="absolute inset-0 ken-burns-slow will-change-transform">
            <Image
              src={backdropUrl}
              alt={t.title}
              fill
              sizes="100vw"
              priority
              className="object-cover"
            />
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[var(--color-surface-0)] via-[var(--color-surface-0)]/55 to-transparent" />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[var(--color-surface-0)]/85 via-[var(--color-surface-0)]/15 to-transparent" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(72% 56% at 10% 78%, color-mix(in oklab, var(--color-content-tint) 22%, transparent), transparent 65%)",
          }}
        />
        <div className="relative h-full flex items-end z-10">
          <div className="w-full px-6 md:px-12 pb-14 md:pb-20 flex gap-8 items-end">
            {posterUrl && (
              <div className="hidden md:block w-52 shrink-0 rounded-2xl overflow-hidden shadow-[0_30px_80px_-20px_oklch(0_0_0_/_0.6)] ring-1 ring-white/10">
                <Image
                  src={posterUrl}
                  alt={t.title}
                  width={400}
                  height={600}
                  className="object-cover w-full h-auto"
                  priority
                />
              </div>
            )}
            <div className="max-w-2xl">
              <h1
                className="text-2xl sm:text-4xl md:text-6xl font-[var(--font-display)] tracking-tight leading-[1.04]"
                style={{ letterSpacing: "-0.025em" }}
              >
                {t.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-ink-2)] uppercase tracking-widest">
                {t.releaseYear && <span>{t.releaseYear}</span>}
                {t.runtimeMin && <span>{t.runtimeMin}m</span>}
                {t.voteAverageText && (
                  <span className="inline-flex items-center gap-1 text-[var(--color-accent)]">
                    <span aria-hidden>★</span>
                    {t.voteAverageText}
                  </span>
                )}
                {t.genres.slice(0, 3).map((g) => (
                  <span key={g} className="opacity-90">
                    {g}
                  </span>
                ))}
              </div>
              {row?.id && activeProfileId && (
                <div className="mt-5">
                  <WatchlistButton titleUuid={row.id} initialInWatchlist={inWatchlist} />
                </div>
              )}
              {t.tagline && (
                <p className="mt-5 text-base md:text-lg italic text-[var(--color-ink-1)] max-w-prose leading-relaxed">
                  &ldquo;{t.tagline}&rdquo;
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Synopsis */}
      <section className="mx-auto max-w-5xl px-6 md:px-10 py-10">
        <GlassCard>
          <h2 className="text-xs tracking-[0.22em] uppercase text-[var(--color-accent)]">
            Synopsis
          </h2>
          <p className="mt-3 text-base md:text-lg leading-relaxed text-[var(--color-ink-1)] max-w-prose">
            {t.overview || "No overview available."}
          </p>
        </GlassCard>
      </section>

      {/* TV — Prime-style seasons & episodes (only for series). */}
      {isTv && tvSeasons.length > 0 && <SeasonsBrowser tvId={tmdbId} seasons={tvSeasons} />}

      {/* Why this, for you — Pillar 2 (AI Taste). Streams independently so
       * the rest of the page paints without waiting on Gemini. */}
      {row?.id && (
        <Suspense fallback={<WhyCardSkeleton />}>
          <WhyCard titleUuid={row.id} />
        </Suspense>
      )}

      {/* Echo Journal composer — Pillar 3. Only rendered when there's an
       * active profile (we'd have no profile_id to attach the entry to). */}
      {row?.id && activeProfileId && <JournalComposer titleUuid={row.id} />}

      {/* "Watch now" — ONLY when the title is actually playable (CC0 full
       * film via the themed player). The trailer below is always shown when
       * available, independent of this. */}
      {cc0Available && (
        <section className="mx-auto max-w-5xl px-6 md:px-10 py-6">
          <Link
            href={`/title/${tmdbId}/watch`}
            className="inline-flex items-center gap-2 min-h-[44px] px-6 rounded-full text-sm bg-[var(--color-accent)] text-black ring-1 ring-[var(--color-accent)] hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-accent)]/40"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              role="img"
              className="w-4 h-4"
            >
              <title>Play</title>
              <path d="M8 5v14l11-7z" />
            </svg>
            Watch now
          </Link>
        </section>
      )}

      {/* Trailer inline preview — always shown when a trailer exists, for
       * both watchable and non-watchable titles. */}
      {trailer && (
        <section className="mx-auto max-w-5xl px-6 md:px-10 py-8">
          <h2 className="text-xs tracking-[0.22em] uppercase text-[var(--color-accent)] mb-3">
            Trailer
          </h2>
          <div className="relative aspect-video rounded-2xl overflow-hidden glass-thin">
            <iframe
              title={`${t.title} trailer`}
              src={tmdb.youtube(trailer.key)}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      )}

      {/* Cast */}
      {cast.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 md:px-10 py-10">
          <h2 className="text-xs tracking-[0.22em] uppercase text-[var(--color-accent)] mb-4">
            Cast
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {cast.map((c) => (
              <CastTile key={`${c.id}-${c.credit_id ?? c.cast_id}`} member={c} />
            ))}
          </ul>
        </section>
      )}

      {/* Crew */}
      {crew.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 md:px-10 py-6">
          <h2 className="text-xs tracking-[0.22em] uppercase text-[var(--color-accent)] mb-3">
            Crew
          </h2>
          <GlassCard>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {crew.map((m) => (
                <div
                  key={`${m.id}-${m.job}`}
                  className="flex justify-between items-baseline gap-4 border-b border-white/5 pb-2"
                >
                  <dt className="text-[var(--color-ink-2)]">{m.job}</dt>
                  <dd className="text-[var(--color-ink-0)] text-right">
                    <Link
                      href={`/person/${m.id}`}
                      className="hover:text-[var(--color-accent)] transition-colors"
                    >
                      {m.name}
                    </Link>
                  </dd>
                </div>
              ))}
            </dl>
          </GlassCard>
        </section>
      )}

      {/* More Like This — infinite-loop scroller w/ hover arrows */}
      {similar.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 md:px-10 py-10">
          <h2 className="text-xs tracking-[0.22em] uppercase text-[var(--color-accent)] mb-4">
            More like this
          </h2>
          <HorizontalScroller ariaLabel="More like this" loop>
            {similar.map((s) => (
              <div key={s.id} data-scroller-item className="snap-start shrink-0">
                <TitlePreviewCard
                  data={{
                    tmdbId: s.tmdbId,
                    title: s.title,
                    posterPath: s.posterPath,
                    releaseYear: s.releaseYear ?? null,
                    runtimeMin: s.runtimeMin ?? null,
                    voteAverage: s.voteAverage ?? null,
                    overview: s.overview ?? null,
                    genres: (s.genres as string[] | null) ?? null,
                  }}
                />
              </div>
            ))}
          </HorizontalScroller>
        </section>
      )}
    </main>
  );
}

interface TitleViewModel {
  title: string;
  releaseYear: number | null;
  runtimeMin: number | null;
  overview: string | null;
  tagline: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverageText: string | null;
  genres: string[];
  dominantColor: string | null;
}

function projectTitle(
  row: Title | null,
  fresh: Awaited<ReturnType<typeof tmdb.movie>> | null,
): TitleViewModel {
  const title = row?.title ?? fresh?.title ?? "Unknown";
  const release =
    row?.releaseYear ?? (fresh?.release_date ? Number(fresh.release_date.slice(0, 4)) : null);
  const runtime = row?.runtimeMin ?? fresh?.runtime ?? null;
  const overview = row?.overview ?? fresh?.overview ?? null;
  const tagline = row?.tagline ?? fresh?.tagline ?? null;
  const poster = row?.posterPath ?? fresh?.poster_path ?? null;
  const backdrop = row?.backdropPath ?? fresh?.backdrop_path ?? null;
  const voteAverage =
    typeof row?.voteAverage === "number" && row.voteAverage > 0
      ? row.voteAverage / 10
      : (fresh?.vote_average ?? null);
  const voteAverageText = voteAverage ? voteAverage.toFixed(1) : null;
  const genres =
    (row?.genres as string[] | null | undefined) ?? fresh?.genres?.map((g) => g.name) ?? [];
  const palette = row?.vibrantPalette as
    | { dominant?: string | null; vibrant?: string | null }
    | null
    | undefined;
  const dominantColor = palette?.dominant ?? palette?.vibrant ?? null;
  return {
    title,
    releaseYear: release,
    runtimeMin: runtime,
    overview,
    tagline,
    posterPath: poster,
    backdropPath: backdrop,
    voteAverageText,
    genres,
    dominantColor,
  };
}

function CastTile({ member }: { member: TmdbCastMember }) {
  const photo = tmdb.profile(member.profile_path, "w185");
  return (
    <li className="text-center">
      <Link href={`/person/${member.id}`} className="block group">
        <div className="aspect-[2/3] relative rounded-xl overflow-hidden bg-[var(--color-surface-2)] group-hover:scale-[1.03] transition-transform duration-300">
          {photo ? (
            <Image
              src={photo}
              alt={member.name}
              fill
              sizes="160px"
              className="object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--color-ink-3)] uppercase tracking-widest">
              {member.name.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="mt-2 text-sm tracking-tight text-[var(--color-ink-0)] line-clamp-1">
          {member.name}
        </div>
        {member.character && (
          <div className="text-[11px] text-[var(--color-ink-2)] line-clamp-1">
            {member.character}
          </div>
        )}
      </Link>
    </li>
  );
}

function extractHeadlineCrew(
  crew: TmdbCrewMember[],
): Array<{ id: number; name: string; job: string }> {
  const wanted = [
    "Director",
    "Screenplay",
    "Writer",
    "Story",
    "Director of Photography",
    "Original Music Composer",
    "Editor",
  ];
  const out: Array<{ id: number; name: string; job: string }> = [];
  const seen = new Set<string>();
  for (const job of wanted) {
    for (const m of crew) {
      if (m.job === job) {
        const key = `${m.id}-${m.job}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ id: m.id, name: m.name, job });
      }
    }
  }
  return out.slice(0, 8);
}
