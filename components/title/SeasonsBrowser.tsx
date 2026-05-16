"use client";

/**
 * SeasonsBrowser — Prime-style seasons + episodes for TV titles.
 *
 * A row of season pills (name · episode count). Selecting a season opens a
 * glass drawer that lazily fetches that season's episodes (server action)
 * and lays them out as still-image cards — the same horizontal-row feel as
 * the home screen. Clicking an episode expands its synopsis.
 */

import { type EpisodeVM, loadSeasonAction } from "@/app/(app)/title/[tmdb_id]/tv-actions";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";

export interface SeasonSummaryVM {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  posterPath: string | null;
  airYear: number | null;
}

const STILL = "https://image.tmdb.org/t/p/w400";
const POSTER = "https://image.tmdb.org/t/p/w185";

export function SeasonsBrowser({
  tvId,
  seasons,
}: {
  tvId: number;
  seasons: SeasonSummaryVM[];
}) {
  // Specials (season 0) always sort to the END (rightmost), after the last
  // numbered season. Everything else ascending.
  const sorted = [...seasons].sort((a, b) => {
    const ax = a.seasonNumber === 0 ? Number.POSITIVE_INFINITY : a.seasonNumber;
    const bx = b.seasonNumber === 0 ? Number.POSITIVE_INFINITY : b.seasonNumber;
    return ax - bx;
  });
  const labelFor = (s: SeasonSummaryVM) =>
    s.seasonNumber === 0 ? "Specials" : s.name || `Season ${s.seasonNumber}`;
  // Default to the first numbered season that has episodes (not Specials).
  const first =
    sorted.find((s) => s.seasonNumber !== 0 && s.episodeCount > 0) ??
    sorted.find((s) => s.episodeCount > 0) ??
    sorted[0];
  const [active, setActive] = useState<number | null>(first?.seasonNumber ?? null);
  const [cache, setCache] = useState<Record<number, EpisodeVM[]>>({});
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<number | null>(null); // expanded episode
  const reduce = useReducedMotion();
  const requested = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (active == null || requested.current.has(active) || cache[active]) return;
    requested.current.add(active);
    startTransition(async () => {
      const eps = await loadSeasonAction(tvId, active);
      setCache((c) => ({ ...c, [active]: eps }));
    });
  }, [active, tvId, cache]);

  if (seasons.length === 0) return null;
  const episodes = active != null ? (cache[active] ?? []) : [];
  const activeSeason = seasons.find((s) => s.seasonNumber === active);

  return (
    <section className="mx-auto max-w-6xl px-6 md:px-10 py-10">
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <h2 className="text-xs tracking-[0.22em] uppercase text-[var(--color-accent)]">
          Seasons & episodes
        </h2>
        <p className="text-[11px] uppercase tracking-widest text-[var(--color-ink-3)]">
          {seasons.length} season{seasons.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Season pills — wrap instead of horizontal-scroll so none get
          clipped; Specials sits last. */}
      <div className="flex flex-wrap gap-2.5">
        {sorted.map((s) => {
          const on = s.seasonNumber === active;
          return (
            <button
              key={s.seasonNumber}
              type="button"
              onClick={() => {
                setActive(s.seasonNumber);
                setOpen(null);
              }}
              aria-pressed={on}
              className={`flex flex-col justify-center min-h-[52px] rounded-2xl px-4 py-2 text-left ring-1 transition-colors ${
                on
                  ? "bg-[var(--color-accent)]/15 ring-[var(--color-accent)]/60 text-[var(--color-ink-0)]"
                  : "bg-white/5 ring-white/10 text-[var(--color-ink-2)] hover:bg-white/10"
              }`}
            >
              <span className="block text-sm font-[var(--font-display)] tracking-tight leading-tight whitespace-nowrap">
                {labelFor(s)}
              </span>
              <span className="block mt-0.5 text-[10px] uppercase tracking-widest text-[var(--color-ink-3)] leading-tight whitespace-nowrap">
                {s.episodeCount} ep{s.episodeCount === 1 ? "" : "s"}
                {s.airYear ? ` · ${s.airYear}` : ""}
              </span>
            </button>
          );
        })}
      </div>

      {/* Episode drawer */}
      <div className="mt-5 rounded-3xl glass-thin ring-1 ring-white/5 p-4 md:p-6">
        <div className="flex items-center gap-4 mb-4">
          {activeSeason?.posterPath && (
            <div className="hidden sm:block w-14 shrink-0 rounded-lg overflow-hidden ring-1 ring-white/10">
              <Image
                src={`${POSTER}${activeSeason.posterPath}`}
                alt={labelFor(activeSeason)}
                width={185}
                height={278}
                className="object-cover w-full h-auto"
              />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-base font-[var(--font-display)] tracking-tight">
              {activeSeason ? labelFor(activeSeason) : `Season ${active}`}
            </p>
            <p className="text-[11px] uppercase tracking-widest text-[var(--color-ink-3)]">
              {pending && episodes.length === 0
                ? "Loading episodes…"
                : `${episodes.length} episode${episodes.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        {episodes.length === 0 && !pending ? (
          <p className="py-8 text-center text-sm text-[var(--color-ink-3)]">
            No episode data for this season.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {episodes.map((e) => {
              const expanded = open === e.episodeNumber;
              return (
                <button
                  key={e.episodeNumber}
                  type="button"
                  onClick={() => setOpen(expanded ? null : e.episodeNumber)}
                  className={`text-left rounded-2xl overflow-hidden ring-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                    expanded
                      ? "ring-[var(--color-accent)]/50 bg-white/[0.07]"
                      : "ring-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="relative aspect-video bg-[var(--color-surface-2)]">
                    {e.stillPath ? (
                      <Image
                        src={`${STILL}${e.stillPath}`}
                        alt={e.name}
                        fill
                        sizes="(max-width:640px) 100vw, 360px"
                        className="object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-[var(--color-ink-3)] text-xs">
                        No still
                      </span>
                    )}
                    <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white">
                      E{e.episodeNumber}
                    </span>
                  </div>
                  <div className="p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm tracking-tight text-[var(--color-ink-0)] truncate">
                        {e.name}
                      </p>
                      {e.runtime ? (
                        <span className="shrink-0 text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
                          {e.runtime}m
                        </span>
                      ) : null}
                    </div>
                    {e.overview && (
                      <p
                        className={`mt-1.5 text-[12px] leading-snug text-[var(--color-ink-2)] ${
                          expanded ? "" : "line-clamp-2"
                        }`}
                      >
                        {e.overview}
                      </p>
                    )}
                    <AnimatePresence>
                      {expanded && (e.airDate || e.rating) && (
                        <motion.div
                          initial={reduce ? false : { opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={reduce ? undefined : { opacity: 0, height: 0 }}
                          className="mt-2 flex items-center gap-3 text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]"
                        >
                          {e.airDate && <span>{e.airDate}</span>}
                          {e.rating != null && (
                            <span className="text-[var(--color-accent)]">★ {e.rating}</span>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
