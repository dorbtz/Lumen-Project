/**
 * Watchlist index (SPEC §3.2 secondary surface).
 *
 * Chronological feed of the active profile's default watchlist — poster thumb,
 * title, year, date added. Grouped by week bucket like the Journal page.
 * Empty state nudges the viewer to browse and add films.
 */

import { AppChrome } from "@/components/chrome/AppChrome";
import { GlassCard } from "@/components/glass";
import { TitlePreviewCard } from "@/components/title/TitlePreviewCard";
import { getActiveProfileId } from "@/lib/auth/active-profile";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { type WatchlistItemWithTitle, listWatchlistItems } from "@/lib/watchlist/service";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function WatchlistPage() {
  return (
    <Suspense fallback={<WatchlistSkeleton />}>
      <WatchlistIndex />
    </Suspense>
  );
}

function WatchlistSkeleton() {
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

async function WatchlistIndex() {
  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    redirect("/profiles");
  }

  const items = await listWatchlistItems(profileId, 100);
  const grouped = groupByWeek(items);

  return (
    <main className="min-h-dvh pb-24">
      <AppChrome />

      <section className="mx-auto max-w-4xl px-6 pt-32 pb-6">
        <h1 className="text-3xl md:text-4xl font-[var(--font-display)] tracking-tight">
          Your watchlist
        </h1>
        <p className="mt-2 text-sm text-[var(--color-ink-2)] max-w-prose">
          Films you&apos;ve earmarked — open any title and hit &ldquo;Add to watchlist&rdquo;.
        </p>
      </section>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mx-auto max-w-4xl px-6 space-y-10">
          {grouped.map(({ label, items: groupItems }) => (
            <section key={label}>
              <h2 className="text-[10px] tracking-[0.22em] uppercase text-[var(--color-ink-3)] mb-3">
                {label}
              </h2>
              <div className="flex flex-wrap gap-4">
                {groupItems.map((item) => (
                  <TitlePreviewCard
                    key={item.titleId}
                    data={{
                      id: item.title.id,
                      tmdbId: item.title.tmdbId,
                      title: item.title.title,
                      posterPath: item.title.posterPath,
                      releaseYear: item.title.releaseYear,
                    }}
                    posterWidth={148}
                  />
                ))}
              </div>
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
          Your watchlist is empty
        </h2>
        <p className="mt-3 text-base text-[var(--color-ink-1)] max-w-prose">
          Browse films and hit &ldquo;Add to watchlist&rdquo; on any title — it will appear here so
          you never lose track of what to watch next.
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

/** Group items into "This week", "Last week", "Mon YYYY" buckets. */
function groupByWeek(
  items: WatchlistItemWithTitle[],
): Array<{ label: string; items: WatchlistItemWithTitle[] }> {
  const now = new Date();
  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const buckets = new Map<string, WatchlistItemWithTitle[]>();
  for (const item of items) {
    let key: string;
    if (item.addedAt >= thisWeekStart) key = "This week";
    else if (item.addedAt >= lastWeekStart) key = "Last week";
    else key = item.addedAt.toLocaleString(undefined, { month: "long", year: "numeric" });
    const list = buckets.get(key);
    if (list) list.push(item);
    else buckets.set(key, [item]);
  }
  return [...buckets.entries()].map(([label, items]) => ({ label, items }));
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay());
  return out;
}
