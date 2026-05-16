"use client";

/**
 * TimeBox — runtime-budget discovery (SPEC_COMPLETION §1 A1, SPEC §3.1 #5).
 *
 *   "I have ___ minutes" → glass slider + preset chips (90 / 120 / 150 /
 *   custom). Debounced server action `searchByTimeboxAction(maxMinutes)`
 *   ranks by taste-centroid cosine (existing pgvector path). No LLM.
 *
 * Reuses the Mood Dial result-grid pattern (TitlePreviewCard grid). Below
 * 40 min the spec mandates an empty state.
 */

import { type TimeboxResult, searchByTimeboxAction } from "@/app/(app)/discover/timebox/actions";
import { TitlePreviewCard, type TitlePreviewData } from "@/components/title/TitlePreviewCard";
import { capture } from "@/lib/analytics/events";
import { runtimeCap, runtimeFloor } from "@/lib/discover/timebox-rule";
import { useEffect, useRef, useState, useTransition } from "react";

const PRESETS = [90, 120, 150] as const;
const MIN = 20;
const MAX = 240;
const DEBOUNCE_MS = 220;
const MIN_VIABLE = 40; // spec: empty state below this

export function TimeBox() {
  const [minutes, setMinutes] = useState(120);
  const [results, setResults] = useState<TimeboxResult>({ movies: [], series: [] });
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQuery = useRef<string>("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const key = String(minutes);
      if (key === lastQuery.current) return;
      lastQuery.current = key;
      capture("timebox_search", { minutes });
      startTransition(async () => {
        const next = await searchByTimeboxAction({ maxMinutes: minutes, limit: 24 });
        if (lastQuery.current === key) setResults(next);
      });
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [minutes]);

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const readable = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}` : `${mins}m`;
  const tooShort = minutes < MIN_VIABLE;

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="w-full max-w-xl glass-regular glass-specular rounded-3xl ring-1 ring-white/5 px-6 py-8 sm:px-10">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink-3)]">
            I have
          </p>
          <p
            className="mt-2 text-5xl md:text-6xl font-[var(--font-display)] tracking-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            {readable}
          </p>
          <p className="mt-1 text-sm text-[var(--color-ink-2)]">to watch tonight</p>
        </div>

        <input
          type="range"
          min={MIN}
          max={MAX}
          step={5}
          value={minutes}
          aria-label="Runtime budget in minutes"
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="mt-8 w-full accent-[var(--color-accent)] h-2 cursor-pointer"
        />
        <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
          <span>{MIN}m</span>
          <span>{MAX}m</span>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {PRESETS.map((p) => {
            const active = minutes === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setMinutes(p)}
                className={`min-h-[44px] px-5 rounded-full text-sm transition-colors ring-1 ${
                  active
                    ? "bg-[var(--color-accent)] text-black ring-[var(--color-accent)]"
                    : "bg-white/5 text-[var(--color-ink-2)] ring-white/10 hover:bg-white/10"
                }`}
                aria-pressed={active}
              >
                {p === 90 ? "Quick (90m)" : p === 120 ? "Standard (2h)" : "Epic (2.5h)"}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="text-center text-[10px] uppercase tracking-[0.28em] text-[var(--color-ink-3)]"
        aria-live="polite"
      >
        {tooShort
          ? "Too short for a feature"
          : `Films around ${runtimeFloor(minutes)}–${runtimeCap(minutes)} min`}
        {pending && <span className="ml-2 text-[var(--color-accent)]">…</span>}
      </div>

      <div className="w-full space-y-12">
        {tooShort ? (
          <p className="mt-8 text-sm text-center text-[var(--color-ink-3)]">
            Give it at least 40 minutes — most features need room to breathe.
          </p>
        ) : results.movies.length === 0 && results.series.length === 0 ? (
          <p className="mt-8 text-sm text-center text-[var(--color-ink-3)]">
            {pending ? "Finding what fits…" : "Nothing lands in that runtime — try a wider budget."}
          </p>
        ) : (
          <>
            <TimeboxSection
              label="Movies"
              hint={`${results.movies.length} that fit`}
              items={results.movies}
            />
            <TimeboxSection
              label="Series"
              hint={
                results.series.length > 0
                  ? `${results.series.length} — by episode length`
                  : "No series in this runtime yet"
              }
              items={results.series}
            />
          </>
        )}
      </div>
    </div>
  );
}

function TimeboxSection({
  label,
  hint,
  items,
}: {
  label: string;
  hint: string;
  items: TitlePreviewData[];
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg md:text-xl tracking-tight font-[var(--font-display)]">{label}</h2>
        <p className="text-[11px] uppercase tracking-widest text-[var(--color-ink-3)]">{hint}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-3)]">Nothing here for this runtime.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((r) => (
            <TitlePreviewCard key={r.tmdbId} data={r} posterWidth={170} className="w-full" />
          ))}
        </div>
      )}
    </section>
  );
}
