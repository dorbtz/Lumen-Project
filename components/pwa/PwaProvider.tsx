"use client";

/**
 * PwaProvider — registers the Serwist service worker and shows a glass
 * "Add to Home Screen" affordance after the 2nd session
 * (SPEC §11, SPEC_COMPLETION §2 B1).
 *
 * Session counting: a localStorage counter bumped once per browser
 * session (sessionStorage guard). The install prompt only appears from
 * the 2nd session onward, and only when the browser fired
 * `beforeinstallprompt` (Chromium). iOS Safari has no such event — the
 * iOS meta tags in app/layout already cover "Add to Home Screen" there.
 */

import { SerwistProvider } from "@serwist/next/react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const SESSION_KEY = "lumen_session_count";
const SESSION_GUARD = "lumen_session_counted";
const DISMISSED_KEY = "lumen_install_dismissed";

export function PwaProvider({ children }: { children: React.ReactNode }) {
  return (
    <SerwistProvider swUrl="/sw.js" reloadOnOnline>
      {children}
      <InstallPrompt />
    </SerwistProvider>
  );
}

function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Bump the session counter at most once per browser session.
    try {
      if (!sessionStorage.getItem(SESSION_GUARD)) {
        sessionStorage.setItem(SESSION_GUARD, "1");
        const n = Number(localStorage.getItem(SESSION_KEY) ?? "0") + 1;
        localStorage.setItem(SESSION_KEY, String(n));
      }
    } catch {
      // storage blocked (private mode) — silently skip the prompt.
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const sessions = Number(localStorage.getItem(SESSION_KEY) ?? "0");
      const dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
      if (sessions >= 2 && !dismissed) {
        setDeferred(e as BeforeInstallPromptEvent);
        setVisible(true);
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!visible || !deferred) return null;

  const onInstall = async () => {
    setVisible(false);
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      // user dismissed the native sheet — nothing to do.
    }
    setDeferred(null);
  };

  const onDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <section
      aria-label="Add Lumen to your home screen"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-sm glass-regular glass-specular rounded-2xl ring-1 ring-white/10 p-4 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
    >
      <p className="text-sm text-[var(--color-ink-0)] font-[var(--font-display)] tracking-tight">
        Add Lumen to your home screen
      </p>
      <p className="mt-1 text-xs text-[var(--color-ink-3)] leading-relaxed">
        Launch it like a native app — full screen, offline shell, instant open.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onInstall}
          className="min-h-[40px] px-4 rounded-full text-sm bg-[var(--color-accent)] text-black ring-1 ring-[var(--color-accent)] hover:opacity-90 transition-opacity"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-[40px] px-4 rounded-full text-sm bg-white/5 ring-1 ring-white/10 text-[var(--color-ink-1)] hover:bg-white/10 transition-colors"
        >
          Not now
        </button>
      </div>
    </section>
  );
}
