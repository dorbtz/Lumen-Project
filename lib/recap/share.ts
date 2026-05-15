/**
 * Lumen — recap share-token helpers (SPEC_COMPLETION §1 A2).
 *
 * The token is an unguessable, URL-safe random string. We avoid a new npm
 * dependency (nanoid) and use Web Crypto directly — available in the Node
 * runtime and Edge. 16 bytes → ~22 base64url chars → ~128 bits of entropy,
 * unguessable per spec.
 *
 * Rotation: regenerating a recap rotates the token, which revokes any
 * previously-shared public link (the old token no longer maps to a row).
 */

import { db } from "@/lib/db/client";
import { recapStates } from "@/lib/db/schema";
import { and, desc, eq, isNotNull } from "drizzle-orm";

const TOKEN_BYTES = 16;

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateShareToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

/**
 * Ensure the latest recap row for a profile has a share token; create one
 * if missing. Returns the token, or null if the profile has no recap yet.
 */
export async function ensureShareToken(profileId: string): Promise<string | null> {
  const latest = await db.query.recapStates.findFirst({
    where: eq(recapStates.profileId, profileId),
    orderBy: [desc(recapStates.generatedAt)],
  });
  if (!latest) return null;
  if (latest.shareToken) return latest.shareToken;

  const token = generateShareToken();
  await db.update(recapStates).set({ shareToken: token }).where(eq(recapStates.id, latest.id));
  return token;
}

interface SharedRecapStory {
  headline: string;
  story: string;
  moments: Array<{
    tmdbId: number;
    title: string;
    posterPath: string | null;
    beat: string;
  }>;
  entryCount: number;
  windowDays: number;
}

export interface PublicRecap {
  headline: string;
  story: string;
  firstMoment: { title: string; beat: string; posterPath: string | null } | null;
  moments: SharedRecapStory["moments"];
  generatedAt: Date;
}

/**
 * Resolve a public recap by its share token. Read-only, no auth, no profile
 * data beyond the recap story itself (SPEC_COMPLETION A2). Returns null for
 * unknown / rotated tokens.
 */
export async function getRecapByShareToken(token: string): Promise<PublicRecap | null> {
  if (!token || token.length < 8 || token.length > 64) return null;
  const row = await db.query.recapStates.findFirst({
    where: and(eq(recapStates.shareToken, token), isNotNull(recapStates.shareToken)),
  });
  if (!row) return null;
  const story = row.storyJson as unknown as SharedRecapStory;
  const first = story.moments?.[0] ?? null;
  return {
    headline: story.headline,
    story: story.story,
    firstMoment: first
      ? { title: first.title, beat: first.beat, posterPath: first.posterPath }
      : null,
    moments: story.moments ?? [],
    generatedAt: row.generatedAt,
  };
}
