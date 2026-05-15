/**
 * WhyCard — Pillar 2 (AI Taste) surface (SPEC §3.1 #2).
 *
 * Renders the personalized "Why this for you" panel on the title detail page.
 * Server Component — pulls active profile from the cookie, generates (or reads
 * cached) Why Card via the service, and draws three reason chips + a 1-2
 * sentence explanation in a glass card.
 *
 * Hidden gracefully when:
 *   - no active profile (signed out / picker not chosen)
 *   - the title has no overview to ground on
 *   - Gemini returns an error
 *
 * Wrap in <Suspense> so the rest of the page streams without waiting on the
 * AI call (~700-1500ms on cache miss).
 */

import { GlassCard } from "@/components/glass";
import { getActiveProfileId } from "@/lib/auth/active-profile";
import { getOrGenerateWhyCard } from "@/lib/why/service";

interface WhyCardProps {
  titleUuid: string;
}

export async function WhyCard({ titleUuid }: WhyCardProps) {
  const profileId = await getActiveProfileId();
  if (!profileId) return null;

  const result = await getOrGenerateWhyCard(profileId, titleUuid);
  if (!result) return null;

  const { card } = result;
  const sortedReasons = [...card.reasons].sort((a, b) => b.contribution - a.contribution);

  return (
    <section className="mx-auto max-w-5xl px-6 md:px-10 py-8">
      <GlassCard className="relative overflow-hidden">
        {/* Accent glow — single soft halo top-right, ties the card to the dial's palette */}
        <div
          aria-hidden
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, oklch(0.78 0.16 200 / 0.35), transparent 70%)",
          }}
        />

        <div className="relative">
          <header className="flex items-baseline justify-between gap-4">
            <h2 className="text-xs tracking-[0.22em] uppercase text-[var(--color-accent)]">
              Why this, for you
            </h2>
            <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--color-ink-3)]">
              Personalized
            </span>
          </header>

          <p className="mt-4 text-base md:text-lg leading-relaxed text-[var(--color-ink-0)] max-w-prose">
            {card.explanation_text}
          </p>

          <ul className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {sortedReasons.map((r, i) => (
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
    </section>
  );
}

/** Skeleton placeholder while the Why Card is generating. */
export function WhyCardSkeleton() {
  return (
    <section className="mx-auto max-w-5xl px-6 md:px-10 py-8">
      <GlassCard>
        <div className="h-3 w-32 rounded bg-white/10 animate-pulse" />
        <div className="mt-4 space-y-2">
          <div className="h-4 w-full rounded bg-white/5 animate-pulse" />
          <div className="h-4 w-4/5 rounded bg-white/5 animate-pulse" />
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-white/5 animate-pulse ring-1 ring-white/5"
            />
          ))}
        </div>
      </GlassCard>
    </section>
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
