/**
 * /recap/share/[token] — public, read-only recap (SPEC_COMPLETION §1 A2).
 *
 * No auth, no profile data beyond the recap story itself. Unknown or rotated
 * tokens 404. Spotify-Wrapped feel: headline + narrative + first moment.
 */

import { posterUrl } from "@/lib/img/poster";
import { getRecapByShareToken } from "@/lib/recap/share";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const recap = await getRecapByShareToken(token);
  if (!recap) return { title: "Recap — Lumen" };
  return {
    title: `${recap.headline} — Lumen`,
    description: recap.story.slice(0, 160),
    openGraph: {
      title: recap.headline,
      description: "A living cinema recap, made with Lumen.",
    },
  };
}

export default async function PublicRecapPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const recap = await getRecapByShareToken(token);
  if (!recap) notFound();

  return (
    <main className="min-h-dvh">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 80% at 70% 12%, oklch(0.62 0.18 200 / 0.18), transparent 60%), radial-gradient(50% 70% at 18% 88%, oklch(0.60 0.15 160 / 0.14), transparent 60%)",
        }}
      />

      <article className="mx-auto max-w-3xl px-6 pt-24 pb-20">
        <p className="text-[11px] tracking-[0.28em] uppercase text-[var(--color-accent)]">
          A Lumen Recap
        </p>
        <h1
          className="mt-3 text-3xl md:text-5xl font-[var(--font-display)] tracking-tight leading-[1.04]"
          style={{ letterSpacing: "-0.025em" }}
        >
          {recap.headline}
        </h1>

        <section className="mt-8 glass-regular glass-specular rounded-3xl ring-1 ring-white/5 p-7">
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
        </section>

        {recap.firstMoment && (
          <section className="mt-8">
            <h2 className="text-[10px] tracking-[0.22em] uppercase text-[var(--color-ink-2)] mb-3">
              A defining moment
            </h2>
            <div className="flex gap-4 items-start glass-thin rounded-2xl ring-1 ring-white/5 p-5">
              <div className="shrink-0 w-16 aspect-[2/3] rounded-lg overflow-hidden bg-[var(--color-surface-2)] ring-1 ring-white/10">
                {recap.firstMoment.posterPath && (
                  <Image
                    src={posterUrl(recap.firstMoment.posterPath, "w185") ?? ""}
                    alt={recap.firstMoment.title}
                    width={185}
                    height={278}
                    className="object-cover w-full h-full"
                    loading="lazy"
                  />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-[var(--font-display)] tracking-tight">
                  {recap.firstMoment.title}
                </h3>
                <p className="mt-1.5 text-sm leading-snug text-[var(--color-ink-1)]">
                  {recap.firstMoment.beat}
                </p>
              </div>
            </div>
          </section>
        )}

        <footer className="mt-12 flex items-center justify-between border-t border-white/5 pt-6">
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
            Made with Lumen
          </p>
          <Link href="/" className="text-sm text-[var(--color-accent)] hover:underline">
            Build your own →
          </Link>
        </footer>
      </article>
    </main>
  );
}
