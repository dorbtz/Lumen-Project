"use client";

/**
 * Cc0SeasonsBrowser — season-tabbed picker for CC0 *watchable* series.
 *
 * Same Prime-style look as SeasonsBrowser, but every episode is a real
 * playable CC0 stream: each card links to /title/<id>/watch?ep=<index>
 * and carries the ✓ watched / ◐ resume / ▶ play state from watch_progress
 * (server-supplied, no client fetching). Seasons are parsed from the
 * episode labels ("02x01 …"); a flat collection (no season tokens) renders
 * as one ungrouped grid. TMDB episode stills are shown when available.
 */

import type { Cc0EpisodeVM, EpisodeProgress } from "@/lib/watch/episodes";
import { cleanEpisodeName } from "@/lib/watch/episode-format";
import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";

const STILL = "https://image.tmdb.org/t/p/w400";

function fmt(sec: number | null): string {
  if (!sec || sec <= 0) return "";
  const m = Math.round(sec / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function Cc0SeasonsBrowser({
  tmdbId,
  episodes,
  progress,
}: {
  tmdbId: number;
  episodes: Cc0EpisodeVM[];
  progress: Record<number, EpisodeProgress>;
}) {
  // Group by parsed season. `null` season → bucket key -1 ("Extras") only
  // when other real seasons exist; if everything is null we go flat.
  const { seasons, bySeason, flat } = useMemo(() => {
    const map = new Map<number, Cc0EpisodeVM[]>();
    for (const e of episodes) {
      const k = e.season ?? -1;
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
    }
    const realSeasons = [...map.keys()].filter((k) => k >= 0).sort((a, b) => a - b);
    const isFlat = realSeasons.length < 2;
    const keys = isFlat ? [] : [...realSeasons, ...(map.has(-1) ? [-1] : [])];
    return { seasons: keys, bySeason: map, flat: isFlat };
  }, [episodes]);

  const [active, setActive] = useState<number>(seasons[0] ?? -1);

  if (episodes.length === 0) return null;

  const shown = flat ? episodes : (bySeason.get(active) ?? []);
  const seasonLabel = (k: number) => (k === -1 ? "Extras" : `Season ${k}`);

  return (
    <section className="mx-auto max-w-6xl px-6 md:px-10 py-10">
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <h2 className="text-xs tracking-[0.22em] uppercase text-[var(--color-accent)]">
          Episodes · watch free
        </h2>
        <p className="text-[11px] uppercase tracking-widest text-[var(--color-ink-3)]">
          {flat
            ? `${episodes.length} episode${episodes.length === 1 ? "" : "s"}`
            : `${seasons.length} season${seasons.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {!flat && (
        <div className="flex flex-wrap gap-2.5 mb-5">
          {seasons.map((k) => {
            const on = k === active;
            const n = (bySeason.get(k) ?? []).length;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setActive(k)}
                aria-pressed={on}
                className={`flex flex-col justify-center min-h-[52px] rounded-2xl px-4 py-2 text-left ring-1 transition-colors ${
                  on
                    ? "bg-[var(--color-accent)]/15 ring-[var(--color-accent)]/60 text-[var(--color-ink-0)]"
                    : "bg-white/5 ring-white/10 text-[var(--color-ink-2)] hover:bg-white/10"
                }`}
              >
                <span className="block text-sm font-[var(--font-display)] tracking-tight leading-tight whitespace-nowrap">
                  {seasonLabel(k)}
                </span>
                <span className="block mt-0.5 text-[10px] uppercase tracking-widest text-[var(--color-ink-3)] leading-tight whitespace-nowrap">
                  {n} ep{n === 1 ? "" : "s"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        {shown.map((e) => {
          const p = progress[e.episodeIndex];
          const completed = Boolean(p?.completed);
          const dur = p?.durationSec ?? e.durationSec ?? null;
          const pct =
            !completed && p && p.positionSec > 0 && dur && dur > 0
              ? Math.min(100, Math.round((p.positionSec / dur) * 100))
              : 0;
          const inProgress = !completed && pct > 0;
          const name = cleanEpisodeName(e.label);
          const epNo = e.episodeInSeason ?? e.episodeIndex;

          return (
            <Link
              key={e.episodeIndex}
              href={`/title/${tmdbId}/watch?ep=${e.episodeIndex}${tmdbId > 0 ? "&type=tv" : ""}`}
              aria-label={`Play ${name}${completed ? " (watched)" : inProgress ? " (resume)" : ""}`}
              className={`group block rounded-2xl overflow-hidden ring-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                completed
                  ? "ring-[var(--color-accent)]/60 bg-[var(--color-accent)]/12 hover:bg-[var(--color-accent)]/18"
                  : "ring-white/8 bg-white/[0.03] hover:bg-white/[0.07]"
              }`}
            >
              <div className="relative aspect-video bg-[var(--color-surface-2)]">
                {e.stillPath ? (
                  <Image
                    src={`${STILL}${e.stillPath}`}
                    alt={name}
                    fill
                    sizes="(max-width:640px) 100vw, 360px"
                    className="object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-[var(--color-ink-3)] text-xs">
                    Public domain
                  </span>
                )}
                <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white">
                  E{epNo}
                </span>
                <span className="absolute right-2 top-2 text-[10px] uppercase tracking-widest">
                  {completed ? (
                    <span className="rounded-md bg-[var(--color-accent)] px-1.5 py-0.5 text-black">
                      ✓
                    </span>
                  ) : inProgress ? (
                    <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[var(--color-accent)]">
                      ◐ Resume
                    </span>
                  ) : (
                    <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      ▶ Play
                    </span>
                  )}
                </span>
                {inProgress && (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15" aria-hidden="true">
                    <div
                      className="h-full bg-[var(--color-accent)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm tracking-tight text-[var(--color-ink-0)] line-clamp-2">
                  {name}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
                  {fmt(dur) || "Watch free"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
