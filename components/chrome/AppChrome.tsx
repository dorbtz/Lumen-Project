/**
 * AppChrome — top-of-page navigation for every authenticated surface, plus
 * a bottom tab bar on mobile.
 *
 *   - Desktop (md+): Lumen wordmark · inline NavLinks · search · avatar.
 *   - Mobile (<md):  Lumen wordmark · search · avatar (top), and a fixed
 *     BottomNav with the six destinations at the bottom edge.
 *
 * Server Component: loads the active profile via the signed cookie + DB so
 * the avatar in <ProfileMenu> reflects the current profile (Anna/Ben/etc),
 * not the Clerk Google photo. Children that need pathname (`NavLinks`,
 * `BottomNav`) are client.
 */

import { BottomNav } from "@/components/chrome/BottomNav";
import { NavLinks } from "@/components/chrome/NavLinks";
import { ProfileMenu, type ProfileMenuProfile } from "@/components/chrome/ProfileMenu";
import { GlassChrome } from "@/components/glass";
import { SearchTriggerButton } from "@/components/search/SearchTriggerButton";
import { getActiveProfileId } from "@/lib/auth/active-profile";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { getProfileById } from "@/lib/db/queries";
import Link from "next/link";

export async function AppChrome() {
  const profile = await loadActiveProfileForChrome();

  return (
    <>
      <GlassChrome
        as="header"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 md:gap-6 px-4 md:px-5 py-2.5 md:py-3 rounded-full"
      >
        <Link
          href="/home"
          className="font-[var(--font-display)] text-base md:text-lg tracking-tight"
        >
          Lumen
        </Link>

        <NavLinks />

        <SearchTriggerButton />

        <div className="md:ml-2">
          <ProfileMenu profile={profile} />
        </div>
      </GlassChrome>

      <BottomNav />
    </>
  );
}

async function loadActiveProfileForChrome(): Promise<ProfileMenuProfile | null> {
  const profileId = await getActiveProfileId();
  if (!profileId) return null;
  // Verify the cookie's profile still belongs to the signed-in account
  // (defence-in-depth — the cookie is signed but the profile could have been
  // deleted by the user since the cookie was issued).
  if (!(await profileBelongsToCurrentAccount(profileId))) return null;
  const row = await getProfileById(profileId);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    avatarColor: row.avatarColor,
    isKid: row.isKid,
  };
}
