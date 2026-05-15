"use client";

/**
 * ProfileMenu — profile-aware avatar dropdown in the chrome.
 *
 * Shows the ACTIVE profile's letter + color (not the Clerk Google photo).
 * Click opens a glass popover anchored below the button with:
 *   - profile name (header, with Kid badge if applicable)
 *   - Switch profile  → /profiles
 *   - Sign out        → Clerk signOut + redirect home
 *
 * If no profile is active (e.g. the title page where the chrome renders even
 * without a cookie), renders a generic placeholder that links to /profiles.
 */

import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface ProfileMenuProfile {
  id: string;
  name: string;
  avatarColor: string | null;
  isKid: boolean;
}

interface Props {
  profile: ProfileMenuProfile | null;
}

export function ProfileMenu({ profile }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  // useAuth() is SSR-safe — it returns a loading state instead of throwing
  // when ClerkProvider context isn't ready. signOut may briefly be undefined
  // during initial hydration; we guard the call.
  const { signOut } = useAuth();

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // No active profile — render a small affordance that takes the viewer to
  // the picker rather than a broken-looking blank circle.
  if (!profile) {
    return (
      <Link
        href="/profiles"
        aria-label="Choose a profile"
        className="size-9 rounded-full ring-1 ring-white/15 flex items-center justify-center text-[var(--color-ink-2)] hover:text-[var(--color-ink-0)] hover:ring-white/30 transition-all"
      >
        <UserSilhouetteIcon />
      </Link>
    );
  }

  const onSignOut = async () => {
    setOpen(false);
    // signOut handles the redirect itself when redirectUrl is provided.
    await signOut?.({ redirectUrl: "/" });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Profile menu — ${profile.name}`}
        className="size-9 rounded-full flex items-center justify-center text-sm font-[var(--font-display)] text-black ring-1 ring-white/20 hover:ring-white/40 hover:scale-105 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        style={{ background: profile.avatarColor ?? "#FFB070" }}
      >
        {profile.name.slice(0, 1).toUpperCase()}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.97 }}
            transition={
              reduceMotion ? { duration: 0 } : { type: "spring", damping: 28, stiffness: 300 }
            }
            role="menu"
            aria-label="Profile actions"
            // On mobile, centre the dropdown horizontally in the viewport
            // (the avatar lives inside a centred chrome pill, so anchoring
            // to it leaves the dropdown off-centre). Desktop: anchor to the
            // avatar via absolute right-0 (the original behaviour).
            className="fixed top-[4.5rem] left-1/2 -translate-x-1/2 w-[calc(100vw-1.5rem)] max-w-xs md:absolute md:top-auto md:left-auto md:right-0 md:translate-x-0 md:mt-3 md:w-64 rounded-2xl glass-regular glass-specular ring-1 ring-white/10 p-2 shadow-[0_30px_80px_-20px_oklch(0_0_0_/_0.7)]"
          >
            <div className="flex items-center gap-3 px-3 py-2.5">
              <span
                aria-hidden
                className="size-10 rounded-xl flex items-center justify-center text-base font-[var(--font-display)] text-black shrink-0"
                style={{ background: profile.avatarColor ?? "#FFB070" }}
              >
                {profile.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="text-sm text-[var(--color-ink-0)] truncate">{profile.name}</div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
                  {profile.isKid ? "Kid profile" : "Profile"}
                </div>
              </div>
            </div>

            <div className="h-px bg-white/5 mx-1 my-1" aria-hidden />

            <MenuItem href="/profiles" icon={<SwitchIcon />} onClick={() => setOpen(false)}>
              Switch profile
            </MenuItem>
            <MenuItem href="/settings" icon={<GearIcon />} onClick={() => setOpen(false)}>
              Settings
            </MenuItem>
            <MenuButton onClick={onSignOut} icon={<SignOutIcon />}>
              Sign out
            </MenuButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  href,
  icon,
  onClick,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[var(--color-ink-1)] hover:text-[var(--color-ink-0)] hover:bg-white/5 transition-colors"
    >
      <span className="text-[var(--color-ink-2)]">{icon}</span>
      {children}
    </Link>
  );
}

function MenuButton({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[var(--color-ink-1)] hover:text-[var(--color-ink-0)] hover:bg-white/5 transition-colors"
    >
      <span className="text-[var(--color-ink-2)]">{icon}</span>
      {children}
    </button>
  );
}

function SwitchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="w-4 h-4"
    >
      <path d="M16 3h5v5" />
      <path d="M8 21H3v-5" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="w-4 h-4"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="w-4 h-4"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function UserSilhouetteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="w-5 h-5"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}
