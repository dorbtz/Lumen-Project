"use server";

/**
 * Server actions for the "Who's watching?" picker.
 * SPEC §6: cookie value must be account-bound to prevent cross-account profile use.
 */

import {
  clearActiveProfile,
  getActiveProfileId,
  setActiveProfileId,
} from "@/lib/auth/active-profile";
import { db } from "@/lib/db/client";
import { profiles, watchlists } from "@/lib/db/schema";
import {
  PROFILE_CAP,
  getOrCreateAccount,
  listProfilesForCurrentUser,
  profileBelongsToCurrentAccount,
} from "@/lib/auth/profile-queries";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function selectProfileAction(formData: FormData) {
  const profileId = String(formData.get("profileId") ?? "");
  if (!profileId) return;

  const owned = await profileBelongsToCurrentAccount(profileId);
  if (!owned) {
    redirect("/profiles");
  }

  await setActiveProfileId(profileId);
  redirect("/home");
}

const ALLOWED_AVATAR_COLORS = new Set([
  "#FFB070",
  "#FF7A8A",
  "#7DD3FC",
  "#A78BFA",
  "#34D399",
  "#FBBF24",
]);

export interface CreateProfileResult {
  ok: boolean;
  error?: string;
}

export async function createProfileAction(formData: FormData): Promise<CreateProfileResult> {
  const account = await getOrCreateAccount();
  if (!account) return { ok: false, error: "Not signed in" };

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 32) {
    return { ok: false, error: "Name must be 1–32 characters" };
  }

  const avatarColorRaw = String(formData.get("avatarColor") ?? "#FFB070");
  const avatarColor = ALLOWED_AVATAR_COLORS.has(avatarColorRaw) ? avatarColorRaw : "#FFB070";
  const isKid = formData.get("isKid") === "on";

  const existing = await listProfilesForCurrentUser();
  if (existing.length >= PROFILE_CAP) {
    return { ok: false, error: `Up to ${PROFILE_CAP} profiles per account` };
  }

  const [created] = await db
    .insert(profiles)
    .values({
      accountId: account.id,
      name,
      avatarColor,
      isKid,
      onboardingDone: false,
    })
    .returning();
  if (!created) return { ok: false, error: "Could not create profile" };

  await db.insert(watchlists).values({
    profileId: created.id,
    name: "Watchlist",
    isDefault: true,
  });

  // Switch the cookie to the new profile and send the viewer through
  // onboarding — every profile gets its own taste seed.
  await setActiveProfileId(created.id);
  redirect("/onboarding");
}

export interface UpdateProfileArgs {
  profileId: string;
  name: string;
  avatarColor: string;
  isKid: boolean;
}

export async function updateProfileAction(
  args: UpdateProfileArgs,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await profileBelongsToCurrentAccount(args.profileId))) {
    return { ok: false, error: "Profile not found" };
  }
  const name = args.name.trim();
  if (name.length < 1 || name.length > 32) {
    return { ok: false, error: "Name must be 1–32 characters" };
  }
  const avatarColor = ALLOWED_AVATAR_COLORS.has(args.avatarColor)
    ? args.avatarColor
    : "#FFB070";
  await db
    .update(profiles)
    .set({ name, avatarColor, isKid: args.isKid })
    .where(eq(profiles.id, args.profileId));
  revalidatePath("/profiles");
  return { ok: true };
}

export async function deleteProfileAction(
  profileId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await profileBelongsToCurrentAccount(profileId))) {
    return { ok: false, error: "Profile not found" };
  }
  const existing = await listProfilesForCurrentUser();
  if (existing.length <= 1) {
    return { ok: false, error: "You must keep at least one profile" };
  }

  // If deleting the currently active profile, clear the cookie so the next
  // request lands on /profiles instead of trying to use a stale id.
  const activeId = await getActiveProfileId();
  if (activeId === profileId) {
    await clearActiveProfile();
  }

  // Schema declares `onDelete: "cascade"` on every personalised table that
  // references profile_id, so this single delete tears down ratings, journal
  // entries, watchlists, watchlist_items, taste_snapshots, recap_states, and
  // why_explanations atomically.
  await db.delete(profiles).where(eq(profiles.id, profileId));
  revalidatePath("/profiles");
  return { ok: true };
}
