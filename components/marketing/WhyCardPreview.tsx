"use client";

/**
 * WhyCardPreview — static, marketing-only mockup of the real Why Card.
 *
 * Shows a curated example so signed-out visitors can see Pillar 2 (AI Taste)
 * without having to sign in and accumulate ratings first. Visually mirrors
 * the production card: sapphire halo, headline, two-sentence explanation,
 * three dimension chips with contribution bars.
 */

import { GlassCard } from "@/components/glass";

const DEMO = {
  film: "Past Lives",
  year: 2023,
  explanation:
    "Quiet, observational, and emotionally precise — the kind of film you described after watching After Yang. It sits in the same tradition: little dialogue, lots of looking.",
  reasons: [
    { dimension: "Quiet endings", contribution: 0.86, copy: "Like the films you marked highest." },
    {
      dimension: "Naturalistic dialogue",
      contribution: 0.74,
      copy: "Strong overlap with your top ratings.",
    },
    {
      dimension: "Restrained color",
      contribution: 0.61,
      copy: "Shows up across your Wong Kar-wai picks.",
    },
  ],
};

export function WhyCardPreview() {
  return (
    <GlassCard className="relative overflow-hidden max-w-xl mx-auto">
      <div
        aria-hidden
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.78 0.16 200 / 0.40), transparent 70%)",
        }}
      />
      <div className="relative">
        <header className="flex items-baseline justify-between gap-4">
          <h3 className="text-xs tracking-[0.22em] uppercase text-[var(--color-accent)]">
            Why this, for you
          </h3>
          <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--color-ink-3)]">
            Personalized
          </span>
        </header>
        <p className="mt-4 text-base md:text-lg leading-relaxed text-[var(--color-ink-0)] max-w-prose">
          {DEMO.explanation}
        </p>
        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DEMO.reasons.map((r) => (
            <li
              key={r.dimension}
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
        <p className="mt-5 text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
          For: {DEMO.film} · {DEMO.year}
        </p>
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
          background:
            "linear-gradient(90deg, var(--color-accent), var(--color-accent-secondary))",
        }}
      />
    </div>
  );
}
