"use client";

/**
 * JournalRecapPreview — two-card stack demonstrating Pillars 3 + 4.
 *
 * Top card: a sample journal entry (reflection + Echo question).
 * Bottom card: a sample recap headline + two-paragraph story.
 *
 * Both are pure presentation; same glass treatment as the production UIs.
 */

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

export function JournalRecapPreview() {
  return (
    <div className="relative max-w-xl mx-auto">
      {/* Lower card — recap. Sits behind, slightly offset for depth. */}
      <div className="absolute inset-0 translate-x-3 translate-y-3 -rotate-1 opacity-95">
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
      </div>

      {/* Upper card — journal entry */}
      <div className="relative">
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
      </div>
    </div>
  );
}
