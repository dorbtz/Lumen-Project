"use client";

/**
 * SettingsClient — interactive Settings sections (SPEC_COMPLETION §1 A3).
 *
 *   Taste         → Reset taste (confirm dialog) → resetTasteAction
 *   Accessibility → reduce transparency / reduce motion toggles, persisted
 *   Sign out      → Clerk signOut
 *
 * Profile (rename / avatar color) reuses the existing /profiles surface via
 * a link — the spec says "reuse existing profile actions".
 */

import { resetTasteAction, setAccessibilityAction } from "@/app/(app)/settings/actions";
import type { AccessibilityPrefs } from "@/lib/settings/a11y";
import { useAuth } from "@clerk/nextjs";
import { useState, useTransition } from "react";

export function SettingsClient({
  initialPrefs,
}: {
  initialPrefs: AccessibilityPrefs;
}) {
  const { signOut } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, startReset] = useTransition();
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(initialPrefs);
  const [savingPrefs, startSavePrefs] = useTransition();

  const updatePref = (patch: Partial<AccessibilityPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    // Reflect immediately on <html> so the change is felt without a reload.
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute(
        "data-reduce-transparency",
        next.reduceTransparency ? "1" : "0",
      );
      document.documentElement.setAttribute("data-reduce-motion", next.reduceMotion ? "1" : "0");
    }
    startSavePrefs(async () => {
      await setAccessibilityAction(next);
    });
  };

  return (
    <div className="space-y-6">
      {/* Profile */}
      <Section title="Profile" desc="Your name and avatar color.">
        <a
          href="/profiles"
          className="inline-flex items-center min-h-[44px] px-5 rounded-full text-sm bg-white/5 ring-1 ring-white/10 text-[var(--color-ink-1)] hover:bg-white/10 hover:text-[var(--color-ink-0)] transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-accent)]/40"
        >
          Manage profiles →
        </a>
      </Section>

      {/* Taste */}
      <Section
        title="Taste"
        desc="Resetting clears your ratings and taste model and starts onboarding over. Your journal and recap are kept."
      >
        {!confirmOpen ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center min-h-[44px] px-5 rounded-full text-sm bg-white/5 ring-1 ring-white/10 text-[var(--color-ink-1)] hover:bg-white/10 hover:text-[var(--color-ink-0)] transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-accent)]/40"
          >
            Reset taste
          </button>
        ) : (
          <div
            role="alertdialog"
            aria-label="Confirm taste reset"
            className="glass-thin rounded-2xl ring-1 ring-white/10 p-5"
          >
            <p className="text-sm text-[var(--color-ink-1)] leading-relaxed">
              This deletes all your ratings and clears your taste model. Your journal entries and
              recap stay. You&apos;ll go through onboarding again. This can&apos;t be undone.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={resetting}
                onClick={() =>
                  startReset(async () => {
                    await resetTasteAction();
                  })
                }
                className="min-h-[44px] px-5 rounded-full text-sm bg-[#FF7A8A] text-black ring-1 ring-[#FF7A8A] hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {resetting ? "Resetting…" : "Yes, reset my taste"}
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={() => setConfirmOpen(false)}
                className="min-h-[44px] px-5 rounded-full text-sm bg-white/5 ring-1 ring-white/10 text-[var(--color-ink-1)] hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* Accessibility */}
      <Section title="Accessibility" desc="These apply on top of your system settings.">
        <div className="space-y-3">
          <Toggle
            label="Reduce transparency"
            hint="Collapse glass surfaces to solid panels."
            checked={prefs.reduceTransparency}
            onChange={(v) => updatePref({ reduceTransparency: v })}
          />
          <Toggle
            label="Reduce motion"
            hint="Disable refraction, parallax and large transitions."
            checked={prefs.reduceMotion}
            onChange={(v) => updatePref({ reduceMotion: v })}
          />
          {savingPrefs && (
            <p className="text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
              Saving…
            </p>
          )}
        </div>
      </Section>

      {/* Sign out */}
      <Section title="Session" desc="Sign out of Lumen on this device.">
        <button
          type="button"
          onClick={() => signOut?.({ redirectUrl: "/" })}
          className="inline-flex items-center min-h-[44px] px-5 rounded-full text-sm bg-white/5 ring-1 ring-white/10 text-[var(--color-ink-1)] hover:bg-white/10 hover:text-[var(--color-ink-0)] transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-accent)]/40"
        >
          Sign out
        </button>
      </Section>
    </div>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-regular glass-specular rounded-3xl ring-1 ring-white/5 p-6 sm:p-7">
      <h2 className="text-lg font-[var(--font-display)] tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-[var(--color-ink-2)] leading-relaxed max-w-prose">{desc}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-sm text-[var(--color-ink-1)]">{label}</span>
        <span className="block text-xs text-[var(--color-ink-3)] mt-0.5">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-12 h-7 rounded-full transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-accent)]/40 ${
          checked ? "bg-[var(--color-accent)]" : "bg-white/10 ring-1 ring-white/15"
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}
