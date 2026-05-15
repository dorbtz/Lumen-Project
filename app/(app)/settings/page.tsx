/**
 * /settings — Profile, Taste reset, Accessibility, Sign out
 * (SPEC_COMPLETION §1 A3, SPEC §3.2). Reachable from the profile menu.
 *
 * Profile-gated like the rest of /(app). Interactive sections live in a
 * client component; the page only resolves the profile + persisted a11y
 * prefs server-side.
 */

import { readAccessibilityPrefs } from "@/app/(app)/settings/actions";
import { AppChrome } from "@/components/chrome/AppChrome";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { getActiveProfileId } from "@/lib/auth/active-profile";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { getProfileById } from "@/lib/db/queries";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function SettingsPage() {
  return (
    <main className="min-h-dvh pb-24">
      <AppChrome />
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsSurface />
      </Suspense>
    </main>
  );
}

function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-6 pt-32 space-y-6">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-36 rounded-3xl bg-white/5 animate-pulse" />
      ))}
    </div>
  );
}

async function SettingsSurface() {
  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    redirect("/profiles");
  }
  const profile = await getProfileById(profileId);
  if (!profile) redirect("/profiles");

  const prefs = await readAccessibilityPrefs();

  return (
    <section className="mx-auto max-w-2xl px-6 pt-32">
      <p className="text-[11px] tracking-[0.28em] uppercase text-[var(--color-accent)]">Settings</p>
      <h1
        className="mt-3 text-3xl md:text-4xl font-[var(--font-display)] tracking-tight"
        style={{ letterSpacing: "-0.02em" }}
      >
        {profile.name}
      </h1>
      <p className="mt-2 text-sm text-[var(--color-ink-2)]">
        Manage your profile, taste model, and accessibility.
      </p>

      <div className="mt-8">
        <SettingsClient initialPrefs={prefs} />
      </div>
    </section>
  );
}
