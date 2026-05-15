"use client";

/**
 * TitlePreviewCard — the hover-to-expand card used in Home rows, Search results,
 * and "More Like This" on Title detail. SPEC §3 + §5.5.
 *
 * Luxury contained-hover pattern:
 *   - Resting state: pristine poster, no overlay (museum-case clean).
 *   - 180ms hover delay → card scales 1.05× and a glass info panel slides up
 *     from the bottom of the poster, covering ~55% of its height.
 *   - The expansion stays INSIDE the poster bounds — the row never reflows
 *     vertically, neighbours don't shift, the layout never jitters.
 *   - If a TMDB YouTube trailer key was prefetched, mount a muted IFrame that
 *     cross-fades in (honors prefers-reduced-motion).
 *   - Keyboard: focus triggers the same expansion. Esc unfocuses.
 *
 * Performance budget (SPEC §5.7): IFrame mounts lazily, only on actual hover
 * (never on intersection), and tears down on leave.
 */

import { cn } from "@/lib/cn";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";

export interface TitlePreviewData {
  /** Lumen internal UUID (used when we route to /title/[tmdb_id]) */
  id?: string;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  backdropPath?: string | null;
  releaseYear?: number | null;
  runtimeMin?: number | null;
  voteAverage?: number | null;
  overview?: string | null;
  genres?: string[] | null;
  /** Optional pre-fetched YouTube key; if absent, hover shows static info only. */
  youtubeKey?: string | null;
}

export interface TitlePreviewCardProps {
  data: TitlePreviewData;
  /** Visual width — defaults to 184px (matches w185 poster). */
  posterWidth?: number;
  className?: string;
  /** When true, the poster image loads eagerly with high fetch priority.
   *  Set for above-the-fold cards (e.g. the "Tonight" pick on /home) so the
   *  LCP candidate isn't lazy-loaded. */
  priority?: boolean;
}

const POSTER_BASE = "https://image.tmdb.org/t/p/w342";
const HOVER_DELAY_MS = 180;
const TRAILER_MOUNT_DELAY_MS = 360;

export function TitlePreviewCard({
  data,
  posterWidth = 184,
  className,
  priority = false,
}: TitlePreviewCardProps) {
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trailerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hovered, setHovered] = useReducer((_: boolean, v: boolean) => v, false);
  const [showTrailer, setShowTrailer] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      if (trailerTimer.current) clearTimeout(trailerTimer.current);
    };
  }, []);

  const onEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setHovered(true);
      if (data.youtubeKey && !reduceMotion) {
        trailerTimer.current = setTimeout(() => setShowTrailer(true), TRAILER_MOUNT_DELAY_MS);
      }
    }, HOVER_DELAY_MS);
  };
  const onLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (trailerTimer.current) clearTimeout(trailerTimer.current);
    setHovered(false);
    setShowTrailer(false);
  };

  const poster = data.posterPath ? `${POSTER_BASE}${data.posterPath}` : null;
  const ratingText =
    typeof data.voteAverage === "number" && data.voteAverage > 0
      ? (data.voteAverage / 10).toFixed(1) // schema stores * 10
      : null;
  // When className contains width utilities (e.g. "w-full"), we let CSS drive
  // the outer width and use a 2:3 aspect ratio for the card. Without a className
  // width hint we fall back to the explicit posterWidth px value so existing
  // callers (HorizontalScroller, standalone cards) are unaffected.
  const hasClassWidth = className?.includes("w-") ?? false;
  const aspectStyle: React.CSSProperties = hasClassWidth
    ? { aspectRatio: "2 / 3", width: "100%" }
    : { width: posterWidth, aspectRatio: "2 / 3" };

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      className={cn("relative isolate", className)}
      style={hasClassWidth ? undefined : { width: posterWidth }}
    >
      <Link
        href={`/title/${data.tmdbId}`}
        prefetch={false}
        aria-label={`${data.title}${data.releaseYear ? ` (${data.releaseYear})` : ""}`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent rounded-2xl"
      >
        <motion.div
          animate={hovered ? { scale: 1.05, y: -4 } : { scale: 1, y: 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", damping: 28, stiffness: 240, mass: 0.7 }
          }
          className="relative rounded-2xl overflow-hidden shadow-[0_18px_50px_-22px_oklch(0_0_0_/_0.65)] will-change-transform"
          style={aspectStyle}
        >
          {poster ? (
            <Image
              src={poster}
              alt={data.title}
              fill
              sizes={`${posterWidth}px`}
              className="object-cover"
              {...(priority ? { priority: true } : { loading: "lazy" })}
            />
          ) : (
            <div className="absolute inset-0 bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-ink-3)] text-xs">
              No poster
            </div>
          )}

          {/* Muted trailer overlay (cross-fades over the poster, still inside card) */}
          <AnimatePresence>
            {showTrailer && data.youtubeKey && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                className="absolute inset-0"
                aria-hidden
              >
                <iframe
                  title={`${data.title} preview trailer`}
                  src={`https://www.youtube.com/embed/${data.youtubeKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${data.youtubeKey}&modestbranding=1&playsinline=1&rel=0`}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  allow="autoplay; encrypted-media; picture-in-picture"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Contained-hover info panel — slides up from bottom INSIDE the poster.
              All info lives within the 2:3 aspect ratio; nothing escapes the card. */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={reduceMotion ? { opacity: 0 } : { y: "100%" }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", damping: 30, stiffness: 280, mass: 0.8 }
                }
                className="absolute inset-x-0 bottom-0 px-3.5 pt-6 pb-3 will-change-transform"
                style={{
                  background:
                    "linear-gradient(to top, oklch(0.085 0.03 245 / 0.94) 0%, oklch(0.085 0.03 245 / 0.78) 55%, oklch(0.085 0.03 245 / 0.0) 100%)",
                  backdropFilter: "blur(12px) saturate(150%)",
                  WebkitBackdropFilter: "blur(12px) saturate(150%)",
                  borderTop: "1px solid oklch(0.92 0.08 200 / 0.18)",
                }}
              >
                <div className="font-[var(--font-display)] text-[15px] leading-tight tracking-tight text-[var(--color-ink-0)] line-clamp-2">
                  {data.title}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-widest text-[var(--color-ink-2)]">
                  {data.releaseYear && <span>{data.releaseYear}</span>}
                  {data.runtimeMin && <span>{data.runtimeMin}m</span>}
                  {data.genres?.[0] && (
                    <span className="text-[var(--color-accent)]">{data.genres[0]}</span>
                  )}
                  {ratingText && (
                    <span className="ml-auto inline-flex items-center gap-0.5 text-[var(--color-accent)]">
                      <span aria-hidden>★</span>
                      {ratingText}
                    </span>
                  )}
                </div>

                {data.overview && (
                  <p className="mt-2 text-[11px] leading-snug text-[var(--color-ink-2)] line-clamp-3">
                    {data.overview}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Link>
    </div>
  );
}
