/**
 * Nightly recap cron (SPEC_COMPLETION §1 A4, SPEC §14).
 *
 *   Schedule: 0 7 * * *  (vercel.json)
 *   Auth:     Authorization: Bearer $CRON_SECRET (reject otherwise)
 *
 * Rebuilds the recap for every profile active in the last 14 days. "Active"
 * = a journal entry, a rating, or a profile session in the window. Reuses
 * the existing recap generator (Gemini free tier already in the codebase —
 * NO new LLM call site is introduced; this just moves the existing call off
 * the request path). Quota-exhaustion is swallowed per-profile so one
 * profile can't fail the whole run.
 */

import { isAuthorizedCron } from "@/lib/cron/auth";
import { db } from "@/lib/db/client";
import { getOrGenerateRecap } from "@/lib/recap/service";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const WINDOW_DAYS = 14;

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rows = await db.execute(sql`
    SELECT DISTINCT p.id AS id
    FROM profiles p
    WHERE
      EXISTS (
        SELECT 1 FROM journal_entries je
        WHERE je.profile_id = p.id
          AND je.watched_at >= NOW() - INTERVAL '${sql.raw(String(WINDOW_DAYS))} days'
      )
      OR EXISTS (
        SELECT 1 FROM ratings r
        WHERE r.profile_id = p.id
          AND r.rated_at >= NOW() - INTERVAL '${sql.raw(String(WINDOW_DAYS))} days'
      )
      OR EXISTS (
        SELECT 1 FROM profile_sessions s
        WHERE s.profile_id = p.id
          AND s.started_at >= NOW() - INTERVAL '${sql.raw(String(WINDOW_DAYS))} days'
      )
  `);

  const profileIds = (rows.rows as Array<{ id: string }>).map((r) => r.id);

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  for (const profileId of profileIds) {
    try {
      const result = await getOrGenerateRecap(profileId, { force: true });
      if (result.kind === "ok") ok++;
      else if (result.kind === "generation_failed") {
        skipped++;
        // Quota exhaustion: stop early — every subsequent call will also 429.
        if (result.reason === "quota") {
          console.info("[cron/recap] Gemini quota exhausted — stopping run early");
          break;
        }
      } else {
        skipped++;
      }
    } catch (err) {
      failed++;
      console.error("[cron/recap] profile failed", {
        profileId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return Response.json({
    ok: true,
    job: "recap",
    candidates: profileIds.length,
    rebuilt: ok,
    skipped,
    failed,
  });
}
