"use client";

/**
 * ProfileCard — interactive tile on the picker page.
 *
 * Three modes:
 *   - view (default): click to switch to this profile. Hover reveals tiny
 *     edit + delete affordances in the top-right corner.
 *   - edit: inline form (name + color + kid toggle) with Save / Cancel.
 *   - deleting: confirmation dialog overlay. Deletion cascades to ratings,
 *     journal entries, watchlist, etc — the dialog spells that out.
 *
 * The view-mode submission goes through a plain form action so it works
 * without JS; edit/delete use server actions invoked via useTransition.
 */

import {
  deleteProfileAction,
  updateProfileAction,
} from "@/app/(app)/profiles/actions";
import { GlassCard } from "@/components/glass";
import { selectProfileAction } from "@/app/(app)/profiles/actions";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { type FormEvent, useState, useTransition } from "react";

const AVATAR_COLORS = [
  "#FFB070",
  "#FF7A8A",
  "#7DD3FC",
  "#A78BFA",
  "#34D399",
  "#FBBF24",
] as const;

export interface ProfileCardData {
  id: string;
  name: string;
  avatarColor: string | null;
  isKid: boolean;
}

interface Props {
  profile: ProfileCardData;
  /** Disable delete affordance when there's only one profile on the account. */
  canDelete: boolean;
}

export function ProfileCard({ profile, canDelete }: Props) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative group">
      {mode === "view" ? (
        <ViewCard
          profile={profile}
          canDelete={canDelete}
          onEdit={() => setMode("edit")}
          onAskDelete={() => setConfirmDelete(true)}
        />
      ) : (
        <EditCard
          profile={profile}
          onCancel={() => setMode("view")}
          onSaved={() => setMode("view")}
        />
      )}

      <AnimatePresence>
        {confirmDelete && (
          <DeleteDialog
            profile={profile}
            reduceMotion={reduceMotion ?? false}
            onCancel={() => setConfirmDelete(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ViewCard({
  profile,
  canDelete,
  onEdit,
  onAskDelete,
}: {
  profile: ProfileCardData;
  canDelete: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
}) {
  return (
    <>
      <form action={selectProfileAction}>
        <input type="hidden" name="profileId" value={profile.id} />
        <button
          type="submit"
          className="w-full focus:outline-none rounded-2xl"
          aria-label={`Use profile ${profile.name}`}
        >
          <GlassCard
            weight="thin"
            interactive
            className="flex flex-col items-center gap-3 py-8"
          >
            <span
              aria-hidden
              className="size-16 rounded-2xl flex items-center justify-center text-2xl font-[var(--font-display)] text-black"
              style={{ background: profile.avatarColor ?? "#FFB070" }}
            >
              {profile.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-base">{profile.name}</span>
            {profile.isKid && (
              <span className="text-[10px] uppercase tracking-widest text-[var(--color-ink-2)]">
                Kid
              </span>
            )}
          </GlassCard>
        </button>
      </form>

      {/* Hover-revealed action buttons. We position outside the form so they
       * don't accidentally submit it. */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <IconButton aria-label={`Edit profile ${profile.name}`} onClick={onEdit}>
          <PencilIcon />
        </IconButton>
        {canDelete && (
          <IconButton
            aria-label={`Delete profile ${profile.name}`}
            onClick={onAskDelete}
            danger
          >
            <TrashIcon />
          </IconButton>
        )}
      </div>
    </>
  );
}

function EditCard({
  profile,
  onCancel,
  onSaved,
}: {
  profile: ProfileCardData;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [avatarColor, setAvatarColor] = useState<string>(
    profile.avatarColor ?? AVATAR_COLORS[0],
  );
  const [isKid, setIsKid] = useState(profile.isKid);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const trimmed = name.trim();
  const canSubmit = trimmed.length >= 1 && trimmed.length <= 32 && !pending;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = await updateProfileAction({
        profileId: profile.id,
        name: trimmed,
        avatarColor,
        isKid,
      });
      if (!result.ok) setError(result.error ?? "Could not save");
      else onSaved();
    });
  };

  return (
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
            maxLength={32}
            autoFocus
            className="flex-1 min-w-0 bg-white/5 ring-1 ring-white/10 focus:ring-2 focus:ring-[var(--color-accent)]/50 rounded-lg px-3 py-2 text-sm text-[var(--color-ink-0)] outline-none transition-all"
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
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="px-3 py-2 text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink-0)] transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </form>
    </GlassCard>
  );
}

function DeleteDialog({
  profile,
  reduceMotion,
  onCancel,
}: {
  profile: ProfileCardData;
  reduceMotion: boolean;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteProfileAction(profile.id);
      if (!result.ok) {
        setError(result.error ?? "Could not delete profile");
        return;
      }
      onCancel();
    });
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`delete-profile-${profile.id}-title`}
    >
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      <motion.div
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
        transition={
          reduceMotion ? { duration: 0 } : { type: "spring", damping: 28, stiffness: 280 }
        }
        className="relative z-10 max-w-md w-full glass-regular glass-specular rounded-3xl ring-1 ring-white/10 p-7 shadow-[0_30px_80px_-20px_oklch(0_0_0_/_0.7)]"
      >
        <p className="text-[11px] tracking-[0.22em] uppercase text-red-300/90">Permanent</p>
        <h2
          id={`delete-profile-${profile.id}-title`}
          className="mt-2 text-xl md:text-2xl font-[var(--font-display)] tracking-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          Delete profile &ldquo;{profile.name}&rdquo;?
        </h2>
        <p className="mt-3 text-sm text-[var(--color-ink-1)] leading-relaxed">
          This profile&apos;s ratings, journal entries, watchlist, and taste model will
          be deleted. The films themselves stay in the catalog. This cannot be undone.
        </p>

        {error && (
          <div className="mt-4 text-sm text-red-300/90" role="alert">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="px-5 py-2.5 rounded-full bg-red-500/80 hover:bg-red-500/90 text-white text-sm font-medium tracking-tight transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? "Deleting…" : "Delete profile"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="px-3 py-2 text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink-0)] transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function IconButton({
  children,
  onClick,
  danger,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`size-7 rounded-full flex items-center justify-center ring-1 transition-all ${
        danger
          ? "bg-black/40 ring-white/10 hover:bg-red-500/20 hover:ring-red-400/40 text-[var(--color-ink-2)] hover:text-red-300"
          : "bg-black/40 ring-white/10 hover:bg-white/10 hover:ring-white/25 text-[var(--color-ink-2)] hover:text-[var(--color-ink-0)]"
      }`}
    >
      {children}
    </button>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="w-3.5 h-3.5"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="w-3.5 h-3.5"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}
