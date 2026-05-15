/**
 * Lumen — Why Card service.
 *
 * Reads from `why_explanations` cache (14-day TTL per SPEC §7.2). On miss or
 * staleness, generates via Gemini, upserts the row, returns the new card.
 *
 * The why_explanations unique index is (profile_id, title_id), so concurrent
 * requests for the same pair race-safely thanks to ON CONFLICT DO UPDATE.
 */

import { db } from "@/lib/db/client";
import { titles, whyExplanations } from "@/lib/db/schema";
import { generateWhyCard, type WhyCard } from "@/lib/ai/why";
import { getTopTasteDimensionsOrDefault } from "@/lib/profile/dimensions";
import { and, eq } from "drizzle-orm";

const TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export interface WhyCardResult {
  card: WhyCard;
  /** "fresh" when we just generated, "cached" when served from why_explanations. */
  source: "fresh" | "cached";
}

/**
 * Get or build a Why Card for (profile, title). Returns null when the title
 * has no overview to ground the explanation in — we'd rather skip than
 * hallucinate.
 */
export async function getOrGenerateWhyCard(
  profileId: string,
  titleUuid: string,
): Promise<WhyCardResult | null> {
  // Cache hit?
  const cached = await db.query.whyExplanations.findFirst({
    where: and(
      eq(whyExplanations.profileId, profileId),
      eq(whyExplanations.titleId, titleUuid),
    ),
  });
  if (cached && Date.now() - cached.generatedAt.getTime() < TTL_MS) {
    return {
      card: {
        reasons: cached.reasons as WhyCard["reasons"],
        explanation_text: cached.explanationText,
      },
      source: "cached",
    };
  }

  // Need title context to ground the prompt.
  const title = await db.query.titles.findFirst({ where: eq(titles.id, titleUuid) });
  if (!title || !title.overview) return null;

  const dimensions = await getTopTasteDimensionsOrDefault(profileId);

  let card: WhyCard;
  try {
    card = await generateWhyCard({
      title: title.title,
      overview: title.overview,
      topUserDimensions: dimensions,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = (err as { statusCode?: number; status?: number })?.statusCode ??
      (err as { status?: number })?.status;
    const isQuota = status === 429 || /quota|rate.?limit|exhaust/i.test(msg);
    // Quota errors are expected when the daily Gemini free tier resets — log
    // once at info level so we don't spam the console on every page render.
    if (isQuota) {
      console.info("[why] skipped — Gemini quota exhausted", { titleUuid });
    } else {
      console.error("[why] Gemini generation failed", {
        titleUuid,
        message: msg,
        status,
        cause: (err as { cause?: unknown })?.cause,
      });
    }
    return null;
  }

  // Upsert. ON CONFLICT updates so a stale row regenerates in place.
  await db
    .insert(whyExplanations)
    .values({
      profileId,
      titleId: titleUuid,
      reasons: card.reasons,
      explanationText: card.explanation_text,
      modelUsed: "gemini-2.5-flash-lite",
    })
    .onConflictDoUpdate({
      target: [whyExplanations.profileId, whyExplanations.titleId],
      set: {
        reasons: card.reasons,
        explanationText: card.explanation_text,
        modelUsed: "gemini-2.5-flash-lite",
        generatedAt: new Date(),
      },
    });

  return { card, source: "fresh" };
}
