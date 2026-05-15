"use server";

/**
 * Onboarding server actions (SPEC §A.2).
 *
 * Inputs come from the client OnboardingStack as { tmdbId, stars } pairs
 * (stars 1..5, or skipped → omitted from the list).
 *
 * Steps:
 *   1. Validate ≥5 ratings.
 *   2. For each rating, look up the title row + insert a ratings row
 *      (stars * 2 → score 1..10).
 *   3. Compute weighted-mean of rated titles' embeddings → 384d taste_centroid.
 *      Skip titles missing an embedding; if none have one, leave centroid NULL.
 *   4. profiles.onboarding_done = true.
 *   5. redirect("/home").
 *
 * Race-safe inserts: ratings has UNIQUE(profile_id, title_id), so we use
 * onConflictDoUpdate. The profile row update is atomic.
 */

import { getActiveProfileId } from "@/lib/auth/active-profile";
import {
  clearOnboardingSnooze,
  setOnboardingSnooze,
} from "@/lib/auth/onboarding-snooze";
import { profileBelongsToCurrentAccount } from "@/lib/auth/profile-queries";
import { db } from "@/lib/db/client";
import { getTitleEmbedding, getTitlesByTmdbIds } from "@/lib/db/queries";
import { profiles, ratings } from "@/lib/db/schema";
import { MIN_RATINGS_FOR_CENTROID } from "@/lib/onboarding/seed-films";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

const RatingInput = z.object({
  tmdbId: z.number().int().positive(),
  stars: z.number().int().min(1).max(5),
});

const SubmitInput = z.object({
  // No upper bound: with the popular-fallback pool, a user can rate well beyond
  // the initial 10 seed films. Lower bound stays at MIN_RATINGS_FOR_CENTROID.
  ratings: z.array(RatingInput).min(MIN_RATINGS_FOR_CENTROID),
});

export async function submitOnboardingAction(payload: unknown): Promise<void> {
  const parsed = SubmitInput.safeParse(payload);
  if (!parsed.success) {
    throw new Error(`Need at least ${MIN_RATINGS_FOR_CENTROID} ratings to complete onboarding.`);
  }

  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    redirect("/profiles");
  }

  const inputs = parsed.data.ratings;
  const titleRows = await getTitlesByTmdbIds(inputs.map((r) => r.tmdbId));
  const byTmdb = new Map(titleRows.map((r) => [r.tmdbId, r]));

  // 1. Persist ratings (idempotent via UNIQUE(profile_id, title_id))
  for (const r of inputs) {
    const row = byTmdb.get(r.tmdbId);
    if (!row) continue; // seed film missing from DB — skip rather than crash
    const score = r.stars * 2; // 1..5 → 2..10
    await db
      .insert(ratings)
      .values({
        profileId,
        titleId: row.id,
        score,
        liked: r.stars >= 4,
      })
      .onConflictDoUpdate({
        target: [ratings.profileId, ratings.titleId],
        set: { score, liked: r.stars >= 4, ratedAt: sql`now()` },
      });
  }

  // 2. Compute weighted-mean of rated titles' embeddings.
  const weightedEmbeddings: Array<{ vec: number[]; w: number }> = [];
  for (const r of inputs) {
    const row = byTmdb.get(r.tmdbId);
    if (!row) continue;
    const emb = await getTitleEmbedding(row.id);
    if (!emb) continue;
    weightedEmbeddings.push({ vec: emb, w: r.stars / 5 }); // 0.2..1.0
  }

  let centroidLiteral: string | null = null;
  if (weightedEmbeddings.length > 0) {
    const dim = weightedEmbeddings[0]!.vec.length;
    const accum = new Array<number>(dim).fill(0);
    let totalW = 0;
    for (const { vec, w } of weightedEmbeddings) {
      if (vec.length !== dim) continue;
      for (let i = 0; i < dim; i++) accum[i] += vec[i]! * w;
      totalW += w;
    }
    if (totalW > 0) {
      const mean = accum.map((x) => x / totalW);
      const norm = Math.sqrt(mean.reduce((s, x) => s + x * x, 0)) || 1;
      const normalized = mean.map((x) => x / norm);
      centroidLiteral = `[${normalized.join(",")}]`;
    }
  }

  // 3. Persist centroid + onboarding_done. Use raw SQL for the vector cast.
  if (centroidLiteral) {
    await db.execute(sql`
      UPDATE profiles
      SET taste_centroid = ${centroidLiteral}::vector(384),
          onboarding_done = true
      WHERE id = ${profileId}
    `);
  } else {
    await db.update(profiles).set({ onboardingDone: true }).where(eq(profiles.id, profileId));
  }

  // Onboarding finished — make sure any prior snooze cookie is cleared so it
  // doesn't linger and confuse future flows.
  await clearOnboardingSnooze();

  redirect("/home");
}

/**
 * Bail out of the onboarding flow.
 *   mode: "later"     → don't mark onboarding_done. Home will redirect the
 *                       viewer back here on next visit (gentle nudge).
 *   mode: "permanent" → mark onboarding_done = true with NO taste centroid.
 *                       Home will fall back to popularity-based rows; taste
 *                       will accrue passively from ratings + journal entries
 *                       as the viewer uses the app.
 */
export async function skipOnboardingAction(mode: "later" | "permanent"): Promise<void> {
  const profileId = await getActiveProfileId();
  if (!profileId || !(await profileBelongsToCurrentAccount(profileId))) {
    redirect("/profiles");
  }
  if (mode === "permanent") {
    await db.update(profiles).set({ onboardingDone: true }).where(eq(profiles.id, profileId));
    await clearOnboardingSnooze();
  } else {
    // "later" — set the 24h snooze cookie so /home doesn't bounce the viewer
    // straight back to /onboarding on this same redirect.
    await setOnboardingSnooze();
  }
  redirect("/home");
}
