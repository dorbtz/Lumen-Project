"use client";

/**
 * SearchOverlay — Spotlight-style global search.
 *
 * UX brief: a modal drawer that drops down from above the viewport over a blurred
 * backdrop, with a search field that streams live results as the user types.
 * Inspired by Apple TV+, LG webOS search, and ⌘K palettes (Linear, Raycast).
 *
 * Triggers:
 *   - ⌘K / Ctrl+K anywhere in the authed app
 *   - window dispatchEvent("lumen:open-search") from anywhere (used by nav button)
 *   - Esc / backdrop click to close
 *
 * Results:
 *   - Titles and people, in a single mixed list (ranked by the server action).
 *   - ↑/↓ arrow keys to navigate, Enter to open.
 *   - On click/Enter: navigate + close.
 */

import { type SearchHit, searchAction } from "@/app/(app)/search/actions";
import { posterUrl } from "@/lib/img/poster";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

export function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [focusIdx, setFocusIdx] = useState(0);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQuery = useRef("");
  const reduceMotion = useReducedMotion();
  const router = useRouter();

  // Global open listener.
  //   `/`              — primary shortcut (Twitter/YT/Reddit pattern). Chrome
  //                       doesn't intercept it. Works on TV remotes that emit
  //                       a literal slash if a search key is mapped that way.
  //   Cmd+K / Ctrl+K   — keep as a power-user shortcut. (Chrome on Windows
  //                       sometimes intercepts Ctrl+K for the address bar; if
  //                       it does, `/` is the reliable path.)
  //   Esc              — close (only when open).
  // We ignore the open shortcut while the user is typing in another input so
  // we don't hijack form fields.
  useEffect(() => {
    const isTypingInForm = (t: EventTarget | null) => {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (t.isContentEditable) return true;
      return false;
    };
    const onKey = (e: KeyboardEvent) => {
      // Close path runs regardless of focus context.
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        return;
      }
      // Open paths — don't hijack form input.
      if (isTypingInForm(e.target)) return;

      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "/" && !meta && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onCustom = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("lumen:open-search", onCustom);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("lumen:open-search", onCustom);
    };
  }, [open]);

  // Focus input on open; reset on close.
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(id);
    }
    setQuery("");
    setHits([]);
    setFocusIdx(0);
  }, [open]);

  // Compat: /search redirects to /home?search=1 so deep-links still work. If
  // we land on Home with that flag, auto-open the overlay and clean the URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("search") === "1") {
      setOpen(true);
      params.delete("search");
      const cleaned =
        window.location.pathname +
        (params.toString() ? `?${params.toString()}` : "") +
        window.location.hash;
      window.history.replaceState({}, "", cleaned);
    }
  }, []);

  // Debounced search.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      lastQuery.current = q;
      startTransition(async () => {
        const res = await searchAction(q);
        if (lastQuery.current !== q) return; // stale-drop
        setHits(res);
        setFocusIdx(0);
      });
    }, 180);
  }, [query]);

  const openHit = useCallback(
    (hit: SearchHit) => {
      // Only non-CC0 TMDB series (positive id) need the tv hint; CC0
      // series have negative ids and resolve via their DB row.
      const href =
        hit.kind === "title"
          ? `/title/${hit.tmdbId}${hit.media === "tv" && hit.tmdbId > 0 ? "?type=tv" : ""}`
          : `/person/${hit.tmdbId}`;
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const target = hits[focusIdx];
      if (target) {
        e.preventDefault();
        openHit(target);
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="search-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[100] bg-[oklch(0.04_0.02_245_/_0.55)] backdrop-blur-xl"
          aria-hidden={false}
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { y: -40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: -40, opacity: 0, scale: 0.97 }}
            transition={
              reduceMotion ? { duration: 0 } : { type: "spring", damping: 26, stiffness: 240 }
            }
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-[12vh] max-w-2xl w-[92vw] glass-regular glass-specular rounded-3xl overflow-hidden shadow-[0_40px_120px_-30px_oklch(0_0_0_/_0.7)]"
          >
            {/* Input row */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
              <SearchIcon className="text-[var(--color-accent)] w-5 h-5 shrink-0" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search films, directors, actors…"
                className="flex-1 bg-transparent outline-none placeholder:text-[var(--color-ink-3)] text-base"
                aria-label="Search query"
                autoComplete="off"
                inputMode="search"
              />
              {pending && (
                <span className="text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
                  …
                </span>
              )}
              <kbd className="text-[10px] uppercase tracking-widest text-[var(--color-ink-3)] border border-white/10 px-2 py-0.5 rounded-md">
                Esc
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[58vh] overflow-y-auto overscroll-contain">
              {query.trim().length < 2 ? (
                <SearchHint />
              ) : hits.length === 0 ? (
                pending ? (
                  <SearchSearching />
                ) : (
                  <SearchEmpty query={query} />
                )
              ) : (
                <ul role="listbox" className="py-2">
                  {hits.map((hit, i) => (
                    <SearchRow
                      key={`${hit.kind}-${hit.tmdbId}`}
                      hit={hit}
                      focused={i === focusIdx}
                      onClick={() => openHit(hit)}
                      onMouseEnter={() => setFocusIdx(i)}
                    />
                  ))}
                </ul>
              )}

              {query.trim().length >= 2 && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                  }}
                  className="w-full flex items-center justify-between gap-3 px-5 py-3 border-t border-white/5 text-left text-sm text-[var(--color-accent)] hover:bg-white/[0.03] transition-colors"
                >
                  <span>See all results for “{query.trim()}” — posters, franchises & people</span>
                  <span aria-hidden>→</span>
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SearchRow({
  hit,
  focused,
  onClick,
  onMouseEnter,
}: {
  hit: SearchHit;
  focused: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  const isTitle = hit.kind === "title";
  const img = isTitle
    ? posterUrl(hit.posterPath, "w92")
    : hit.profilePath
      ? `https://image.tmdb.org/t/p/w185${hit.profilePath}`
      : null;
  const primary = isTitle ? hit.title : hit.name;
  const isTv = isTitle && hit.media === "tv";
  const secondary = isTitle
    ? [
        hit.year,
        hit.voteAverage ? `★ ${hit.voteAverage.toFixed(1)}` : null,
        hit.watchable ? "Free" : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : (hit.knownForDept ?? "Person");
  return (
    <li role="option" aria-selected={focused}>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
          focused ? "bg-[oklch(0.84_0.16_200_/_0.10)]" : "hover:bg-white/[0.03]"
        }`}
      >
        <div className="w-10 h-14 shrink-0 rounded-md overflow-hidden bg-[var(--color-surface-2)]">
          {img && (
            <Image
              src={img}
              alt=""
              width={40}
              height={56}
              className="object-cover w-full h-full"
              loading="lazy"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm text-[var(--color-ink-0)] truncate tracking-tight">{primary}</div>
          <div className="text-[11px] uppercase tracking-widest text-[var(--color-ink-3)] truncate">
            <span className={isTv ? "text-[var(--color-accent)]" : undefined}>
              {isTitle ? (isTv ? "TV series" : "Film") : "Person"}
            </span>
            {secondary ? ` · ${secondary}` : ""}
          </div>
        </div>
        <span aria-hidden className="text-[var(--color-ink-3)] text-sm">
          ↵
        </span>
      </button>
    </li>
  );
}

function SearchHint() {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm text-[var(--color-ink-2)]">Start typing — films, directors, actors.</p>
      <p className="mt-2 text-[11px] uppercase tracking-widest text-[var(--color-ink-3)]">
        ↑↓ to move · ↵ to open · Esc to close
      </p>
    </div>
  );
}

function SearchSearching() {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm text-[var(--color-ink-2)]">Searching…</p>
    </div>
  );
}

function SearchEmpty({ query }: { query: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm text-[var(--color-ink-2)]">
        No matches for{" "}
        <span className="text-[var(--color-ink-0)]">&ldquo;{query.trim()}&rdquo;</span>.
      </p>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/**
 * Programmatic opener — dispatch a custom event the overlay listens for.
 * Used by nav buttons. (Not exported as a hook because it's a fire-and-forget.)
 */
export function openSearchOverlay() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("lumen:open-search"));
  }
}
