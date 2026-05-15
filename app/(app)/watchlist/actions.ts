"use server";

/**
 * Lumen — watchlist server actions.
 * Profile-gated; called by WatchlistButton on title detail pages.
 */

import { getActiveProfileId } from "@/lib/auth/active-profile";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { addToWatchlist, removeFromWatchlist } from "@/lib/watchlist/service";
import { revalidatePath } from "next/cache";

interface WatchlistActionResult {
  ok: boolean;
  error?: string;
}

export async function addToWatchlistAction(titleUuid: string): Promise<WatchlistActionResult> {
  const profileId = await getActiveProfileId();
  if (!profileId) return { ok: false, error: "Not signed in" };
  if (!(await profileBelongsToCurrentAccount(profileId))) {
    return { ok: false, error: "Profile mismatch" };
  }
  try {
    await addToWatchlist(profileId, titleUuid);
    revalidatePath("/watchlist");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function removeFromWatchlistAction(titleUuid: string): Promise<WatchlistActionResult> {
  const profileId = await getActiveProfileId();
  if (!profileId) return { ok: false, error: "Not signed in" };
  if (!(await profileBelongsToCurrentAccount(profileId))) {
    return { ok: false, error: "Profile mismatch" };
  }
  try {
    await removeFromWatchlist(profileId, titleUuid);
    revalidatePath("/watchlist");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
