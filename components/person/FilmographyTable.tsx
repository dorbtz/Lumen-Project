"use client";

/**
 * FilmographyTable — sortable filmography for /person/[tmdb_id].
 * Client-side sort by year (asc/desc). No heavy lib — just a useState.
 */

import Link from "next/link";
import { useMemo, useState } from "react";

export type FilmographyRow = {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  role: string;
  kind: "cast" | "crew";
  year: number | null;
};

type SortDir = "desc" | "asc";

export function FilmographyTable({ rows }: { rows: FilmographyRow[] }) {
  const [dir, setDir] = useState<SortDir>("desc");
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const ay = a.year ?? Number.NEGATIVE_INFINITY;
      const by = b.year ?? Number.NEGATIVE_INFINITY;
      return dir === "desc" ? by - ay : ay - by;
    });
    return copy;
  }, [rows, dir]);

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-widest text-[var(--color-ink-3)] border-b border-white/10">
            <th className="py-2 pr-4">
              <button
                type="button"
                onClick={() => setDir((d) => (d === "desc" ? "asc" : "desc"))}
                className="inline-flex items-center gap-1 hover:text-[var(--color-ink-0)]"
              >
                Year
                <span aria-hidden>{dir === "desc" ? "↓" : "↑"}</span>
              </button>
            </th>
            <th className="py-2 pr-4">Title</th>
            <th className="py-2 pr-4">Role</th>
            <th className="py-2 pr-4">Kind</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={`${r.id}-${r.kind}-${r.role}`} className="border-b border-white/5">
              <td className="py-2 pr-4 text-[var(--color-ink-2)] tabular-nums">{r.year ?? "—"}</td>
              <td className="py-2 pr-4">
                {r.mediaType === "movie" ? (
                  <Link
                    href={`/title/${r.id}`}
                    className="text-[var(--color-ink-0)] hover:text-[var(--color-accent)] transition-colors"
                  >
                    {r.title}
                  </Link>
                ) : (
                  <span className="text-[var(--color-ink-0)]">{r.title}</span>
                )}
              </td>
              <td className="py-2 pr-4 text-[var(--color-ink-2)]">{r.role || "—"}</td>
              <td className="py-2 pr-4 text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
                {r.kind}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
