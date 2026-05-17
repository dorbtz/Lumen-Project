"use client";

/**
 * JournalList — the journal feed with manage/delete (selected or all).
 *
 * Server component passes the entries; this island adds a "Manage" mode
 * with per-entry selection, "Delete selected", and "Delete all". Deletes
 * go through the profile-scoped `deleteJournalAction` server action.
 */

import { type DeleteJournalResult, deleteJournalAction } from "@/app/(app)/journal/actions";
import { GlassCard } from "@/components/glass";
import type { JournalEntryWithTitle } from "@/lib/journal/service";
import { posterUrl } from "@/lib/img/poster";
import { titleHref } from "@/lib/title-href";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function JournalList({ entries }: { entries: JournalEntryWithTitle[] }) {
  const router = useRouter();
  const [manage, setManage] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmAll, setConfirmAll] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const groups = groupByWeek(entries);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const run = (args: { ids?: string[]; all?: boolean }) => {
    setError(null);
    startTransition(async () => {
      const res: DeleteJournalResult = await deleteJournalAction(args);
      if (!res.ok) {
        setError(res.error ?? "Could not delete");
        return;
      }
      setSelected(new Set());
      setManage(false);
      setConfirmAll(false);
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-6">
      <div className="flex flex-wrap items-center justify-end gap-3 pb-4">
        {error && (
          <span className="mr-auto text-sm text-red-300/90" role="alert">
            {error}
          </span>
        )}
        {!manage ? (
          <button
            type="button"
            onClick={() => setManage(true)}
            className="text-xs uppercase tracking-widest text-[var(--color-ink-3)] hover:text-[var(--color-ink-0)] transition-colors"
          >
            Manage
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setManage(false);
                setSelected(new Set());
                setConfirmAll(false);
              }}
              className="text-xs uppercase tracking-widest text-[var(--color-ink-3)] hover:text-[var(--color-ink-0)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selected.size === 0 || pending}
              onClick={() => run({ ids: [...selected] })}
              className="min-h-[36px] px-4 rounded-full text-sm bg-white/8 ring-1 ring-white/15 text-[var(--color-ink-0)] hover:bg-white/12 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {pending ? "Deleting…" : `Delete selected (${selected.size})`}
            </button>
            {confirmAll ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => run({ all: true })}
                className="min-h-[36px] px-4 rounded-full text-sm bg-red-500/80 ring-1 ring-red-400/60 text-white hover:bg-red-500 disabled:opacity-40 transition-colors"
              >
                {pending ? "Deleting…" : "Confirm delete all"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmAll(true)}
                className="min-h-[36px] px-4 rounded-full text-sm text-red-300/90 ring-1 ring-red-400/30 hover:bg-red-500/10 transition-colors"
              >
                Delete all
              </button>
            )}
          </>
        )}
      </div>

      <div className="space-y-10">
        {groups.map(({ label, items }) => (
          <section key={label}>
            <h2 className="text-[10px] tracking-[0.22em] uppercase text-[var(--color-ink-3)] mb-3">
              {label}
            </h2>
            <ul className="space-y-4">
              {items.map((e) => (
                <li key={e.id} className="flex items-start gap-3">
                  {manage && (
                    <input
                      type="checkbox"
                      checked={selected.has(e.id)}
                      onChange={() => toggle(e.id)}
                      aria-label={`Select ${e.title.title}`}
                      className="mt-6 w-5 h-5 shrink-0 accent-[var(--color-accent)] cursor-pointer"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <JournalEntryCard entry={e} linked={!manage} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function JournalEntryCard({
  entry,
  linked,
}: {
  entry: JournalEntryWithTitle;
  linked: boolean;
}) {
  const poster = posterUrl(entry.title.posterPath, "w185");
  const body = (
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
  );
  if (!linked) return body;
  return (
    <Link
      href={titleHref(entry.title.tmdbId, entry.title.type)}
      className="block transition-transform hover:-translate-y-0.5"
    >
      {body}
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
    const watched = new Date(e.watchedAt);
    let key: string;
    if (watched >= thisWeekStart) key = "This week";
    else if (watched >= lastWeekStart) key = "Last week";
    else key = watched.toLocaleString(undefined, { month: "long", year: "numeric" });
    const list = buckets.get(key);
    if (list) list.push(e);
    else buckets.set(key, [e]);
  }
  return [...buckets.entries()].map(([label, items]) => ({ label, items }));
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay());
  return out;
}

function formatWatchedAt(d: Date | string): string {
  const date = new Date(d);
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleString(undefined, { month: "short", day: "numeric" });
}
