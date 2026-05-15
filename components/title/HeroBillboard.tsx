"use client";

/**
 * HeroBillboard — auto-rotating featured-title hero for /home.
 * SPEC §3.2 + §5: cinematic billboard with glass-chrome content overlay.
 *
 * Polish pass (luxury cinematic):
 *   - Slow ken-burns scale on the active backdrop (1.08 → 1.0 over ~12s).
 *   - 1.4s opacity crossfade between rotations.
 *   - Triple gradient stack: vertical, horizontal, and content-tint radial.
 *   - Display-typography title with Apple-tight letter-spacing.
 *   - Tagline rendered as italic quote (preferred over overview when present).
 *   - Primary CTA carries a soft accent-colored glow shadow.
 *   - Pause-on-hover for the auto-rotation timer.
 *   - Manual prev / next glass buttons + segmented active-dot.
 *   - Honors prefers-reduced-motion at every step.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

export interface HeroItem {
  tmdbId: number;
  title: string;
  backdropPath: string | null;
  releaseYear: number | null;
  overview: string | null;
  tagline: string | null;
  voteAverage: number | null;
  genres: string[] | null;
  /** dominant hex e.g. "#1a2b3c" — sets --color-content-tint for the radial */
  dominantColor?: string | null;
}

interface Props {
  items: HeroItem[];
  rotateMs?: number;
}

export function HeroBillboard({ items, rotateMs = 9000 }: Props) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (items.length <= 1 || paused || reduceMotion) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), rotateMs);
    return () => clearInterval(t);
  }, [items.length, rotateMs, paused, reduceMotion]);

  const advance = useCallback(
    (dir: 1 | -1) => {
      setIdx((i) => (i + dir + items.length) % items.length);
    },
    [items.length],
  );

  if (!items.length) return null;
  const current = items[idx]!;
  const backdrop = current.backdropPath ? `${BACKDROP_BASE}${current.backdropPath}` : null;
  const ratingText =
    typeof current.voteAverage === "number" && current.voteAverage > 0
      ? (current.voteAverage / 10).toFixed(1)
      : null;

  return (
    <section
      className="relative h-[78dvh] min-h-[520px] w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
      style={
        current.dominantColor
          ? ({ "--color-content-tint": current.dominantColor } as React.CSSProperties)
          : undefined
      }
    >
      {/* Layer 1 — backdrop with slow ken-burns + crossfade */}
      <AnimatePresence>
        <motion.div
          key={current.tmdbId}
          className="absolute inset-0 will-change-transform"
          initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : {
                  opacity: { duration: 1.4, ease: [0.4, 0, 0.2, 1] },
                  scale: { duration: 12, ease: "linear" },
                }
          }
        >
          {backdrop ? (
            <Image
              src={backdrop}
              alt={current.title}
              fill
              sizes="100vw"
              className="object-cover"
              // Always priority on the active backdrop. The carousel mounts
              // one image at a time (AnimatePresence keys by tmdbId), so this
              // doesn't preload future slides — it just tells the browser the
              // current LCP candidate matters. Without it, Next.js warns
              // whenever rotation lands on a non-first slide.
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-[var(--color-surface-1)]" />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Layer 2 — cinematic gradient stack */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[var(--color-surface-0)] via-[var(--color-surface-0)]/55 to-transparent" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[var(--color-surface-0)]/85 via-[var(--color-surface-0)]/15 to-transparent" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(72% 56% at 10% 78%, color-mix(in oklab, var(--color-content-tint) 22%, transparent), transparent 65%)",
        }}
      />

      {/* Layer 3 — content (bottom-left) */}
      <div className="relative h-full flex items-end px-6 md:px-12 pb-16 md:pb-24 z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.tmdbId}
            className="max-w-2xl"
            initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-[10px] tracking-[0.28em] uppercase text-[var(--color-accent)]">
              Featured tonight
            </p>
            <h1
              className="mt-4 text-2xl sm:text-4xl md:text-6xl font-[var(--font-display)] tracking-tight leading-[1.04]"
              style={{ letterSpacing: "-0.025em" }}
            >
              {current.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-ink-2)] uppercase tracking-widest">
              {current.releaseYear && <span>{current.releaseYear}</span>}
              {ratingText && (
                <span className="inline-flex items-center gap-1 text-[var(--color-accent)]">
                  <span aria-hidden>★</span>
                  {ratingText}
                </span>
              )}
              {current.genres?.slice(0, 2).map((g) => (
                <span key={g} className="opacity-90">
                  {g}
                </span>
              ))}
            </div>
            {current.tagline ? (
              <p className="mt-5 text-base md:text-lg italic text-[var(--color-ink-1)] max-w-prose leading-relaxed">
                &ldquo;{current.tagline}&rdquo;
              </p>
            ) : current.overview ? (
              <p className="mt-5 text-sm md:text-base text-[var(--color-ink-1)] line-clamp-3 max-w-prose leading-relaxed">
                {current.overview}
              </p>
            ) : null}
            <div className="mt-7 flex items-center gap-3">
              <Link
                href={`/title/${current.tmdbId}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--color-accent-strong)] hover:bg-[var(--color-accent)] text-[#02161F] text-sm font-medium tracking-tight transition-colors shadow-[0_10px_30px_-12px_oklch(0.76_0.18_195_/_0.55)]"
              >
                <span>Open</span>
                <ChevronRightSmall />
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Layer 4 — bottom-right controls (prev / segmented dots / next) */}
      {items.length > 1 && (
        <div className="absolute bottom-6 right-6 md:right-12 z-10 flex items-center gap-3">
          <ArrowButton onClick={() => advance(-1)} dir="left" />
          <div className="flex items-center gap-1.5" aria-label="Carousel position">
            {items.map((it, i) => (
              <button
                key={it.tmdbId}
                type="button"
                aria-label={`Show featured title ${i + 1}`}
                aria-current={i === idx}
                onClick={() => setIdx(i)}
                className={`h-1 rounded-full transition-all duration-500 ${
                  i === idx ? "w-8 bg-[var(--color-accent)]" : "w-2 bg-[var(--color-ink-3)]/60"
                }`}
              />
            ))}
          </div>
          <ArrowButton onClick={() => advance(1)} dir="right" />
        </div>
      )}
    </section>
  );
}

function ArrowButton({ onClick, dir }: { onClick: () => void; dir: "left" | "right" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "left" ? "Previous featured title" : "Next featured title"}
      className="size-10 rounded-full glass-thin glass-specular flex items-center justify-center text-[var(--color-ink-0)] hover:scale-105 active:scale-95 transition-transform"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="w-4 h-4"
      >
        {dir === "left" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
      </svg>
    </button>
  );
}

function ChevronRightSmall() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="w-3.5 h-3.5"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
