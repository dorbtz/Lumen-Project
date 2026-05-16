"use server";

/**
 * Persist resume position / completion as the user watches a CC0 stream.
 * Called (throttled) from WatchPlayer. No-ops safely when there's no
 * active profile or before migration 0006 — the player keeps working.
 */

import { getActiveProfileId } from "@/lib/auth/active-profile";
import { recordWatchProgress } from "@/lib/watch/episodes";

export async function recordWatchProgressAction(args: {
  tmdbId: number;
  episodeIndex: number;
  positionSec: number;
  durationSec: number | null;
  completed: boolean;
}): Promise<void> {
  const profileId = await getActiveProfileId();
  if (!profileId) return;
  if (!Number.isFinite(args.tmdbId)) return;
  await recordWatchProgress({
    profileId,
    tmdbId: args.tmdbId,
    episodeIndex: Number.isFinite(args.episodeIndex)
      ? Math.max(0, Math.trunc(args.episodeIndex))
      : 0,
    positionSec: Number.isFinite(args.positionSec) ? args.positionSec : 0,
    durationSec:
      args.durationSec != null && Number.isFinite(args.durationSec) ? args.durationSec : null,
    completed: Boolean(args.completed),
  });
}
