"use client";

/**
 * OnboardingStack — card-stack UI for the 10-film taste seed (SPEC §A.2).
 *
 * Behaviour:
 *   - One card at a time, spring-in from the bottom.
 *   - Tap stars 1–5 to rate, or "Haven't seen it" to skip.
 *   - Progress dots at the top. Submit button enables at ≥5 ratings.
 *   - Final tap calls submitOnboardingAction; server redirects to /home.
 */

import { skipOnboardingAction, submitOnboardingAction } from "@/app/(app)/onboarding/actions";
import { capture } from "@/lib/analytics/events";
import { MIN_RATINGS_FOR_CENTROID } from "@/lib/onboarding/seed-films";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useMemo, useState, useTransition } from "react";

export interface OnboardingCard {
  tmdbId: number;
  titleRowId: string | null;
  title: string;
  director: string | null;
  year: number;
  posterPath: string | null;
  backdropPath: string | null;
  axis: string;
}

interface Props {
  cards: OnboardingCard[];
}

type StarValue = 1 | 2 | 3 | 4 | 5;

interface RatedEntry {
  tmdbId: number;
  stars: StarValue;
}

export function OnboardingStack({ cards }: Props) {
  const [idx, setIdx] = useState(0);
  const [rated, setRated] = useState<RatedEntry[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [skipPending, startSkipTransition] = useTransition();
  const reduceMotion = useReducedMotion();

  const total = cards.length;
  const current = cards[idx];
  const canSubmit = rated.length >= MIN_RATINGS_FOR_CENTROID;

  const rate = (stars: StarValue) => {
    if (!current) return;
    capture("rated_film", { tmdbId: current.tmdbId, stars });
    setRated((prev) => {
      const next = prev.filter((r) => r.tmdbId !== current.tmdbId);
      next.push({ tmdbId: current.tmdbId, stars });
      return next;
    });
    advance();
  };

  const skip = () => advance();

  const advance = () => {
    setError(null);
    if (idx < total - 1) {
      setIdx((i) => i + 1);
    }
  };

  const finish = () => {
    if (!canSubmit) {
      setError(`Rate at least ${MIN_RATINGS_FOR_CENTROID} films to continue.`);
      return;
    }
    startTransition(async () => {
      try {
        await submitOnboardingAction({ ratings: rated });
        // server redirects on success — nothing to do here
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  const ratedTmdb = useMemo(() => new Set(rated.map((r) => r.tmdbId)), [rated]);
  const isLast = idx >= total - 1;
  const currentStars = rated.find((r) => r.tmdbId === current?.tmdbId)?.stars ?? 0;

  const handleSkipOnboarding = (mode: "later" | "permanent") => {
    startSkipTransition(async () => {
      try {
        await skipOnboardingAction(mode);
      } catch (e) {
        setError((e as Error).message);
        setSkipDialogOpen(false);
      }
    });
  };

  return (
    <div>
      {/* Progress — segmented bar from 0 → MIN_RATINGS_FOR_CENTROID.
          We don't render one tick per card (could be 50) — we track progress
          toward the threshold instead. */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: MIN_RATINGS_FOR_CENTROID }).map((_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: tick positions are stable
              key={i}
              aria-hidden
              className={`h-1.5 w-5 rounded-full transition-all ${
                i < rated.length ? "bg-[var(--color-accent)]" : "bg-[var(--color-ink-3)]/40"
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
          {Math.min(rated.length, MIN_RATINGS_FOR_CENTROID)} / {MIN_RATINGS_FOR_CENTROID} rated
        </span>
      </div>

      <div className="relative h-[560px]">
        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={current.tmdbId}
              initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 48, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -48, scale: 0.95 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", damping: 28, stiffness: 200, mass: 0.7 }
              }
              className="absolute inset-0 glass-regular glass-specular rounded-3xl overflow-hidden ring-1 ring-white/5"
            >
              <Card card={current} currentStars={currentStars} onRate={rate} onSkip={skip} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-y-3 gap-x-3">
        <button
          type="button"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink-0)] disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        >
          ← Back
        </button>

        <div className="flex flex-wrap items-center gap-3 justify-end">
          <button
            type="button"
            onClick={() => setSkipDialogOpen(true)}
            className="text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink-0)] transition-colors"
          >
            Skip onboarding
          </button>
          <button
            type="button"
            onClick={finish}
            disabled={!canSubmit || pending}
            className={`px-5 py-2.5 rounded-full bg-[var(--color-accent-strong)] hover:bg-[var(--color-accent)] text-[#02161F] text-sm font-medium tracking-tight transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              canSubmit && !pending ? "shadow-[0_10px_30px_-12px_oklch(0.76_0.18_195_/_0.55)]" : ""
            }`}
          >
            {pending
              ? "Building your taste…"
              : canSubmit
                ? "Build my taste"
                : `Rate ${MIN_RATINGS_FOR_CENTROID - rated.length} more`}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm text-[var(--color-accent)]" role="alert">
          {error}
        </p>
      )}

      <AnimatePresence>
        {skipDialogOpen && (
          <SkipOnboardingDialog
            pending={skipPending}
            reduceMotion={reduceMotion ?? false}
            onLater={() => handleSkipOnboarding("later")}
            onPermanent={() => handleSkipOnboarding("permanent")}
            onCancel={() => setSkipDialogOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SkipOnboardingDialog({
  pending,
  reduceMotion,
  onLater,
  onPermanent,
  onCancel,
}: {
  pending: boolean;
  reduceMotion: boolean;
  onLater: () => void;
  onPermanent: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="skip-onboarding-title"
    >
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      <motion.div
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
        transition={
          reduceMotion ? { duration: 0 } : { type: "spring", damping: 28, stiffness: 280 }
        }
        className="relative z-10 max-w-md w-full glass-regular glass-specular rounded-3xl ring-1 ring-white/10 p-7 shadow-[0_30px_80px_-20px_oklch(0_0_0_/_0.7)]"
      >
        <p className="text-[11px] tracking-[0.22em] uppercase text-[var(--color-accent)]">
          Hold on
        </p>
        <h2
          id="skip-onboarding-title"
          className="mt-2 text-xl md:text-2xl font-[var(--font-display)] tracking-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          Skip the taste seed?
        </h2>
        <p className="mt-3 text-sm text-[var(--color-ink-1)] leading-relaxed">
          Rating ten films is the fastest way for Lumen to learn what you respond to. You can skip —
          but recommendations will be generic until your taste accrues from ratings and journal
          entries over time.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onLater}
            disabled={pending}
            className="w-full text-left px-4 py-3 rounded-2xl glass-thin glass-specular ring-1 ring-[var(--color-accent)]/40 hover:ring-[var(--color-accent)]/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-sm font-medium text-[var(--color-ink-0)]">Remind me later</div>
            <div className="text-xs text-[var(--color-ink-2)] mt-0.5">
              Take me to Home for now. I&apos;ll be prompted on next visit.
            </div>
          </button>
          <button
            type="button"
            onClick={onPermanent}
            disabled={pending}
            className="w-full text-left px-4 py-3 rounded-2xl glass-thin ring-1 ring-white/10 hover:ring-white/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-sm font-medium text-[var(--color-ink-0)]">Skip for now</div>
            <div className="text-xs text-[var(--color-ink-2)] mt-0.5">
              Done with this. Lumen will learn my taste slowly as I use the app.
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="mt-5 text-xs uppercase tracking-widest text-[var(--color-ink-3)] hover:text-[var(--color-ink-1)] transition-colors disabled:opacity-50"
        >
          {pending ? "Skipping…" : "Cancel · keep rating"}
        </button>
      </motion.div>
    </motion.div>
  );
}

function Card({
  card,
  currentStars,
  onRate,
  onSkip,
}: {
  card: OnboardingCard;
  currentStars: number;
  onRate: (s: StarValue) => void;
  onSkip: () => void;
}) {
  const backdrop = card.backdropPath
    ? `https://image.tmdb.org/t/p/w1280${card.backdropPath}`
    : null;
  const poster = card.posterPath ? `https://image.tmdb.org/t/p/w342${card.posterPath}` : null;
  return (
    <div className="relative h-full w-full flex flex-col">
      <div className="relative h-56 w-full overflow-hidden">
        {backdrop ? (
          <Image
            src={backdrop}
            alt={card.title}
            fill
            sizes="640px"
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-[var(--color-surface-2)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface-0)]/95 via-[var(--color-surface-0)]/30 to-transparent" />
      </div>
      <div className="px-6 -mt-16 relative z-10 flex gap-5 items-end">
        {poster && (
          <div className="w-24 shrink-0 rounded-xl overflow-hidden shadow-[0_20px_50px_-18px_oklch(0_0_0_/_0.65)] ring-1 ring-white/10">
            <Image
              src={poster}
              alt={card.title}
              width={300}
              height={450}
              className="object-cover w-full h-auto"
            />
          </div>
        )}
        <div className="pb-2 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-accent)]">
            {card.axis}
          </p>
          <h2
            className="mt-1.5 text-xl md:text-2xl font-[var(--font-display)] tracking-tight line-clamp-2"
            style={{ letterSpacing: "-0.02em" }}
          >
            {card.title}
          </h2>
          <p className="mt-1 text-xs text-[var(--color-ink-2)]">
            {card.year}
            {card.director ? ` · Dir. ${card.director}` : ""}
          </p>
        </div>
      </div>

      <div className="px-6 py-8 mt-auto">
        <div
          className="flex items-center gap-2"
          role="radiogroup"
          aria-label={`Rate ${card.title}`}
        >
          {[1, 2, 3, 4, 5].map((s) => (
            /* Buttons act as a custom radio group (cleaner styling than native
               inputs for the star UI). The radiogroup wrapper above gives screen
               readers context. */
            <button
              key={s}
              // biome-ignore lint/a11y/useSemanticElements: custom rating control by design
              type="button"
              role="radio"
              aria-checked={currentStars >= s}
              aria-label={`${s} star${s > 1 ? "s" : ""}`}
              onClick={() => onRate(s as StarValue)}
              className="text-3xl px-1 py-0.5 hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded"
            >
              <span
                aria-hidden
                style={{ color: currentStars >= s ? "var(--color-accent)" : "var(--color-ink-3)" }}
              >
                ★
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="mt-5 text-xs uppercase tracking-widest text-[var(--color-ink-3)] hover:text-[var(--color-ink-1)] transition-colors"
        >
          Haven&apos;t seen it
        </button>
      </div>
    </div>
  );
}
