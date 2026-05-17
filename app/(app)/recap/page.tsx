/**
 * /recap — Living journal recap (SPEC §3.1 Pillar 4).
 *
 *   Headline + 2-paragraph narrative + up to 3 "moments" with poster cards.
 *   Rebuilt on demand if the cached story is older than 24h. Empty state
 *   nudges the viewer to log a few journal entries first.
 *
 * Streams independently via Suspense — the Gemini call can take 1-2s on a
 * cache miss and we don't want it to block the rest of the page.
 */

import { ViewedRecapBeacon } from "@/components/analytics/ViewedRecapBeacon";
import { AppChrome } from "@/components/chrome/AppChrome";
import { GlassCard } from "@/components/glass";
import { ShareButton } from "@/components/recap/ShareButton";
import { getActiveProfileId } from "@/lib/auth/active-profile";
import { getOrCreateAccount, profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { getProfileById } from "@/lib/db/queries";
import { posterUrl } from "@/lib/img/poster";
import { titleHref } from "@/lib/title-href";
import { type ResolvedRecap, getOrGenerateRecap } from "@/lib/recap/service";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function RecapPage() {
  return (
    <main className="min-h-dvh pb-24">
      <AppChrome />
      <Suspense fallback={<RecapSkeleton />}>
        <RecapSurface />
      </Suspense>
    </main>
  );
}

function RecapSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-32 space-y-8">
      <div className="h-8 w-64 rounded bg-white/5 animate-pulse" />
      <div className="h-40 rounded-2xl bg-white/5 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="aspect-[2/3] rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

async function RecapSurface() {
  await getOrCreateAccount();
  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    redirect("/profiles");
  }
  const profile = await getProfileById(profileId);
  if (!profile) redirect("/profiles");

  const result = await getOrGenerateRecap(profileId);

  if (result.kind === "ok") {
    return (
      <RecapBody
        recap={result.recap}
        profileName={profile.name}
        avatarColor={profile.avatarColor}
      />
    );
  }

  if (result.kind === "no_entries") {
    return <EmptyNoEntries />;
  }

  return <EmptyGenerationFailed reason={result.reason} />;
}

function EmptyNoEntries() {
  return (
    <section className="mx-auto max-w-2xl px-6 pt-32">
      <p className="text-[11px] tracking-[0.28em] uppercase text-[var(--color-accent)]">Recap</p>
      <h1
        className="mt-3 text-3xl md:text-4xl font-[var(--font-display)] tracking-tight"
        style={{ letterSpacing: "-0.02em" }}
      >
        Your story is still being written.
      </h1>
      <div className="mt-8">
        <GlassCard>
          <p className="text-base text-[var(--color-ink-1)] leading-relaxed">
            Lumen builds a personal recap from your journal entries. Log a few films you&apos;ve
            seen — even a sentence each — and a story will be waiting here.
          </p>
          <div className="mt-5 flex gap-4">
            <Link href="/home" className="text-sm text-[var(--color-accent)] hover:underline">
              Find a film to watch →
            </Link>
            <Link
              href="/journal"
              className="text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink-0)] transition-colors"
            >
              Open journal
            </Link>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}

function EmptyGenerationFailed({ reason }: { reason: "quota" | "unknown" }) {
  const quota = reason === "quota";
  return (
    <section className="mx-auto max-w-2xl px-6 pt-32">
      <p className="text-[11px] tracking-[0.28em] uppercase text-[var(--color-accent)]">Recap</p>
      <h1
        className="mt-3 text-3xl md:text-4xl font-[var(--font-display)] tracking-tight"
        style={{ letterSpacing: "-0.02em" }}
      >
        {quota ? "Your story is queued for tomorrow." : "Couldn't write your recap right now."}
      </h1>
      <div className="mt-8">
        <GlassCard>
          <p className="text-base text-[var(--color-ink-1)] leading-relaxed">
            {quota
              ? "Lumen runs on a free AI tier that resets every 24 hours, and today's quota is spent. Your journal is safe — come back tomorrow and we'll have your recap ready."
              : "Something went wrong building your recap. Your journal is fine — try again in a few minutes."}
          </p>
          <div className="mt-5 flex gap-4">
            <Link href="/journal" className="text-sm text-[var(--color-accent)] hover:underline">
              Open journal →
            </Link>
            <Link
              href="/home"
              className="text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink-0)] transition-colors"
            >
              Back to home
            </Link>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}

function RecapBody({
  recap,
  profileName,
  avatarColor,
}: {
  recap: ResolvedRecap;
  profileName: string;
  avatarColor: string | null;
}) {
  return (
    <article className="mx-auto max-w-3xl px-6 pt-32 pb-12">
      <ViewedRecapBeacon entryCount={recap.entryCount} />
      <header className="flex items-center gap-4">
        <span
          aria-hidden
          className="size-12 rounded-2xl flex items-center justify-center text-lg font-[var(--font-display)] text-black shrink-0 ring-1 ring-white/15"
          style={{ background: avatarColor ?? "#FFB070" }}
        >
          {profileName.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.28em] uppercase text-[var(--color-accent)]">
            Recap · {profileName}
          </p>
          <p className="text-[11px] uppercase tracking-widest text-[var(--color-ink-3)]">
            {recap.entryCount} {recap.entryCount === 1 ? "entry" : "entries"} ·{" "}
            {recap.windowDays === 0 ? "all time" : `last ${recap.windowDays} days`}
          </p>
        </div>
      </header>

      <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
        <h1
          className="text-3xl md:text-5xl font-[var(--font-display)] tracking-tight leading-[1.04] flex-1 min-w-0"
          style={{ letterSpacing: "-0.025em" }}
        >
          {recap.headline}
        </h1>
        <ShareButton />
      </div>

      <section className="mt-8">
        <GlassCard className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute -top-24 -left-20 w-72 h-72 rounded-full pointer-events-none opacity-40 blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, oklch(0.62 0.18 200 / 0.40), transparent 70%)",
            }}
          />
          <div className="relative">
            {recap.story.split(/\n\s*\n/).map((para, i) => (
              <p
                // biome-ignore lint/suspicious/noArrayIndexKey: stable paragraph order
                key={i}
                className={`text-base md:text-lg leading-relaxed text-[var(--color-ink-0)] ${
                  i > 0 ? "mt-4" : ""
                }`}
              >
                {para}
              </p>
            ))}
          </div>
        </GlassCard>
      </section>

      {recap.moments.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[10px] tracking-[0.22em] uppercase text-[var(--color-ink-2)] mb-4">
            Moments
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recap.moments.map((m, i) => (
              <li key={`${m.tmdbId}-${i}`}>
                <Link
                  href={titleHref(m.tmdbId, m.type)}
                  className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-2xl"
                >
                  <GlassCard weight="thin" interactive className="flex gap-4 items-start">
                    <div className="shrink-0 w-16 aspect-[2/3] rounded-lg overflow-hidden bg-[var(--color-surface-2)] ring-1 ring-white/10">
                      {m.posterPath && (
                        <Image
                          src={posterUrl(m.posterPath, "w185") ?? ""}
                          alt={m.title}
                          width={185}
                          height={278}
                          className="object-cover w-full h-full"
                          loading="lazy"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-[var(--font-display)] tracking-tight line-clamp-1">
                        {m.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-snug text-[var(--color-ink-1)] line-clamp-4">
                        {m.beat}
                      </p>
                    </div>
                  </GlassCard>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
        Generated {formatRelative(recap.generatedAt)} ·{" "}
        {recap.source === "cached" ? "cached" : "fresh"}
      </p>
    </article>
  );
}

function formatRelative(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}
