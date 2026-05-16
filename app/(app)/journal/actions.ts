"use server";

/**
 * Lumen — journal server actions.
 * Called by the JournalComposer (client) on title detail pages.
 */

import { getActiveProfileId } from "@/lib/auth/active-profile";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { createJournalEntry } from "@/lib/journal/service";

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
