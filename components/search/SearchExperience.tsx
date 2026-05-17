"use client";

/**
 * SearchExperience — the /search page's interactive surface (plan WS6).
 *
 * Glass search field + Netflix-style poster grid. Debounced calls to the
 * `searchCatalog` server action; renders franchise/collection groups first
 * ("marvel" → the MCU), then loose titles, then a People strip. Keeps the
 * URL's ?q= in sync so results are linkable/shareable.
 */

import { type SearchCatalogResult, searchCatalog } from "@/app/(app)/search/actions";
import { TitlePreviewCard } from "@/components/title/TitlePreviewCard";
import { capture } from "@/lib/analytics/events";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

const DEBOUNCE_MS = 240;
const EMPTY: SearchCatalogResult = { collections: [], series: [], titles: [], people: [] };

export function SearchExperience({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<SearchCatalogResult>(EMPTY);
  const [pending, startTransition] = useTransition();
  const [touched, setTouched] = useState(initialQuery.trim().length >= 2);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQuery = useRef<string>("");

  useEffect(() => {
    const q = query.trim();
    if (debounce.current) clearTimeout(debounce.current);
    if (q.length < 2) {
      setResult(EMPTY);
      lastQuery.current = "";
      return;
    }
    debounce.current = setTimeout(() => {
      if (q === lastQuery.current) return;
      lastQuery.current = q;
      setTouched(true);
      capture("search_catalog", { q });
      // Reflect the query in the URL without a navigation.
      window.history.replaceState(null, "", `/search?q=${encodeURIComponent(q)}`);
      startTransition(async () => {
        const next = await searchCatalog(q);
        if (lastQuery.current === q) setResult(next);
      });
    }, DEBOUNCE_MS);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  const nothing =
    touched &&
    !pending &&
    result.collections.length === 0 &&
    result.series.length === 0 &&
    result.titles.length === 0 &&
    result.people.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-6">
      <div className="sticky top-20 z-10 -mx-2 px-2 py-3">
        <div className="glass-regular glass-specular rounded-2xl ring-1 ring-white/10 flex items-center gap-3 px-4 py-3">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="w-5 h-5 shrink-0 text-[var(--color-ink-3)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <title>Search</title>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            // biome-ignore lint/a11y/noAutofocus: search is the page's sole purpose — focusing the field on load is the expected UX
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search films, genres, franchises…"
            aria-label="Search"
            className="flex-1 bg-transparent outline-none text-base md:text-lg text-[var(--color-ink-0)] placeholder:text-[var(--color-ink-3)]"
          />
          {pending && <span className="text-xs text-[var(--color-accent)] tracking-widest">…</span>}
        </div>
      </div>

      <div className="mt-6 space-y-12 pb-10">
        {result.collections.map((g) => (
          <section key={g.collectionId}>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg md:text-xl tracking-tight font-[var(--font-display)]">
                {g.collectionName}
              </h2>
              <p className="text-[11px] uppercase tracking-widest text-[var(--color-ink-3)]">
                {g.items.length} films · franchise
              </p>
            </div>
            <PosterGrid items={g.items} />
          </section>
        ))}

        {result.series.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg md:text-xl tracking-tight font-[var(--font-display)]">
                TV series
              </h2>
              <p className="text-[11px] uppercase tracking-widest text-[var(--color-accent)]">
                {result.series.length} · watch free
              </p>
            </div>
            <PosterGrid items={result.series} />
          </section>
        )}

        {result.titles.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg md:text-xl tracking-tight font-[var(--font-display)]">
                Movies
              </h2>
              <p className="text-[11px] uppercase tracking-widest text-[var(--color-ink-3)]">
                {result.titles.length} {result.titles.length === 1 ? "film" : "films"}
              </p>
            </div>
            <PosterGrid items={result.titles} />
          </section>
        )}

        {result.people.length > 0 && (
          <section>
            <h2 className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink-3)] mb-4">
              People
            </h2>
            <div className="flex flex-wrap gap-5">
              {result.people.map((p) => (
                <Link
                  key={p.tmdbId}
                  href={`/person/${p.tmdbId}`}
                  className="group w-24 text-center"
                >
                  <div className="relative w-24 h-24 rounded-full overflow-hidden ring-1 ring-white/10 bg-white/5">
                    {p.profilePath ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w185${p.profilePath}`}
                        alt={p.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-[var(--color-ink-3)] text-2xl">
                        {p.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-[var(--color-ink-1)] line-clamp-2 group-hover:text-[var(--color-ink-0)]">
                    {p.name}
                  </p>
                  {p.knownForDept && (
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-3)]">
                      {p.knownForDept}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {nothing && (
          <p className="py-16 text-center text-sm text-[var(--color-ink-3)]">
            Nothing matched “{query.trim()}”. Try a title, a genre, or a franchise name.
          </p>
        )}

        {!touched && (
          <p className="py-16 text-center text-sm text-[var(--color-ink-3)]">
            Start typing to search the catalog.
          </p>
        )}
      </div>
    </div>
  );
}

function PosterGrid({
  items,
}: {
  items: import("@/components/title/TitlePreviewCard").TitlePreviewData[];
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {items.map((t) => (
        <TitlePreviewCard key={t.tmdbId} data={t} posterWidth={170} className="w-full" />
      ))}
    </div>
  );
}
