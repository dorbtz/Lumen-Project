/**
 * /weather — Cinema Weather surface (SPEC §3.1 Pillar 4).
 *
 * Daily personalised "forecast" of what to watch, framed as a weather report.
 * Grounded in the viewer's recent journal mood trajectory + time of day.
 * Suspense + skeleton, same shape as /journal.
 */

import { AppChrome } from "@/components/chrome/AppChrome";
import { GlassCard } from "@/components/glass";
import { MoodRadar } from "@/components/weather/MoodRadar";
import { TitlePreviewCard } from "@/components/title/TitlePreviewCard";
import type { TitlePreviewData } from "@/components/title/TitlePreviewCard";
import { getActiveProfileId } from "@/lib/auth/active-profile";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { getCinemaWeather, type CinemaWeather } from "@/lib/weather/service";
import type { Title } from "@/lib/db/schema";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function WeatherPage() {
  return (
    <Suspense fallback={<WeatherSkeleton />}>
      <WeatherSurface />
    </Suspense>
  );
}

function WeatherSkeleton() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto max-w-4xl px-6 pt-28 pb-20 space-y-6">
        <div className="h-40 rounded-2xl bg-white/5 animate-pulse" />
        <div className="h-72 rounded-2xl bg-white/5 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-[2/3] rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  );
}

async function WeatherSurface() {
  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    redirect("/profiles");
  }

  const weather = await getCinemaWeather(profileId);
  const isEmpty = weather.points.length === 0 && weather.picks.length === 0;

  return (
    <main className="relative min-h-dvh pb-24">
      <AppChrome />

      <section className="mx-auto max-w-4xl px-6 pt-32 pb-6">
        <p className="text-[11px] tracking-[0.28em] uppercase text-[var(--color-accent)]">
          {weather.timeOfDay.replace("_", " ")}
        </p>
        <h1 className="mt-2 text-3xl md:text-4xl font-[var(--font-display)] tracking-tight">
          Today&apos;s cinema weather
        </h1>
      </section>

      {isEmpty ? (
        <EmptyState />
      ) : (
        <div className="mx-auto max-w-4xl px-6 space-y-8">
          <ForecastHero weather={weather} />
          <RadarSection weather={weather} />
          {weather.picks.length > 0 && <PicksSection picks={weather.picks} />}
        </div>
      )}
    </main>
  );
}

// ---------- sections ----------

function ForecastHero({ weather }: { weather: CinemaWeather }) {
  // Halo colour keyed to mood quadrant.
  const halo =
    weather.centroid.v > 0 && weather.centroid.a > 0
      ? "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.55 0.18 230 / 0.22), transparent 70%)" // sapphire — bright/intense
      : weather.centroid.v > 0
        ? "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.65 0.14 180 / 0.20), transparent 70%)" // emerald — calm-positive
        : "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.45 0.12 285 / 0.22), transparent 70%)"; // slate-violet — negative

  return (
    <GlassCard
      style={
        {
          "--halo": halo,
          backgroundImage: "var(--halo)",
        } as React.CSSProperties
      }
    >
      <p className="text-[10px] tracking-[0.28em] uppercase text-[var(--color-ink-3)] mb-3">
        {weather.headline}
      </p>
      <p className="text-base md:text-lg leading-relaxed text-[var(--color-ink-1)] max-w-prose">
        {weather.forecast}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-4 text-[11px] uppercase tracking-widest text-[var(--color-ink-3)]">
        <span>{weather.timeOfDay.replace("_", " ")}</span>
        {weather.points.length > 0 && (
          <span>{weather.points.length} recent {weather.points.length === 1 ? "entry" : "entries"}</span>
        )}
        <span className="text-[var(--color-accent)]">{weather.moodLabel}</span>
      </div>
    </GlassCard>
  );
}

function RadarSection({ weather }: { weather: CinemaWeather }) {
  return (
    <section>
      <h2 className="text-[10px] tracking-[0.22em] uppercase text-[var(--color-ink-3)] mb-3">
        Mood radar — last 14 days
      </h2>
      <GlassCard className="flex flex-col sm:flex-row items-center gap-6">
        <div className="w-full sm:w-[280px] sm:shrink-0">
          <MoodRadar
            centroid={weather.centroid}
            points={weather.points.map((p) => ({ v: p.v, a: p.a }))}
          />
        </div>
        <div className="space-y-2 text-sm text-[var(--color-ink-2)]">
          <p>
            <span className="text-[var(--color-ink-0)]">Valence</span>{" "}
            {weather.centroid.v > 0.2
              ? "leaning joyful"
              : weather.centroid.v < -0.2
                ? "leaning bleak"
                : "balanced"}
          </p>
          <p>
            <span className="text-[var(--color-ink-0)]">Arousal</span>{" "}
            {weather.centroid.a > 0.2
              ? "leaning intense"
              : weather.centroid.a < -0.2
                ? "leaning calm"
                : "even-keeled"}
          </p>
          <p className="text-[var(--color-ink-3)] text-xs leading-relaxed pt-1">
            Each dot is a journal entry. The larger pulsing dot is your mood centroid — the centre of gravity of the last {weather.points.length} watch{weather.points.length === 1 ? "" : "es"}.
          </p>
        </div>
      </GlassCard>
    </section>
  );
}

function titleToPreview(t: Title): TitlePreviewData {
  return {
    tmdbId: t.tmdbId,
    title: t.title,
    posterPath: t.posterPath,
    backdropPath: t.backdropPath,
    releaseYear: t.releaseYear ?? undefined,
    runtimeMin: t.runtimeMin ?? undefined,
    voteAverage: t.voteAverage ?? undefined,
    overview: t.overview ?? undefined,
    genres: t.genres ?? undefined,
  };
}

function PicksSection({ picks }: { picks: Title[] }) {
  return (
    <section className="pb-6">
      <h2 className="text-[10px] tracking-[0.22em] uppercase text-[var(--color-ink-3)] mb-4">
        Tonight&apos;s picks
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {picks.map((t) => (
          <TitlePreviewCard
            key={t.tmdbId}
            data={titleToPreview(t)}
            posterWidth={200}
            className="w-full"
          />
        ))}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <GlassCard>
        <h2 className="text-xs tracking-[0.22em] uppercase text-[var(--color-accent-secondary)]">
          No weather yet
        </h2>
        <p className="mt-3 text-base text-[var(--color-ink-1)] max-w-prose">
          Your weather will form as you journal. Open a film, write a few lines, and Lumen will
          start reading your mood.
        </p>
        <Link
          href="/journal"
          className="inline-block mt-5 text-sm text-[var(--color-accent)] hover:underline"
        >
          Start journaling →
        </Link>
      </GlassCard>
    </section>
  );
}
