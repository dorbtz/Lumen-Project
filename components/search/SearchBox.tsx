"use client";

/**
 * SearchBox — input + debounced server-action call + results grid.
 * SPEC §14 Week 2: client-side debounce (250ms) so the action only fires on idle.
 */

import { type SearchHit, searchAction } from "@/app/(app)/search/actions";
import { posterUrl } from "@/lib/img/poster";
import { titleHref } from "@/lib/title-href";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQuery = useRef<string>("");

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const onChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setHits([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      lastQuery.current = value;
      startTransition(async () => {
        const res = await searchAction(value);
        // Drop stale responses
        if (lastQuery.current !== value) return;
        setHits(res);
      });
    }, 250);
  };

  return (
    <div>
      <div className="glass-thin glass-specular rounded-full px-5 py-3 flex items-center gap-3">
        <span aria-hidden className="text-[var(--color-ink-3)]">
          ⌕
        </span>
        <input
          type="search"
          autoComplete="off"
          inputMode="search"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search films, directors, actors…"
          className="flex-1 bg-transparent outline-none placeholder:text-[var(--color-ink-3)] text-base"
          aria-label="Search"
        />
        {pending && (
          <span className="text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">…</span>
        )}
      </div>

      {hits.length === 0 && query.trim().length >= 2 && !pending && (
        <p className="mt-10 text-sm text-[var(--color-ink-3)]">No matches.</p>
      )}

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {hits.map((h) =>
          h.kind === "title" ? (
            <TitleHit key={`t-${h.tmdbId}`} hit={h} />
          ) : (
            <PersonHit key={`p-${h.tmdbId}`} hit={h} />
          ),
        )}
      </div>
    </div>
  );
}

function TitleHit({ hit }: { hit: Extract<SearchHit, { kind: "title" }> }) {
  const poster = posterUrl(hit.posterPath, "w342");
  return (
    <Link
      href={titleHref(hit.tmdbId, hit.media === "tv" && hit.tmdbId > 0 ? "tv" : undefined)}
      className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-xl"
    >
      <div className="aspect-[2/3] relative rounded-xl overflow-hidden bg-[var(--color-surface-2)] group-hover:scale-[1.03] transition-transform">
        {poster ? (
          <Image
            src={poster}
            alt={hit.title}
            fill
            sizes="200px"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--color-ink-3)] text-xs">
            No poster
          </div>
        )}
      </div>
      <div className="mt-2 text-sm tracking-tight text-[var(--color-ink-0)] line-clamp-1">
        {hit.title}
      </div>
      {hit.year && (
        <div className="text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
          {hit.year}
        </div>
      )}
    </Link>
  );
}

function PersonHit({ hit }: { hit: Extract<SearchHit, { kind: "person" }> }) {
  const photo = hit.profilePath ? `https://image.tmdb.org/t/p/w185${hit.profilePath}` : null;
  return (
    <Link
      href={`/person/${hit.tmdbId}`}
      className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-xl"
    >
      <div className="aspect-[2/3] relative rounded-xl overflow-hidden bg-[var(--color-surface-2)] group-hover:scale-[1.03] transition-transform">
        {photo ? (
          <Image
            src={photo}
            alt={hit.name}
            fill
            sizes="200px"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--color-ink-3)] text-xs">
            {hit.name.slice(0, 1)}
          </div>
        )}
      </div>
      <div className="mt-2 text-sm tracking-tight text-[var(--color-ink-0)] line-clamp-1">
        {hit.name}
      </div>
      {hit.knownForDept && (
        <div className="text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
          {hit.knownForDept}
        </div>
      )}
    </Link>
  );
}
