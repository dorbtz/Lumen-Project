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
import { WhyCardFlip } from "@/components/title/WhyCardFlip";
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

  // B4: hand the data to the client flip presentation (3D rotate with
  // spring damping:26 stiffness:220; reduced-motion → cross-fade).
  return (
    <WhyCardFlip
      explanationText={card.explanation_text}
      reasons={card.reasons.map((r) => ({
        dimension: r.dimension,
        contribution: r.contribution,
        copy: r.copy,
      }))}
    />
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
            <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse ring-1 ring-white/5" />
          ))}
        </div>
      </GlassCard>
    </section>
  );
}
