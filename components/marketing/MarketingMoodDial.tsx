"use client";

/**
 * MarketingMoodDial — non-interactive, idle-animating preview of the real
 * Mood Dial. Used on the public landing page to demonstrate Pillar 1.
 *
 *   - The orb glides through four mood quadrants in a slow loop.
 *   - Below the dial, three abstract poster cards crossfade to colors that
 *     match the current quadrant's emotional palette.
 *   - Pauses if prefers-reduced-motion is on.
 *
 * Visually mirrors the real `MoodDial` (corner-tint gradient, cross-hairs,
 * orb shadow) but contains zero state or API calls — it's pure decoration.
 */

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const DIAL_SIZE = 280;
const ORB_SIZE = 36;

interface Quadrant {
  /** Display label */
  label: string;
  /** Normalised (-1..1, -1..1) */
  v: number;
  a: number;
  /** Three abstract poster fills — gradients that read as "this mood's poster" */
  posters: [string, string, string];
}

const QUADRANTS: Quadrant[] = [
  {
    label: "Calm · Joyful",
    v: 0.65,
    a: -0.6,
    posters: [
      "linear-gradient(165deg, oklch(0.72 0.14 90 / 0.85), oklch(0.55 0.12 65 / 0.85))",
      "linear-gradient(180deg, oklch(0.65 0.10 175 / 0.85), oklch(0.45 0.08 195 / 0.85))",
      "linear-gradient(160deg, oklch(0.70 0.12 50 / 0.85), oklch(0.50 0.10 25 / 0.85))",
    ],
  },
  {
    label: "Intense · Joyful",
    v: 0.7,
    a: 0.6,
    posters: [
      "linear-gradient(140deg, oklch(0.65 0.20 25 / 0.9), oklch(0.50 0.18 5 / 0.9))",
      "linear-gradient(150deg, oklch(0.70 0.20 60 / 0.9), oklch(0.55 0.18 35 / 0.9))",
      "linear-gradient(160deg, oklch(0.55 0.18 350 / 0.9), oklch(0.40 0.16 320 / 0.9))",
    ],
  },
  {
    label: "Intense · Bleak",
    v: -0.6,
    a: 0.55,
    posters: [
      "linear-gradient(160deg, oklch(0.32 0.10 280 / 0.95), oklch(0.18 0.06 270 / 0.95))",
      "linear-gradient(180deg, oklch(0.35 0.08 30 / 0.95), oklch(0.18 0.04 20 / 0.95))",
      "linear-gradient(150deg, oklch(0.28 0.06 250 / 0.95), oklch(0.15 0.04 240 / 0.95))",
    ],
  },
  {
    label: "Calm · Bleak",
    v: -0.65,
    a: -0.5,
    posters: [
      "linear-gradient(170deg, oklch(0.40 0.06 240 / 0.9), oklch(0.25 0.05 230 / 0.9))",
      "linear-gradient(170deg, oklch(0.45 0.08 200 / 0.9), oklch(0.30 0.06 210 / 0.9))",
      "linear-gradient(180deg, oklch(0.38 0.04 265 / 0.9), oklch(0.22 0.03 250 / 0.9))",
    ],
  },
];

const QUADRANT_HOLD_MS = 3200;

export function MarketingMoodDial() {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => {
      setStep((s) => (s + 1) % QUADRANTS.length);
    }, QUADRANT_HOLD_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const current = QUADRANTS[step]!;
  const half = DIAL_SIZE / 2;
  const orbX = current.v * half;
  // y is inverted in screen space — positive arousal sits ABOVE centre.
  const orbY = -current.a * half;

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div
        className="relative rounded-3xl overflow-hidden glass-regular glass-specular ring-1 ring-white/10 shadow-[0_30px_80px_-20px_oklch(0_0_0_/_0.55)]"
        style={{
          width: DIAL_SIZE,
          height: DIAL_SIZE,
          maxWidth: "100%",
          background: `
            radial-gradient(60% 60% at 100% 0%, oklch(0.55 0.18 195 / 0.45), transparent 70%),
            radial-gradient(60% 60% at 0% 100%, oklch(0.50 0.18 160 / 0.35), transparent 70%),
            radial-gradient(60% 60% at 0% 0%, oklch(0.40 0.12 275 / 0.30), transparent 70%),
            radial-gradient(60% 60% at 100% 100%, oklch(0.30 0.08 245 / 0.30), transparent 70%)`,
        }}
        aria-hidden
      >
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/5" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/5" />

        {/* Axis labels — tiny, inside the dial plane */}
        <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] uppercase tracking-[0.32em] text-white/40">
          Intense
        </span>
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[8px] uppercase tracking-[0.32em] text-white/40">
          Calm
        </span>
        <span className="absolute top-1/2 -translate-y-1/2 right-2 text-[8px] uppercase tracking-[0.32em] text-white/40">
          Joyful
        </span>
        <span className="absolute top-1/2 -translate-y-1/2 left-2 text-[8px] uppercase tracking-[0.32em] text-white/40">
          Bleak
        </span>

        {/* Orb — animates between quadrant coordinates */}
        <motion.div
          className="absolute rounded-full bg-[var(--color-accent)] shadow-[0_8px_30px_-6px_oklch(0.84_0.16_200_/_0.65)] ring-1 ring-white/30"
          style={{
            width: ORB_SIZE,
            height: ORB_SIZE,
            left: `calc(50% - ${ORB_SIZE / 2}px)`,
            top: `calc(50% - ${ORB_SIZE / 2}px)`,
          }}
          animate={{
            x: orbX,
            y: orbY,
            scale: reduceMotion ? 1 : [1, 1.08, 1],
          }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : {
                  x: { type: "spring", damping: 22, stiffness: 80, mass: 0.8 },
                  y: { type: "spring", damping: 22, stiffness: 80, mass: 0.8 },
                  scale: { duration: 1.6, ease: "easeInOut" },
                }
          }
        />
      </div>

      {/* Quadrant label — fades across transitions */}
      <motion.div
        key={current.label}
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: "easeOut" }}
        className="text-[10px] tracking-[0.28em] uppercase text-[var(--color-accent)]"
      >
        {current.label}
      </motion.div>

      {/* Abstract poster strip — three 2:3 cards whose fill matches the mood */}
      <div className="flex gap-3 w-full max-w-[280px]" aria-hidden>
        {current.posters.map((p, i) => (
          <motion.div
            // biome-ignore lint/suspicious/noArrayIndexKey: stable position
            key={`${step}-${i}`}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.5, delay: i * 0.08, ease: "easeOut" }
            }
            className="flex-1 aspect-[2/3] rounded-xl ring-1 ring-white/10 shadow-[0_12px_30px_-12px_oklch(0_0_0_/_0.55)]"
            style={{ background: p }}
          />
        ))}
      </div>
    </div>
  );
}
