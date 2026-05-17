/**
 * Lumen — "Who's watching?" picker.
 * SPEC §6 + §10: server component lists the account's profiles (capped at 5),
 * lets the user pick one. Selection is persisted in the signed
 * `lumen_active_profile` cookie via the `selectProfile` server action.
 */

import { GlassSheet } from "@/components/glass";
import { AddProfileCard } from "@/components/profile/AddProfileCard";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { PROFILE_CAP, listProfilesForCurrentUser } from "@/lib/auth/profile-queries";
import { Suspense } from "react";

// Next.js 16 Cache Components: the dynamic portion (auth + DB) must live
// inside <Suspense>. The page shell can prerender; the picker streams in.

export default function ProfilesPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6 py-16">
      <Suspense fallback={<PickerSkeleton />}>
        <ProfilesPicker />
      </Suspense>
    </main>
  );
}

function PickerSkeleton() {
  return (
    <GlassSheet>
      <p className="text-xs tracking-widest uppercase text-[var(--color-ink-2)]">Lumen</p>
      <h1
        className="mt-3 text-[clamp(2rem,5vw,3rem)] font-[var(--font-display)] tracking-tight"
        style={{ letterSpacing: "-0.02em" }}
      >
        Who&apos;s watching?
      </h1>
      <div className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </GlassSheet>
  );
}

async function ProfilesPicker() {
  const list = await listProfilesForCurrentUser();

  return (
    <>
      <GlassSheet>
        <p className="text-xs tracking-widest uppercase text-[var(--color-ink-2)]">Lumen</p>
        <h1
          className="mt-3 text-[clamp(2rem,5vw,3rem)] font-[var(--font-display)] tracking-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          Who&apos;s watching?
        </h1>

        <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {list.map((p) => (
            <li key={p.id}>
              <ProfileCard
                profile={{
                  id: p.id,
                  name: p.name,
                  avatarColor: p.avatarColor,
                  isKid: p.isKid,
                }}
                canDelete={list.length > 1}
              />
            </li>
          ))}

          {list.length < PROFILE_CAP && (
            <li>
              <AddProfileCard />
            </li>
          )}
        </ul>

        <p className="mt-10 text-xs text-[var(--color-ink-3)]">
          Up to {PROFILE_CAP} profiles per account. Each profile keeps its own taste model and
          journal.
        </p>
      </GlassSheet>
    </>
  );
}
