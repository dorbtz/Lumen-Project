/**
 * Lumen — accessibility-preference shared types & constants
 * (SPEC_COMPLETION §1 A3).
 *
 * Kept OUT of the `"use server"` actions module: a Server Actions file may
 * only export async functions, so the cookie name + prefs type live here.
 */

export const ACCESSIBILITY_COOKIE = "lumen_a11y";

export interface AccessibilityPrefs {
  reduceTransparency: boolean;
  reduceMotion: boolean;
}

export function parseAccessibilityCookie(raw: string | undefined): AccessibilityPrefs {
  if (!raw) return { reduceTransparency: false, reduceMotion: false };
  try {
    const p = JSON.parse(raw) as { rt?: number; rm?: number };
    return { reduceTransparency: p.rt === 1, reduceMotion: p.rm === 1 };
  } catch {
    return { reduceTransparency: false, reduceMotion: false };
  }
}
