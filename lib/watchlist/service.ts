/**
 * Lumen — watchlist service.
 * One default watchlist per profile. All operations are profile-scoped and
 * idempotent — safe to call from server actions with `onConflictDoNothing`.
 */

import { db } from "@/lib/db/client";
import { titles, watchlistItems, watchlists } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

export interface WatchlistItemWithTitle {
  titleId: string;
  addedAt: Date;
  title: {
    id: string;
    tmdbId: number;
    title: string;
    posterPath: string | null;
    releaseYear: number | null;
    type: string;
  };
}

/** Finds or lazily creates the default watchlist row for a profile. */
async function getOrCreateDefaultWatchlist(profileId: string): Promise<{ id: string }> {
  const existing = await db.query.watchlists.findFirst({
    where: and(eq(watchlists.profileId, profileId), eq(watchlists.isDefault, true)),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(watchlists)
    .values({ profileId, name: "Watchlist", isDefault: true })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  // Lost insert race — re-fetch.
  const refetched = await db.query.watchlists.findFirst({
    where: and(eq(watchlists.profileId, profileId), eq(watchlists.isDefault, true)),
  });
  if (!refetched) throw new Error("[watchlist] could not provision default watchlist");
  return refetched;
}

/** Adds a title to the profile's default watchlist. Idempotent. */
export async function addToWatchlist(profileId: string, titleUuid: string): Promise<void> {
  const wl = await getOrCreateDefaultWatchlist(profileId);
  await db
    .insert(watchlistItems)
    .values({ watchlistId: wl.id, titleId: titleUuid })
    .onConflictDoNothing();
}

/** Removes a title from the profile's default watchlist. No-op if absent. */
export async function removeFromWatchlist(profileId: string, titleUuid: string): Promise<void> {
  const wl = await getOrCreateDefaultWatchlist(profileId);
  await db
    .delete(watchlistItems)
    .where(and(eq(watchlistItems.watchlistId, wl.id), eq(watchlistItems.titleId, titleUuid)));
}

/** Returns true when the title is in the profile's default watchlist. */
export async function isInWatchlist(profileId: string, titleUuid: string): Promise<boolean> {
  const wl = await db.query.watchlists.findFirst({
    where: and(eq(watchlists.profileId, profileId), eq(watchlists.isDefault, true)),
  });
  if (!wl) return false;

  const item = await db.query.watchlistItems.findFirst({
    where: and(eq(watchlistItems.watchlistId, wl.id), eq(watchlistItems.titleId, titleUuid)),
  });
  return !!item;
}

/** Returns all watchlist items (newest first) joined with title metadata. */
export async function listWatchlistItems(
  profileId: string,
  limit = 100,
): Promise<WatchlistItemWithTitle[]> {
  const wl = await db.query.watchlists.findFirst({
    where: and(eq(watchlists.profileId, profileId), eq(watchlists.isDefault, true)),
  });
  if (!wl) return [];

  const rows = await db
    .select({
      titleId: watchlistItems.titleId,
      addedAt: watchlistItems.addedAt,
      titleUuid: titles.id,
      titleTmdbId: titles.tmdbId,
      titleTitle: titles.title,
      titlePoster: titles.posterPath,
      titleYear: titles.releaseYear,
      titleType: titles.type,
    })
    .from(watchlistItems)
    .innerJoin(titles, eq(watchlistItems.titleId, titles.id))
    .where(eq(watchlistItems.watchlistId, wl.id))
    .orderBy(desc(watchlistItems.addedAt))
    .limit(limit);

  return rows.map((r) => ({
    titleId: r.titleId,
    addedAt: r.addedAt,
    title: {
      id: r.titleUuid,
      tmdbId: r.titleTmdbId,
      title: r.titleTitle,
      posterPath: r.titlePoster,
      releaseYear: r.titleYear,
      type: r.titleType,
    },
  }));
}
