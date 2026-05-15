"use client";

/**
 * WhyCardFlip — the 3D flip presentation for the Why Card (SPEC §3.1 #2,
 * §5.5, SPEC_COMPLETION §2 B4).
 *
 *   Front: "Why this, for you" + the 1-2 sentence explanation.
 *   Back:  the three contributing-dimension reason chips.
 *
 * Click / Enter / Space flips. Spring damping:26 stiffness:220 (the SPEC
 * §5.5 default). `prefers-reduced-motion` → a cross-fade instead of a
 * rotation (no 3D transform), per B4.
 */

import { GlassCard } from "@/components/glass";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

export interface WhyReason {
  dimension: string;
  contribution: number;
  copy: string;
}

export interface WhyCardData {
  explanationText: string;
  reasons: WhyReason[];
}

const SPRING = { type: "spring" as const, damping: 26, stiffness: 220 };

export function WhyCardFlip({ explanationText, reasons }: WhyCardData) {
  const [flipped, setFlipped] = useState(false);
  const reduceMotion = useReducedMotion();
  const sorted = [...reasons].sort((a, b) => b.contribution - a.contribution);

  const toggle = () => setFlipped((v) => !v);

  return (
    <section className="mx-auto max-w-5xl px-6 md:px-10 py-8">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={flipped}
        aria-label={flipped ? "Show the explanation" : "Show the three reasons"}
        className="block w-full text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-accent)]/40 rounded-3xl"
      >
        {reduceMotion ? (
          // Reduced motion: cross-fade, no 3D rotation.
          <div className="relative">
            <AnimatePresence mode="wait" initial={false}>
              {flipped ? (
                <motion.div
                  key="back"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <WhyBack reasons={sorted} />
                </motion.div>
              ) : (
                <motion.div
                  key="front"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <WhyFront explanationText={explanationText} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div style={{ perspective: 1600 }}>
            <motion.div
              className="relative"
              style={{ transformStyle: "preserve-3d" }}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={SPRING}
            >
              <div style={{ backfaceVisibility: "hidden" }}>
                <WhyFront explanationText={explanationText} />
              </div>
              <div
                className="absolute inset-0"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <WhyBack reasons={sorted} />
              </div>
            </motion.div>
          </div>
        )}
      </button>
    </section>
  );
}

function WhyFront({ explanationText }: { explanationText: string }) {
  return (
    <GlassCard className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none opacity-50 blur-3xl"
        style={{
          background: "radial-gradient(closest-side, oklch(0.78 0.16 200 / 0.35), transparent 70%)",
        }}
      />
      <div className="relative">
        <header className="flex items-baseline justify-between gap-4">
          <h2 className="text-xs tracking-[0.22em] uppercase text-[var(--color-accent)]">
            Why this, for you
          </h2>
          <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--color-ink-3)]">
            Tap to see the reasons
          </span>
        </header>
        <p className="mt-4 text-base md:text-lg leading-relaxed text-[var(--color-ink-0)] max-w-prose">
          {explanationText}
        </p>
      </div>
    </GlassCard>
  );
}

function WhyBack({ reasons }: { reasons: WhyReason[] }) {
  return (
    <GlassCard className="relative overflow-hidden">
      <div className="relative">
        <header className="flex items-baseline justify-between gap-4">
          <h2 className="text-xs tracking-[0.22em] uppercase text-[var(--color-accent)]">
            Three reasons
          </h2>
          <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--color-ink-3)]">
            Tap to go back
          </span>
        </header>
        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {reasons.map((r, i) => (
            <li
              key={`${r.dimension}-${i}`}
              className="rounded-xl px-4 py-3 glass-thin glass-specular ring-1 ring-white/5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-2)]">
                  {r.dimension}
                </span>
                <ContributionBar value={r.contribution} />
              </div>
              <p className="mt-2 text-sm leading-snug text-[var(--color-ink-1)]">{r.copy}</p>
            </li>
          ))}
        </ul>
      </div>
    </GlassCard>
  );
}

function ContributionBar({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      className="relative h-1 w-12 rounded-full bg-white/10 overflow-hidden"
      aria-label={`Match strength ${pct} percent`}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${pct}%`,
          background: "linear-gradient(90deg, var(--color-accent), var(--color-accent-secondary))",
        }}
      />
    </div>
  );
}
