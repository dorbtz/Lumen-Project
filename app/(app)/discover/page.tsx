/**
 * /discover — the calm glass discovery hub (SPEC_COMPLETION §1 A5, SPEC §4).
 *
 * Links the Mood Dial, Time-Box, and 6 preset "moments". Profile-gated like
 * the rest of /(app). Static composition — no client logic, no LLM.
 */

import { AppChrome } from "@/components/chrome/AppChrome";
import { getActiveProfileId } from "@/lib/auth/active-profile";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { MOOD_PRESET_LIST } from "@/lib/discover/presets";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function DiscoverHubPage() {
  return (
    <Suspense fallback={<HubSkeleton />}>
      <DiscoverHub />
    </Suspense>
  );
}

function HubSkeleton() {
  return (
    <main className="min-h-dvh px-6 pt-32">
      <div className="mx-auto max-w-5xl grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-3xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </main>
  );
}

async function DiscoverHub() {
  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    redirect("/profiles");
  }

  return (
    <main className="relative min-h-dvh pb-24">
      <AppChrome />

      <section className="mx-auto max-w-5xl px-6 pt-32 pb-8 text-center">
        <p className="text-[11px] tracking-[0.28em] uppercase text-[var(--color-accent)]">
          Discover
        </p>
        <h1
          className="mt-3 text-3xl md:text-5xl font-[var(--font-display)] tracking-tight leading-[1.04]"
          style={{ letterSpacing: "-0.025em" }}
        >
          Find your tonight
        </h1>
        <p className="mt-3 text-sm md:text-base text-[var(--color-ink-2)] max-w-prose mx-auto">
          Discover by feeling, by time, or by a moment.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 grid gap-4 sm:grid-cols-2">
        <HubTile
          href="/discover/mood"
          eyebrow="By feeling"
          title="Mood Dial"
          blurb="Drag a 2D affect orb — films stream in as you move."
        />
        <HubTile
          href="/discover/timebox"
          eyebrow="By time"
          title="Time-Box"
          blurb="Set a runtime budget; we rank what fits your taste."
        />
      </section>

      <section className="mx-auto max-w-5xl px-6 mt-10">
        <h2 className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink-3)] mb-4">
          Moments
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MOOD_PRESET_LIST.map((p) => (
            <Link
              key={p.slug}
              href={`/discover/mood/${p.slug}`}
              className="group glass-thin rounded-2xl ring-1 ring-white/5 p-5 min-h-[44px] transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-accent)]/40"
            >
              <p className="text-base font-[var(--font-display)] tracking-tight">{p.label}</p>
              <p className="mt-1 text-xs text-[var(--color-ink-3)] leading-relaxed">{p.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function HubTile({
  href,
  eyebrow,
  title,
  blurb,
}: {
  href: string;
  eyebrow: string;
  title: string;
  blurb: string;
}) {
  return (
    <Link
      href={href}
      className="group glass-regular glass-specular rounded-3xl ring-1 ring-white/5 p-7 transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-accent)]/40"
    >
      <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--color-accent)]">
        {eyebrow}
      </p>
      <p
        className="mt-2 text-2xl md:text-3xl font-[var(--font-display)] tracking-tight"
        style={{ letterSpacing: "-0.025em" }}
      >
        {title}
      </p>
      <p className="mt-2 text-sm text-[var(--color-ink-2)] leading-relaxed">{blurb}</p>
    </Link>
  );
}
