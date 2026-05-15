/**
 * Catalog refresh cron (SPEC_COMPLETION §1 A4, decision D3, SPEC §6.1/§14).
 *
 *   Schedule: 0 8 * * *  (vercel.json) — daily, because Hobby crons are
 *             daily-only. The handler SELF-GATES: it runs the heavy TMDB
 *             refresh ONLY on Sundays (day-of-week check) and is a light
 *             no-op every other day, so we stay inside the Hobby plan with
 *             no paid upgrade.
 *   Auth:     Authorization: Bearer $CRON_SECRET (reject otherwise).
 *
 * The refresh reuses lib/tmdb/sync.ts (getOrSyncTitle) and is bounded to a
 * few pages of /movie/popular + /trending/all/week — the same surface the
 * seed script already uses. No embedding backfill on the request path
 * (SPEC §6.1) — embeddings are produced by the offline embed script.
 */

import { isAuthorizedCron } from "@/lib/cron/auth";
import { tmdb } from "@/lib/tmdb/client";
import { getOrSyncTitle } from "@/lib/tmdb/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Bounded surface — same pages the seed script touches. Kept small so a
// single weekly run stays well within TMDB rate limits + the function
// timeout.
const POPULAR_PAGES = 3;
const TRENDING_PAGES = 1;

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Day-of-week self-gate (D3). 0 = Sunday. UTC is fine — this is a catalog
  // refresh, not a user-facing time.
  const day = new Date().getUTCDay();
  if (day !== 0) {
    return Response.json({
      ok: true,
      job: "catalog",
      ran: false,
      reason: "not-sunday",
      day,
    });
  }

  const tmdbIds = new Set<number>();

  try {
    for (let p = 1; p <= POPULAR_PAGES; p++) {
      const page = await tmdb.popular(p);
      for (const m of page.results) tmdbIds.add(m.id);
    }
  } catch (err) {
    console.warn("[cron/catalog] popular fetch failed", (err as Error).message);
  }

  try {
    for (let p = 1; p <= TRENDING_PAGES; p++) {
      const page = await tmdb.trendingAll("week", p);
      for (const r of page.results) {
        if (r.media_type === "movie") tmdbIds.add(r.id);
      }
    }
  } catch (err) {
    console.warn("[cron/catalog] trending fetch failed", (err as Error).message);
  }

  let synced = 0;
  let failed = 0;
  for (const id of tmdbIds) {
    try {
      // getOrSyncTitle upserts when stale (>7d) and is idempotent.
      const row = await getOrSyncTitle(id);
      if (row) synced++;
      else failed++;
    } catch (err) {
      failed++;
      console.error("[cron/catalog] sync failed", {
        tmdbId: id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return Response.json({
    ok: true,
    job: "catalog",
    ran: true,
    candidates: tmdbIds.size,
    synced,
    failed,
  });
}
