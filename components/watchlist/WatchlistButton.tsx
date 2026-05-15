"use client";

/**
 * WatchlistButton — pill toggle for adding/removing a title from the watchlist.
 * Optimistically flips state via useTransition; calls server actions on the wire.
 */

import { addToWatchlistAction, removeFromWatchlistAction } from "@/app/(app)/watchlist/actions";
import { motion, useReducedMotion } from "framer-motion";
import { useTransition, useState } from "react";

interface WatchlistButtonProps {
  titleUuid: string;
  initialInWatchlist: boolean;
}

export function WatchlistButton({ titleUuid, initialInWatchlist }: WatchlistButtonProps) {
  const [inWatchlist, setInWatchlist] = useState(initialInWatchlist);
  const [pending, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();

  const toggle = () => {
    const next = !inWatchlist;
    setInWatchlist(next); // optimistic
    startTransition(async () => {
      const result = next
        ? await addToWatchlistAction(titleUuid)
        : await removeFromWatchlistAction(titleUuid);
      if (!result.ok) {
        setInWatchlist(!next); // rollback
      }
    });
  };

  return (
    <motion.button
      type="button"
      onClick={toggle}
      disabled={pending}
      whileTap={reduceMotion ? {} : { scale: 0.95 }}
      animate={
        reduceMotion
          ? {}
          : { opacity: pending ? 0.6 : 1, scale: 1 }
      }
      transition={{ duration: 0.15 }}
      className={[
        "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm tracking-tight",
        "glass-thin glass-specular ring-1 transition-all",
        "disabled:cursor-not-allowed",
        inWatchlist
          ? "bg-[var(--color-accent)]/15 ring-[var(--color-accent)]/60 text-[var(--color-ink-0)]"
          : "ring-white/10 text-[var(--color-ink-2)] hover:text-[var(--color-ink-0)] hover:ring-white/20",
      ].join(" ")}
      aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
    >
      {inWatchlist && (
        <svg
          aria-hidden
          width="13"
          height="13"
          viewBox="0 0 13 13"
          fill="none"
          className="shrink-0"
        >
          <path
            d="M2 6.5L5.2 9.75L11 3.25"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {inWatchlist ? "In watchlist" : "Add to watchlist"}
    </motion.button>
  );
}
