/**
 * Lumen — profile-scoped queries used by the auth/profile gate.
 * SPEC §10: Clerk webhook provisions accounts row + 1 default profile + default watchlist
 *           on `user.created`. Server components call these helpers to build the picker.
 */

import { db } from "@/lib/db/client";
import { accounts, profiles, watchlists } from "@/lib/db/schema";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

const MAX_PROFILES_PER_ACCOUNT = 5;

/**
 * Returns the Lumen account row for the current Clerk user, creating it lazily
 * if missing. Idempotent and race-safe — Suspense / parallel server renders can
 * invoke this concurrently; we rely on the `accounts.clerk_user_id` unique index
 * + ON CONFLICT DO NOTHING to make double-insert a no-op.
 */
export async function getOrCreateAccount() {
  const { userId } = await auth();
  if (!userId) return null;

  // Fast path: row already exists.
  const existing = await db.query.accounts.findFirst({
    where: eq(accounts.clerkUserId, userId),
  });
  if (existing) return existing;

  // Slow path: try to insert. ON CONFLICT swallows the race where a parallel
  // request also tried to insert; we then re-fetch and return that row.
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;

  const inserted = await db
    .insert(accounts)
    .values({ clerkUserId: userId, email })
    .onConflictDoNothing({ target: accounts.clerkUserId })
    .returning();

  // Lost the race — another request created the account. Re-fetch and bail
  // (the winning request will own profile/watchlist provisioning).
  if (inserted.length === 0) {
    return (
      (await db.query.accounts.findFirst({
        where: eq(accounts.clerkUserId, userId),
      })) ?? null
    );
  }

  const created = inserted[0];

  // We won the race — provision default profile + watchlist. Guarded against
  // a second concurrent winner with another existence check.
  const existingProfile = await db.query.profiles.findFirst({
    where: eq(profiles.accountId, created.id),
  });
  if (!existingProfile) {
    const [profile] = await db
      .insert(profiles)
      .values({
        accountId: created.id,
        name: user?.firstName ?? "You",
        avatarColor: "#FFB070",
        onboardingDone: false,
      })
      .returning();

    if (profile) {
      await db.insert(watchlists).values({
        profileId: profile.id,
        name: "Watchlist",
        isDefault: true,
      });
    }
  }

  return created;
}

export async function listProfilesForCurrentUser() {
  const account = await getOrCreateAccount();
  if (!account) return [];
  return db.query.profiles.findMany({
    where: eq(profiles.accountId, account.id),
    orderBy: (p, { asc }) => [asc(p.createdAt)],
  });
}

export async function profileBelongsToCurrentAccount(profileId: string): Promise<boolean> {
  const account = await getOrCreateAccount();
  if (!account) return false;
  const p = await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId),
  });
  return !!p && p.accountId === account.id;
}

export const PROFILE_CAP = MAX_PROFILES_PER_ACCOUNT;
