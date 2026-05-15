/**
 * Journal index (SPEC §3.1 #3 + §3.2 secondary surface).
 *
 * Chronological feed of the active profile's Echo Journal entries — poster
 * thumb, title, watched-at date, reflection, generated question. Empty state
 * nudges the viewer to open a title and journal their first watch.
 */

import { AppChrome } from "@/components/chrome/AppChrome";
import { GlassCard } from "@/components/glass";
import { getActiveProfileId } from "@/lib/auth/active-profile";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { type JournalEntryWithTitle, listJournalEntries } from "@/lib/journal/service";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function JournalPage() {
  return (
    <Suspense fallback={<JournalSkeleton />}>
      <JournalIndex />
    </Suspense>
  );
}

function JournalSkeleton() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto max-w-4xl px-6 pt-28 pb-20 space-y-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </main>
  );
}

async function JournalIndex() {
  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    redirect("/profiles");
  }

  const entries = await listJournalEntries(profileId, 80);
  const grouped = groupByWeek(entries);

  return (
    <main className="min-h-dvh pb-24">
      <AppChrome />

      <section className="mx-auto max-w-4xl px-6 pt-32 pb-6">
        <h1 className="text-3xl md:text-4xl font-[var(--font-display)] tracking-tight">
          Your journal
        </h1>
        <p className="mt-2 text-sm text-[var(--color-ink-2)] max-w-prose">
          A living record of the films you&apos;ve watched and what they left with you.
        </p>
      </section>

      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mx-auto max-w-4xl px-6 space-y-10">
          {grouped.map(({ label, items }) => (
            <section key={label}>
              <h2 className="text-[10px] tracking-[0.22em] uppercase text-[var(--color-ink-3)] mb-3">
                {label}
              </h2>
              <ul className="space-y-4">
                {items.map((e) => (
                  <li key={e.id}>
                    <JournalEntryCard entry={e} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <GlassCard>
        <h2 className="text-xs tracking-[0.22em] uppercase text-[var(--color-accent-secondary)]">
          No entries yet
        </h2>
        <p className="mt-3 text-base text-[var(--color-ink-1)] max-w-prose">
          Open a title you&apos;ve seen and write a few lines. Lumen will respond with a
          question worth sitting with.
        </p>
        <Link
          href="/home"
          className="inline-block mt-5 text-sm text-[var(--color-accent)] hover:underline"
        >
          Browse films →
        </Link>
      </GlassCard>
    </section>
  );
}

function JournalEntryCard({ entry }: { entry: JournalEntryWithTitle }) {
  const poster = entry.title.posterPath
    ? `https://image.tmdb.org/t/p/w185${entry.title.posterPath}`
    : null;
  return (
    <Link
      href={`/title/${entry.title.tmdbId}`}
      className="block transition-transform hover:-translate-y-0.5"
    >
      <GlassCard className="flex gap-5">
        <div className="shrink-0 w-20 md:w-24 aspect-[2/3] rounded-lg overflow-hidden bg-[var(--color-surface-2)] ring-1 ring-white/10">
          {poster && (
            <Image
              src={poster}
              alt={entry.title.title}
              width={185}
              height={278}
              className="object-cover w-full h-full"
              loading="lazy"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-lg tracking-tight font-[var(--font-display)] truncate">
              {entry.title.title}
              {entry.title.releaseYear && (
                <span className="ml-2 text-sm text-[var(--color-ink-3)]">
                  {entry.title.releaseYear}
                </span>
              )}
            </h3>
            <time className="text-[11px] uppercase tracking-widest text-[var(--color-ink-3)] shrink-0">
              {formatWatchedAt(entry.watchedAt)}
            </time>
          </div>
          {entry.reflection && (
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-1)] line-clamp-3">
              {entry.reflection}
            </p>
          )}
          {entry.generatedQuestion && (
            <p className="mt-3 text-sm italic text-[var(--color-accent-secondary)] line-clamp-2">
              &ldquo;{entry.generatedQuestion}&rdquo;
            </p>
          )}
        </div>
      </GlassCard>
    </Link>
  );
}

/** Group entries into "This week", "Last week", "Mon YYYY" buckets. */
function groupByWeek(
  entries: JournalEntryWithTitle[],
): Array<{ label: string; items: JournalEntryWithTitle[] }> {
  const now = new Date();
  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const buckets = new Map<string, JournalEntryWithTitle[]>();
  for (const e of entries) {
    let key: string;
    if (e.watchedAt >= thisWeekStart) key = "This week";
    else if (e.watchedAt >= lastWeekStart) key = "Last week";
    else
      key = e.watchedAt.toLocaleString(undefined, { month: "long", year: "numeric" });
    const list = buckets.get(key);
    if (list) list.push(e);
    else buckets.set(key, [e]);
  }
  return [...buckets.entries()].map(([label, items]) => ({ label, items }));
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const dow = out.getDay(); // 0 = Sun
  out.setDate(out.getDate() - dow);
  return out;
}

function formatWatchedAt(d: Date): string {
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleString(undefined, { month: "short", day: "numeric" });
}
