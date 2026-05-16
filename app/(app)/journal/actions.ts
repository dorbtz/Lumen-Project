"use server";

/**
 * Lumen — journal server actions.
 * Called by the JournalComposer (client) on title detail pages.
 */

import { getActiveProfileId } from "@/lib/auth/active-profile";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import {
  createJournalEntry,
  deleteAllJournalEntries,
  deleteJournalEntries,
} from "@/lib/journal/service";
import { revalidatePath } from "next/cache";

export interface SaveJournalEntryArgs {
  titleUuid: string;
  reflection: string;
  valence: number;
  arousal: number;
  /** Optional 1–5 star rating — feeds the taste model (plan WS9). */
  journalStars?: number;
}

export interface SaveJournalEntryResult {
  ok: boolean;
  id?: string;
  generatedQuestion?: string;
  error?: string;
}

export async function saveJournalEntryAction(
  args: SaveJournalEntryArgs,
): Promise<SaveJournalEntryResult> {
  const profileId = await getActiveProfileId();
  if (!profileId) return { ok: false, error: "Not signed in" };
  if (!(await profileBelongsToCurrentAccount(profileId))) {
    return { ok: false, error: "Profile mismatch" };
  }
  try {
    const result = await createJournalEntry({
      profileId,
      titleUuid: args.titleUuid,
      reflection: args.reflection,
      valence: args.valence,
      arousal: args.arousal,
      journalStars: args.journalStars,
    });
    return { ok: true, id: result.id, generatedQuestion: result.generatedQuestion };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: msg };
  }
}

export interface DeleteJournalResult {
  ok: boolean;
  removed?: number;
  error?: string;
}

/** Delete selected entries (ids) or, when `all` is true, the whole journal. */
export async function deleteJournalAction(args: {
  ids?: string[];
  all?: boolean;
}): Promise<DeleteJournalResult> {
  const profileId = await getActiveProfileId();
  if (!profileId) return { ok: false, error: "Not signed in" };
  if (!(await profileBelongsToCurrentAccount(profileId))) {
    return { ok: false, error: "Profile mismatch" };
  }
  try {
    const removed = args.all
      ? await deleteAllJournalEntries(profileId)
      : await deleteJournalEntries(profileId, args.ids ?? []);
    revalidatePath("/journal");
    return { ok: true, removed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: msg };
  }
}
