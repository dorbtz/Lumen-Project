"use client";

/**
 * AddProfileCard — interactive tile that swaps between a "+ Add profile"
 * affordance and an inline form. On submit it calls createProfileAction
 * which provisions the profile, sets the active-profile cookie, and
 * redirects to /onboarding.
 *
 * Form fields:
 *   - name (1-32 chars)
 *   - avatarColor (preset palette)
 *   - isKid (toggle, defaults off)
 */

import { GlassCard } from "@/components/glass";
import { createProfileAction } from "@/app/(app)/profiles/actions";
import { motion, useReducedMotion } from "framer-motion";
import { type FormEvent, useState, useTransition } from "react";

const AVATAR_COLORS = [
  "#FFB070",
  "#FF7A8A",
  "#7DD3FC",
  "#A78BFA",
  "#34D399",
  "#FBBF24",
] as const;

export function AddProfileCard() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [avatarColor, setAvatarColor] = useState<string>(AVATAR_COLORS[0]);
  const [isKid, setIsKid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();

  const trimmed = name.trim();
  const canSubmit = trimmed.length >= 1 && trimmed.length <= 32 && !pending;

  const reset = () => {
    setOpen(false);
    setName("");
    setAvatarColor(AVATAR_COLORS[0]);
    setIsKid(false);
    setError(null);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    const formData = new FormData();
    formData.set("name", trimmed);
    formData.set("avatarColor", avatarColor);
    if (isKid) formData.set("isKid", "on");
    startTransition(async () => {
      const result = await createProfileAction(formData);
      // Server action redirects on success → only land here on failure.
      if (result && !result.ok) {
        setError(result.error ?? "Could not create profile");
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full focus:outline-none rounded-2xl group"
        aria-label="Add a new profile"
      >
        <GlassCard
          weight="thin"
          interactive
          className="flex flex-col items-center gap-3 py-8 hover:ring-1 hover:ring-[var(--color-accent)]/40"
        >
          <span
            aria-hidden
            className="size-16 rounded-2xl border border-dashed border-white/25 flex items-center justify-center text-3xl text-[var(--color-ink-2)] group-hover:text-[var(--color-ink-0)] group-hover:border-[var(--color-accent)]/40 transition-colors"
          >
            +
          </span>
          <span className="text-base text-[var(--color-ink-1)]">Add profile</span>
        </GlassCard>
      </button>
    );
  }

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.25 }}
    >
      <GlassCard weight="thin" className="py-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="size-12 rounded-xl flex items-center justify-center text-xl font-[var(--font-display)] text-black shrink-0"
              style={{ background: avatarColor }}
            >
              {trimmed ? trimmed.slice(0, 1).toUpperCase() : "?"}
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Profile name"
              maxLength={32}
              autoFocus
              className="flex-1 min-w-0 bg-white/5 ring-1 ring-white/10 focus:ring-2 focus:ring-[var(--color-accent)]/50 rounded-lg px-3 py-2 text-sm text-[var(--color-ink-0)] placeholder:text-[var(--color-ink-3)] outline-none transition-all"
            />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-2)] mb-2">
              Color
            </div>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map((c) => {
                const active = c === avatarColor;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Pick color ${c}`}
                    onClick={() => setAvatarColor(c)}
                    className={`size-7 rounded-full transition-all ${
                      active ? "ring-2 ring-white scale-110" : "ring-1 ring-white/15"
                    }`}
                    style={{ background: c }}
                  />
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--color-ink-1)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isKid}
              onChange={(e) => setIsKid(e.target.checked)}
              className="size-4 accent-[var(--color-accent)]"
            />
            Kids profile
          </label>

          {error && (
            <div className="text-xs text-red-300/90" role="alert">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-4 py-2 rounded-full bg-[var(--color-accent)] text-[var(--color-surface-0)] text-sm font-medium tracking-tight hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {pending ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={pending}
              className="px-3 py-2 text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink-0)] transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </form>
      </GlassCard>
    </motion.div>
  );
}
