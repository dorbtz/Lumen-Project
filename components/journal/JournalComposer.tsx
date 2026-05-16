"use client";

/**
 * JournalComposer — Echo Journal capture surface (SPEC §3.1 #3).
 *
 * Sits on the title detail page. After watching, the user writes a short
 * reflection, picks a mood chip, submits. On success we reveal the Gemini-
 * generated Echo question — never a generic prompt, always grounded in the
 * film + the viewer's recent reflection themes.
 *
 * Mood chips map to fixed (valence, arousal) coordinates so we don't need a
 * full dial here — the Mood Dial lives on /discover/mood.
 */

import { saveJournalEntryAction } from "@/app/(app)/journal/actions";
import { GlassCard } from "@/components/glass";
import { StarRating } from "@/components/ui/StarRating";
import { capture } from "@/lib/analytics/events";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { type FormEvent, useState, useTransition } from "react";

interface JournalComposerProps {
  titleUuid: string;
}

interface MoodChoice {
  id: string;
  label: string;
  valence: number;
  arousal: number;
}

const MOOD_CHOICES: MoodChoice[] = [
  { id: "elated", label: "Elated", valence: 0.7, arousal: 0.7 },
  { id: "tender", label: "Tender", valence: 0.7, arousal: -0.5 },
  { id: "balanced", label: "Balanced", valence: 0, arousal: 0 },
  { id: "haunted", label: "Haunted", valence: -0.5, arousal: 0.5 },
  { id: "somber", label: "Somber", valence: -0.7, arousal: -0.5 },
];

export function JournalComposer({ titleUuid }: JournalComposerProps) {
  const [reflection, setReflection] = useState("");
  const [moodId, setMoodId] = useState<string>("balanced");
  const [stars, setStars] = useState(0); // 0 = unrated (optional)
  const [savedQuestion, setSavedQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();

  const trimmed = reflection.trim();
  const canSubmit = trimmed.length >= 4 && trimmed.length <= 4000 && !pending;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    const chosen = MOOD_CHOICES.find((m) => m.id === moodId) ?? MOOD_CHOICES[2]!;
    startTransition(async () => {
      const result = await saveJournalEntryAction({
        titleUuid,
        reflection: trimmed,
        valence: chosen.valence,
        arousal: chosen.arousal,
        ...(stars >= 1 && stars <= 5 ? { journalStars: stars } : {}),
      });
      if (!result.ok) {
        setError(result.error ?? "Could not save the entry");
        return;
      }
      capture("logged_journal", {
        hasReflection: trimmed.length > 0,
        rated: stars >= 1,
      });
      setSavedQuestion(result.generatedQuestion ?? null);
      setReflection("");
      setStars(0);
    });
  };

  if (savedQuestion !== null) {
    return (
      <section className="mx-auto max-w-5xl px-6 md:px-10 py-8">
        <motion.div
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.4, ease: "easeOut" }}
        >
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
              <h2 className="text-xs tracking-[0.22em] uppercase text-[var(--color-accent-secondary)]">
                Saved to your journal
              </h2>
              <p className="mt-4 text-base md:text-lg italic leading-relaxed text-[var(--color-ink-0)] max-w-prose">
                &ldquo;{savedQuestion}&rdquo;
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-widest text-[var(--color-ink-3)]">
                A question to sit with
              </p>
              <div className="mt-5 flex items-center gap-4">
                <Link
                  href="/journal"
                  className="text-sm text-[var(--color-accent)] hover:underline"
                >
                  Open journal →
                </Link>
                <button
                  type="button"
                  onClick={() => setSavedQuestion(null)}
                  className="text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink-0)] transition-colors"
                >
                  Log another reflection
                </button>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-6 md:px-10 py-8">
      <GlassCard>
        <form onSubmit={onSubmit} className="space-y-5">
          <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-xs tracking-[0.22em] uppercase text-[var(--color-accent-secondary)]">
              Journal this watch
            </h2>
            <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--color-ink-3)]">
              A few lines is plenty
            </p>
          </header>

          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="What stayed with you? A line, an image, a feeling, an idea."
            rows={4}
            maxLength={4000}
            className="w-full resize-none rounded-xl bg-white/5 ring-1 ring-white/10 focus:ring-2 focus:ring-[var(--color-accent)]/50 px-4 py-3 text-base leading-relaxed text-[var(--color-ink-0)] placeholder:text-[var(--color-ink-3)] outline-none transition-all"
          />

          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-2)] mb-2">
              How it left you
            </div>
            <div className="flex flex-wrap gap-2">
              {MOOD_CHOICES.map((m) => {
                const active = m.id === moodId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMoodId(m.id)}
                    className={`px-4 py-2 rounded-full text-sm transition-all ring-1 ${
                      active
                        ? "bg-[var(--color-accent)]/15 ring-[var(--color-accent)]/60 text-[var(--color-ink-0)]"
                        : "bg-white/3 ring-white/10 text-[var(--color-ink-2)] hover:text-[var(--color-ink-0)] hover:ring-white/20"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-2)] mb-2">
              Rate it{" "}
              <span className="normal-case tracking-normal text-[var(--color-ink-3)]">
                — optional, sharpens your taste profile
              </span>
            </div>
            <div className="flex items-center gap-3">
              <StarRating
                value={stars}
                onChange={(s) => setStars(s)}
                ariaLabel="Rate this film"
                sizeClass="text-2xl"
              />
              {stars > 0 && (
                <button
                  type="button"
                  onClick={() => setStars(0)}
                  className="text-[11px] uppercase tracking-widest text-[var(--color-ink-3)] hover:text-[var(--color-ink-1)] transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-1">
            <div className="text-[11px] text-[var(--color-ink-3)]">
              {trimmed.length === 0
                ? "We'll ask you a thoughtful question after."
                : `${trimmed.length} character${trimmed.length === 1 ? "" : "s"}`}
            </div>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2.5 rounded-full bg-[var(--color-accent)] text-[var(--color-surface-0)] text-sm font-medium tracking-tight hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {pending ? "Saving…" : "Save reflection"}
            </button>
          </div>

          {error && (
            <div className="text-sm text-red-300/90 mt-1" role="alert">
              {error}
            </div>
          )}
        </form>
      </GlassCard>
    </section>
  );
}
