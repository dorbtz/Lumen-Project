"use server";

/**
 * Recap server actions (SPEC_COMPLETION §1 A2).
 *
 * `getShareUrlAction` ensures the active profile's latest recap has a share
 * token and returns the public absolute URL. No new LLM call site.
 */

import { getActiveProfileId } from "@/lib/auth/active-profile";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { ensureShareToken } from "@/lib/recap/share";
import { headers } from "next/headers";

export async function getShareUrlAction(): Promise<{ url: string } | { error: string }> {
  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    return { error: "Not signed in" };
  }
  const token = await ensureShareToken(profileId);
  if (!token) return { error: "No recap to share yet" };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const base = host ? `${proto}://${host}` : "";
  return { url: `${base}/recap/share/${token}` };
}
