"use server";

/**
 * Settings server actions (SPEC_COMPLETION §1 A3, decision D2).
 *
 * resetTasteAction — clears `ratings` for the active profile, nulls
 * `taste_centroid`, sets `onboarding_done = false` so the viewer re-seeds.
 * Journal entries AND recap are KEPT (D2, RESOLVED 2026-05-15). No LLM.
 *
 * setAccessibilityAction — persists the reduce-transparency / reduce-motion
 * toggles in a cookie that the root layout reads to set a data-* attribute
 * on <html> (CSS honors it alongside the OS media queries).
 *
 * NOTE: a `"use server"` module may only export async functions — the
 * cookie name + prefs type live in `@/lib/settings/a11y`.
 */

import { getActiveProfileId } from "@/lib/auth/active-profile";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { db } from "@/lib/db/client";
import { ratings } from "@/lib/db/schema";
import {
  ACCESSIBILITY_COOKIE,
  type AccessibilityPrefs,
  parseAccessibilityCookie,
} from "@/lib/settings/a11y";
import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function resetTasteAction(): Promise<void> {
  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    redirect("/profiles");
  }

  // 1. Clear every rating for this profile.
  await db.delete(ratings).where(eq(ratings.profileId, profileId));

  // 2. Null the taste centroid + force re-onboarding. Raw SQL for the
  //    vector NULL cast (drizzle can't express NULL::vector cleanly here).
  await db.execute(sql`
    UPDATE profiles
    SET taste_centroid = NULL,
        onboarding_done = false
    WHERE id = ${profileId}
  `);

  // D2: journal_entries and recap_states are intentionally NOT touched.
  redirect("/onboarding");
}

export async function setAccessibilityAction(prefs: AccessibilityPrefs): Promise<void> {
  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    redirect("/profiles");
  }
  const jar = await cookies();
  jar.set(
    ACCESSIBILITY_COOKIE,
    JSON.stringify({
      rt: prefs.reduceTransparency ? 1 : 0,
      rm: prefs.reduceMotion ? 1 : 0,
    }),
    {
      httpOnly: false, // read by CSS-affecting layout; not a secret
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    },
  );
}

export async function readAccessibilityPrefs(): Promise<AccessibilityPrefs> {
  const jar = await cookies();
  return parseAccessibilityCookie(jar.get(ACCESSIBILITY_COOKIE)?.value);
}
