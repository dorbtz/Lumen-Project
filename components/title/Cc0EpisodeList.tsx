/**
 * Cc0EpisodeList — playable-episode picker for CC0 *series* (Archive.org
 * items with many video files). Rendered on the title page in place of the
 * lone "Watch now" when `cc0_episodes` rows exist.
 *
 * Three button states from `watch_progress` (server-supplied, no client JS):
 *   ✓ completed  → accent fill
 *   ◐ in progress → "Resume" + thin progress bar
 *   ▶ not started → default glass
 */

import type { Cc0EpisodeVM, EpisodeProgress } from "@/lib/watch/episodes";
import Link from "next/link";

function fmt(sec: number | null): string {
  if (!sec || sec <= 0) return "";
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function Cc0EpisodeList({
  tmdbId,
  episodes,
  progress,
}: {
  tmdbId: number;
  episodes: Cc0EpisodeVM[];
  progress: Record<number, EpisodeProgress>;
}) {
  if (episodes.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 md:px-10 py-10">
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <h2 className="text-xs tracking-[0.22em] uppercase text-[var(--color-accent)]">
          Episodes · watch free
        </h2>
        <p className="text-[11px] uppercase tracking-widest text-[var(--color-ink-3)]">
          {episodes.length} episode{episodes.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        {episodes.map((e) => {
          const p = progress[e.episodeIndex];
          const completed = Boolean(p?.completed);
          const dur = p?.durationSec ?? e.durationSec ?? null;
          const pct =
            !completed && p && p.positionSec > 0 && dur && dur > 0
              ? Math.min(100, Math.round((p.positionSec / dur) * 100))
              : 0;
          const inProgress = !completed && pct > 0;

          return (
            <Link
              key={e.episodeIndex}
              href={`/title/${tmdbId}/watch?ep=${e.episodeIndex}`}
              aria-label={`Play ${e.label}${completed ? " (watched)" : inProgress ? " (resume)" : ""}`}
              className={`group block rounded-2xl overflow-hidden ring-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                completed
                  ? "ring-[var(--color-accent)]/60 bg-[var(--color-accent)]/12 hover:bg-[var(--color-accent)]/18"
                  : "ring-white/8 bg-white/[0.03] hover:bg-white/[0.07]"
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center justify-center min-w-[2.25rem] h-7 px-2 rounded-md text-[11px] font-semibold tracking-wider ${
                      completed
                        ? "bg-[var(--color-accent)] text-black"
                        : "bg-white/10 text-[var(--color-ink-1)]"
                    }`}
                  >
                    E{e.episodeIndex}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
                    {completed ? (
                      <span className="text-[var(--color-accent)]">✓ Watched</span>
                    ) : inProgress ? (
                      <span className="text-[var(--color-accent)]">◐ Resume</span>
                    ) : (
                      <span className="opacity-80 group-hover:opacity-100">▶ Play</span>
                    )}
                  </span>
                </div>
                <p className="mt-3 text-sm tracking-tight text-[var(--color-ink-0)] line-clamp-2">
                  {e.label}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-widest text-[var(--color-ink-3)]">
                  {fmt(dur) || "Public domain"}
                </p>
                {inProgress && (
                  <div
                    className="mt-3 h-1 rounded-full bg-white/10 overflow-hidden"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
