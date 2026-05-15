"use client";

/**
 * JournalRecapPreview — narrates Pillars 3 → 4 for the landing page.
 *
 * Originally a two-card *stack*, but the back card bled through the
 * translucent glass of the front card (unreadable overlap). The real story
 * is sequential: you write an entry now; weeks later Lumen turns a run of
 * entries into a recap. So this is an auto-cycling cross-fade — exactly one
 * card visible at a time (zero overlap), looping entry → recap.
 *
 * Both cards share one CSS grid cell, so the container sizes to the taller
 * card and nothing shifts as they swap. Reduced-motion users get a static,
 * non-overlapping vertical sequence instead.
 */

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

import { GlassCard } from "@/components/glass";

const JOURNAL = {
  title: "After Yang",
  year: 2022,
  reflection:
    "The way memory was rendered as a small private museum — not nostalgic, just careful. I keep thinking about the tea ceremony.",
  echo:
    "What does it mean to leave behind something that remembered you, instead of someone?",
};

const RECAP = {
  headline: "A week of small, careful films",
  story:
    "You leaned quiet this week. After Yang, Past Lives, the slow first hour of Drive My Car — each one rewarding restraint over spectacle.\n\nIf there's a thread, it's that you keep watching films that treat silence as a kind of speech.",
};

const STEPS = [
  { caption: "An entry — the moment the credits roll." },
  { caption: "Weeks later — Lumen turns the run into a story." },
] as const;

const CYCLE_MS = 5200;

function JournalCardBody() {
  return (
    <GlassCard className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-20 -left-20 w-72 h-72 rounded-full pointer-events-none opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.62 0.18 160 / 0.35), transparent 70%)",
        }}
      />
      <div className="relative">
        <header className="flex items-baseline justify-between gap-4">
          <h3 className="text-xs tracking-[0.22em] uppercase text-[var(--color-accent-secondary)]">
            Journal entry
          </h3>
          <span className="text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
            Today
          </span>
        </header>
        <p className="mt-3 text-[10px] uppercase tracking-widest text-[var(--color-ink-2)]">
          {JOURNAL.title} · {JOURNAL.year}
        </p>
        <p className="mt-4 text-base leading-relaxed text-[var(--color-ink-0)] max-w-prose">
          {JOURNAL.reflection}
        </p>
        <div className="mt-5 pt-4 border-t border-white/5">
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
            Lumen asks
          </p>
          <p className="mt-2 text-base italic text-[var(--color-accent-secondary)] max-w-prose leading-relaxed">
            &ldquo;{JOURNAL.echo}&rdquo;
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

function RecapCardBody() {
  return (
    <GlassCard className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full pointer-events-none opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.62 0.18 200 / 0.40), transparent 70%)",
        }}
      />
      <div className="relative">
        <p className="text-[10px] tracking-[0.28em] uppercase text-[var(--color-accent)]">
          Recap
        </p>
        <h4
          className="mt-2 text-xl md:text-2xl font-[var(--font-display)] tracking-tight leading-[1.1]"
          style={{ letterSpacing: "-0.02em" }}
        >
          {RECAP.headline}
        </h4>
        <div className="mt-3 space-y-3">
          {RECAP.story.split("\n\n").map((p, i) => (
            <p
              // biome-ignore lint/suspicious/noArrayIndexKey: stable order
              key={i}
              className="text-sm leading-relaxed text-[var(--color-ink-1)]"
            >
              {p}
            </p>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

export function JournalRecapPreview() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((i: number) => setActive(i % STEPS.length), []);

  useEffect(() => {
    if (reduceMotion || paused) return;
    const id = setInterval(
      () => setActive((a) => (a + 1) % STEPS.length),
      CYCLE_MS,
    );
    return () => clearInterval(id);
  }, [reduceMotion, paused]);

  // Reduced motion: a calm, non-overlapping vertical sequence.
  if (reduceMotion) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <JournalCardBody />
        <p className="text-center text-xs uppercase tracking-[0.28em] text-[var(--color-ink-3)]">
          Weeks later
        </p>
        <RecapCardBody />
      </div>
    );
  }

  return (
    <div
      className="max-w-xl mx-auto"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Both cards occupy the same grid cell → container fits the taller
          card, no layout shift on swap, only the active one is interactive. */}
      <div className="grid [&>*]:[grid-area:1/1]">
        {[<JournalCardBody key="j" />, <RecapCardBody key="r" />].map(
          (card, i) => {
            const isActive = i === active;
            return (
              <motion.div
                key={i === 0 ? "journal" : "recap"}
                aria-hidden={!isActive}
                initial={false}
                animate={{
                  opacity: isActive ? 1 : 0,
                  scale: isActive ? 1 : 0.97,
                  y: isActive ? 0 : 10,
                }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className={isActive ? "" : "pointer-events-none"}
              >
                {card}
              </motion.div>
            );
          },
        )}
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        {STEPS.map((step, i) => (
          <button
            key={step.caption}
            type="button"
            onClick={() => go(i)}
            aria-label={step.caption}
            aria-current={i === active}
            className="group flex items-center gap-2 outline-none"
          >
            <span
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === active
                  ? "w-7 bg-[var(--color-accent)]"
                  : "w-1.5 bg-white/20 group-hover:bg-white/40 group-focus-visible:bg-white/40"
              }`}
            />
          </button>
        ))}
      </div>

      <motion.p
        key={active}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mt-3 text-center text-xs text-[var(--color-ink-3)]"
      >
        {STEPS[active].caption}
      </motion.p>
    </div>
  );
}
