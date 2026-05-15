"use client";

/**
 * MoodDial — 2D affect-axis discovery surface (SPEC §3.1 Pillar 1).
 *
 *   Horizontal axis: valence — bleak (-1) ↔ joyful (+1)
 *   Vertical axis:   arousal — calm  (-1) ↔ intense (+1)
 *
 * The dial is a draggable glass orb on a square plane with corner gradient
 * tints. Each drag tick (debounced 200ms) fires `searchByMoodAction` and
 * streams results back into a glass card grid.
 *
 * Keyboard / D-pad: arrow keys nudge the orb by a fixed step. Enter scrolls
 * the result grid into view.
 *
 * Mobile: the dial is clamped to min(360, 100vw-80px) so it never overflows
 * a 375px viewport. Orb drag constraints + label positions scale with the
 * actual rendered size tracked via ResizeObserver.
 */

import { searchByMoodAction } from "@/app/(app)/discover/mood/actions";
import {
  TitlePreviewCard,
  type TitlePreviewData,
} from "@/components/title/TitlePreviewCard";
import { motion, useMotionValue, useReducedMotion } from "framer-motion";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

const DIAL_SIZE = 360; // px — desktop square dial (max)
const ORB_SIZE = 44;
const STEP = 0.08;
const DEBOUNCE_MS = 220;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function MoodDial() {
  // Orb's pixel offset from the dial center. We convert this to (-1..1) for
  // the search call.
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Actual rendered dial size — updated by ResizeObserver so drag constraints
  // and coord normalisation use the real painted size, not the CSS max.
  const [dialPx, setDialPx] = useState(DIAL_SIZE);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dialRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ v: number; a: number }>({ v: 0, a: 0 });
  const [results, setResults] = useState<TitlePreviewData[]>([]);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();
  const lastQuery = useRef<string>("");

  // Track the container width so the dial can scale down on narrow screens.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? DIAL_SIZE;
      setDialPx(Math.min(DIAL_SIZE, w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Translate pixel offset → normalized [-1, 1] valence/arousal.
  // Uses the live dialPx so mobile and desktop normalise correctly.
  const updateCoords = useCallback(() => {
    const half = dialPx / 2;
    const xv = x.get();
    const yv = y.get();
    const v = clamp(xv / half, -1, 1);
    const a = clamp(-yv / half, -1, 1);
    setCoords({ v, a });
    return { v, a };
  }, [x, y, dialPx]);

  const fireSearch = useCallback(
    (v: number, a: number) => {
      const key = `${v.toFixed(2)}|${a.toFixed(2)}`;
      if (key === lastQuery.current) return;
      lastQuery.current = key;
      startTransition(async () => {
        const next = await searchByMoodAction({ valence: v, arousal: a, limit: 24 });
        if (lastQuery.current === key) setResults(next);
      });
    },
    [startTransition],
  );

  // Debounced on drag.
  useEffect(() => {
    const unsubX = x.on("change", () => scheduleSearch());
    const unsubY = y.on("change", () => scheduleSearch());
    function scheduleSearch() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const { v, a } = updateCoords();
        fireSearch(v, a);
      }, DEBOUNCE_MS);
    }
    return () => {
      unsubX();
      unsubY();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [x, y, updateCoords, fireSearch]);

  // Initial empty-center query so the grid isn't blank on first paint.
  useEffect(() => {
    fireSearch(0, 0);
  }, [fireSearch]);

  // Arrow-key navigation for the orb (D-pad / keyboard).
  const onOrbKey = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    const half = dialPx / 2;
    const stepPx = STEP * half;
    let dx = 0;
    let dy = 0;
    switch (e.key) {
      case "ArrowLeft":
        dx = -stepPx;
        break;
      case "ArrowRight":
        dx = stepPx;
        break;
      case "ArrowUp":
        dy = -stepPx;
        break;
      case "ArrowDown":
        dy = stepPx;
        break;
      default:
        return;
    }
    e.preventDefault();
    const nx = clamp(x.get() + dx, -half, half);
    const ny = clamp(y.get() + dy, -half, half);
    x.set(nx);
    y.set(ny);
  };

  const half = dialPx / 2;

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Outer wrapper: full container width, lets ResizeObserver measure the
          available space. The dial itself will be at most DIAL_SIZE wide. */}
      <div ref={wrapperRef} className="w-full flex justify-center">
        {/* Dial wrapper — py-10 reserves room for the Intense/Calm labels.
            Width uses CSS clamp so it never overflows on narrow screens. */}
        <div
          className="relative py-10"
          style={{ width: dialPx }}
        >
          {/* Vertical axis labels — above/below the dial, always centred */}
          <Label
            text="Intense"
            className="absolute left-1/2 -translate-x-1/2 top-1 text-[var(--color-accent-secondary)]"
          />
          <Label
            text="Calm"
            className="absolute left-1/2 -translate-x-1/2 bottom-1 text-[var(--color-accent-secondary)]"
          />

          {/* Inner positioning context — dial-sized square */}
          <div
            className="relative mx-auto"
            style={{ width: dialPx, height: dialPx }}
          >
            {/* Dial plane with corner tints */}
            <div
              ref={dialRef}
              className="absolute inset-0 rounded-3xl overflow-hidden glass-regular glass-specular ring-1 ring-white/5"
              style={{
                background: `
                  radial-gradient(60% 60% at 100% 0%, oklch(0.55 0.18 195 / 0.45), transparent 70%),
                  radial-gradient(60% 60% at 0% 100%, oklch(0.50 0.18 160 / 0.35), transparent 70%),
                  radial-gradient(60% 60% at 0% 0%, oklch(0.40 0.12 275 / 0.30), transparent 70%),
                  radial-gradient(60% 60% at 100% 100%, oklch(0.30 0.08 245 / 0.30), transparent 70%)`,
              }}
            >
              {/* Cross-hair guidelines */}
              <div className="absolute inset-x-0 top-1/2 h-px bg-white/5" aria-hidden />
              <div className="absolute inset-y-0 left-1/2 w-px bg-white/5" aria-hidden />

              {/* Horizontal axis labels — inside the dial at the mid-height edges
                  so they never overflow the container on narrow screens. */}
              <Label
                text="Joyful"
                className="absolute top-1/2 -translate-y-1/2 right-2 text-[var(--color-accent)]"
              />
              <Label
                text="Bleak"
                className="absolute top-1/2 -translate-y-1/2 left-2 text-[var(--color-accent)]"
              />

              {/* Orb — draggable handle. Position is dial-center-relative, so the
                  centered initial offset shows the orb in the middle. */}
              <motion.button
                type="button"
                aria-label="Mood dial handle"
                drag
                dragMomentum={false}
                dragElastic={0}
                dragConstraints={{
                  left: -half + ORB_SIZE / 4,
                  right: half - ORB_SIZE / 4,
                  top: -half + ORB_SIZE / 4,
                  bottom: half - ORB_SIZE / 4,
                }}
                onKeyDown={onOrbKey}
                style={{
                  x,
                  y,
                  width: ORB_SIZE,
                  height: ORB_SIZE,
                  left: `calc(50% - ${ORB_SIZE / 2}px)`,
                  top: `calc(50% - ${ORB_SIZE / 2}px)`,
                }}
                whileTap={{ scale: reduceMotion ? 1 : 1.15 }}
                transition={
                  reduceMotion ? { duration: 0 } : { type: "spring", damping: 22, stiffness: 280 }
                }
                className="absolute z-20 rounded-full bg-[var(--color-accent)] shadow-[0_8px_30px_-6px_oklch(0.84_0.16_200_/_0.65)] cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-accent)]/40 ring-1 ring-white/30"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live coordinate readout — sibling block in the flex flow so it never
       * collides with the results grid below. */}
      <div className="text-center text-[10px] uppercase tracking-[0.28em] text-[var(--color-ink-3)]">
        {labelFor(coords.v, coords.a)}
        {pending && <span className="ml-2 text-[var(--color-accent)]">…</span>}
      </div>

      {/* Results grid */}
      <div className="w-full">
        {results.length === 0 ? (
          <p className="text-sm text-center text-[var(--color-ink-3)] mt-8">
            Drag the orb to discover films that match the mood.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {results.map((r) => (
              <TitlePreviewCard
                key={r.tmdbId}
                data={r}
                posterWidth={170}
                className="w-full"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={`text-[10px] uppercase tracking-[0.28em] pointer-events-none select-none ${className ?? ""}`}
    >
      {text}
    </span>
  );
}

/** Produce a short human-readable mood label from the (v, a) coords. */
function labelFor(v: number, a: number): string {
  const valenceWord = v > 0.33 ? "joyful" : v < -0.33 ? "bleak" : "balanced";
  const arousalWord = a > 0.33 ? "intense" : a < -0.33 ? "calm" : "even";
  return `${valenceWord} · ${arousalWord}`;
}
