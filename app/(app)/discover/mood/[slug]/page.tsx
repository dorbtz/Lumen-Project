/**
 * /discover/mood/[slug] — preset "moment" results (SPEC_COMPLETION §1 A5,
 * SPEC §4).
 *
 * Static slug → (valence, arousal [, runtimeMax]) map. Reuses the existing
 * Mood Dial pgvector query (`getTitlesByMood`); when the preset declares a
 * runtime cap we additionally filter by runtime (Time-Box style). No LLM.
 * Unknown slug → 404.
 */

import { AppChrome } from "@/components/chrome/AppChrome";
import { TitlePreviewCard, type TitlePreviewData } from "@/components/title/TitlePreviewCard";
import { getActiveProfileId } from "@/lib/auth/active-profile";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { getTitlesByMood } from "@/lib/db/queries";
import type { Title } from "@/lib/db/schema";
import { MOOD_PRESET_LIST, getMoodPreset } from "@/lib/discover/presets";
import { fitsBudget } from "@/lib/discover/timebox-rule";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

export function generateStaticParams() {
  return MOOD_PRESET_LIST.map((p) => ({ slug: p.slug }));
}

export default function MoodPresetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<PresetSkeleton />}>
      <MoodPreset params={params} />
    </Suspense>
  );
}

function PresetSkeleton() {
  return (
    <main className="min-h-dvh px-6 pt-32">
      <div className="mx-auto max-w-6xl grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
          <div key={i} className="aspect-[2/3] rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </main>
  );
}

async function MoodPreset({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const preset = getMoodPreset(slug);
  if (!preset) notFound();

  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    redirect("/profiles");
  }

  // Reuse the Mood Dial pgvector query, then apply the optional runtime cap.
  let rows = await getTitlesByMood(preset.valence, preset.arousal, 36);
  if (preset.runtimeMax != null) {
    const runtimeMax = preset.runtimeMax;
    rows = rows.filter((t) => fitsBudget(t.runtimeMin ?? null, runtimeMax));
  }

  return (
    <main className="relative min-h-dvh pb-24">
      <AppChrome />

      <section className="mx-auto max-w-6xl px-6 pt-32 pb-10 text-center">
        <p className="text-[11px] tracking-[0.28em] uppercase text-[var(--color-accent)]">
          A moment for
        </p>
        <h1
          className="mt-3 text-3xl md:text-5xl font-[var(--font-display)] tracking-tight leading-[1.04]"
          style={{ letterSpacing: "-0.025em" }}
        >
          {preset.label}
        </h1>
        <p className="mt-3 text-sm md:text-base text-[var(--color-ink-2)] max-w-prose mx-auto">
          {preset.blurb}
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        {rows.length === 0 ? (
          <p className="text-sm text-center text-[var(--color-ink-3)]">
            Nothing matches this moment yet — try the Mood Dial.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {rows.map((t) => (
              <TitlePreviewCard
                key={t.tmdbId}
                data={toPreview(t)}
                posterWidth={170}
                className="w-full"
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function toPreview(t: Title): TitlePreviewData {
  return {
    id: t.id,
    tmdbId: t.tmdbId,
    title: t.title,
    posterPath: t.posterPath,
    backdropPath: t.backdropPath ?? null,
    releaseYear: t.releaseYear ?? null,
    runtimeMin: t.runtimeMin ?? null,
    voteAverage: t.voteAverage ?? null,
    overview: t.overview ?? null,
    genres: (t.genres as string[] | null) ?? null,
  };
}
