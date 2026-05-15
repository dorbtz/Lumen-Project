/**
 * Person detail (SPEC §4 + §14 Week 2).
 *
 *   Bio + profile image
 *   Known For (top 6 by popularity, movie credits)
 *   Filmography table — sortable client-side by year
 *
 * Uses TMDB /person/{id}/combined_credits via append_to_response.
 */

import { AppChrome } from "@/components/chrome/AppChrome";
import { GlassCard } from "@/components/glass";
import { type FilmographyRow, FilmographyTable } from "@/components/person/FilmographyTable";
import { type TmdbPerson, tmdb } from "@/lib/tmdb/client";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface PageProps {
  params: Promise<{ tmdb_id: string }>;
}

export default function PersonPage({ params }: PageProps) {
  return (
    <Suspense fallback={<PersonSkeleton />}>
      <PersonDetail params={params} />
    </Suspense>
  );
}

function PersonSkeleton() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto max-w-6xl px-6 pt-32 pb-20 space-y-6">
        <div className="h-72 rounded-2xl bg-white/5 animate-pulse" />
        <div className="h-96 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    </main>
  );
}

async function PersonDetail({ params }: PageProps) {
  const { tmdb_id } = await params;
  const id = Number(tmdb_id);
  if (!Number.isFinite(id)) notFound();

  let person: TmdbPerson;
  try {
    person = await tmdb.person(id);
  } catch {
    notFound();
  }

  const knownFor = pickKnownFor(person);
  const filmography = buildFilmography(person);

  const photo = tmdb.profile(person.profile_path, "h632");
  const birthLine = formatBirthLine(person);

  return (
    <main className="relative min-h-dvh pb-24">
      <AppChrome />

      {/* Ambient — profile photo as a heavily blurred backdrop. Gives the page
       * cinematic depth without a dedicated hero zone. Fades into surface-0. */}
      {photo && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[55dvh] overflow-hidden pointer-events-none -z-0"
        >
          <Image
            src={photo}
            alt=""
            fill
            sizes="100vw"
            className="object-cover scale-125 blur-3xl opacity-25"
            priority={false}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-surface-0)]/40 via-[var(--color-surface-0)]/70 to-[var(--color-surface-0)]" />
        </div>
      )}

      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-32 pb-10 grid md:grid-cols-[280px_1fr] gap-10 items-start">
        <div className="mx-auto w-full max-w-[200px] md:max-w-none rounded-2xl overflow-hidden bg-[var(--color-surface-2)] aspect-[2/3] shadow-[0_30px_80px_-20px_oklch(0_0_0_/_0.6)] ring-1 ring-white/10">
          {photo ? (
            <Image
              src={photo}
              alt={person.name}
              width={560}
              height={840}
              className="object-cover w-full h-auto"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-ink-3)]">
              No photo
            </div>
          )}
        </div>
        <div>
          <p className="text-[10px] tracking-[0.28em] uppercase text-[var(--color-accent)]">
            {person.known_for_department ?? "Person"}
          </p>
          <h1
            className="mt-3 text-2xl sm:text-4xl md:text-6xl font-[var(--font-display)] tracking-tight leading-[1.04]"
            style={{ letterSpacing: "-0.025em" }}
          >
            {person.name}
          </h1>
          {birthLine && (
            <p className="mt-3 text-[11px] uppercase tracking-widest text-[var(--color-ink-2)]">
              {birthLine}
            </p>
          )}
          {person.biography && (
            <p className="mt-6 text-sm md:text-base text-[var(--color-ink-1)] leading-relaxed max-w-prose line-clamp-[12]">
              {person.biography}
            </p>
          )}
        </div>
      </section>

      {knownFor.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-8">
          <h2 className="text-xs tracking-[0.22em] uppercase text-[var(--color-accent)] mb-4">
            Known for
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {knownFor.map((k) => (
              <li key={k.id}>
                <Link href={`/title/${k.id}`} className="block group">
                  <div className="aspect-[2/3] relative rounded-xl overflow-hidden bg-[var(--color-surface-2)] group-hover:scale-[1.03] transition-transform duration-300">
                    {k.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w342${k.poster_path}`}
                        alt={k.title}
                        fill
                        sizes="160px"
                        className="object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[var(--color-ink-3)] text-xs">
                        No poster
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-xs tracking-tight text-[var(--color-ink-0)] line-clamp-1">
                    {k.title}
                  </div>
                  {k.year && (
                    <div className="text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
                      {k.year}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {filmography.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 py-8">
          <h2 className="text-xs tracking-[0.22em] uppercase text-[var(--color-accent)] mb-4">
            Filmography
          </h2>
          <GlassCard>
            <FilmographyTable rows={filmography} />
          </GlassCard>
        </section>
      )}
    </main>
  );
}

function pickKnownFor(
  p: TmdbPerson,
): Array<{ id: number; title: string; year: number | null; poster_path: string | null }> {
  const movieCast = p.movie_credits?.cast ?? [];
  const movieCrew = p.movie_credits?.crew ?? [];
  // Prefer the department they're known for
  const dept = p.known_for_department;
  const prefer =
    dept === "Directing" || dept === "Writing" || dept === "Editing" || dept === "Production"
      ? movieCrew
      : movieCast;
  const seen = new Set<number>();
  const merged = [...prefer, ...movieCast, ...movieCrew];
  return merged
    .filter((m) => m.poster_path)
    .filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    })
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, 6)
    .map((m) => ({
      id: m.id,
      title: m.title ?? "—",
      year: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
      poster_path: m.poster_path,
    }));
}

function buildFilmography(p: TmdbPerson): FilmographyRow[] {
  const combined = p.combined_credits;
  const all: FilmographyRow[] = [];
  for (const c of combined?.cast ?? []) {
    all.push({
      id: c.id,
      mediaType: c.media_type ?? "movie",
      title: c.title ?? c.name ?? "—",
      role: c.character ?? "",
      kind: "cast",
      year: yearFrom(c.release_date ?? c.first_air_date),
    });
  }
  for (const c of combined?.crew ?? []) {
    all.push({
      id: c.id,
      mediaType: c.media_type ?? "movie",
      title: c.title ?? c.name ?? "—",
      role: c.job ?? "",
      kind: "crew",
      year: yearFrom(c.release_date ?? c.first_air_date),
    });
  }
  // Most recent first by default
  all.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  return all;
}

function yearFrom(d?: string): number | null {
  if (!d) return null;
  const y = Number(d.slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

function formatBirthLine(p: TmdbPerson): string | null {
  const parts: string[] = [];
  if (p.birthday) parts.push(`Born ${p.birthday}`);
  if (p.deathday) parts.push(`Died ${p.deathday}`);
  if (p.place_of_birth) parts.push(p.place_of_birth);
  return parts.length ? parts.join(" · ") : null;
}
