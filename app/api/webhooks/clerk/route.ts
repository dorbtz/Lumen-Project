/**
 * Lumen — Clerk webhook handler.
 * SPEC §10: on `user.created`, provision accounts row + 1 default profile + default watchlist.
 * Signature verified via Svix (per Clerk docs).
 */

import { db } from "@/lib/db/client";
import { accounts, profiles, watchlists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

export const runtime = "nodejs";

interface ClerkUserCreatedPayload {
  data: {
    id: string;
    first_name?: string | null;
    email_addresses?: { email_address: string; id: string }[];
    primary_email_address_id?: string | null;
  };
  type: "user.created" | "user.updated" | "user.deleted";
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CLERK_WEBHOOK_SIGNING_SECRET not configured" },
      { status: 500 },
    );
  }

  const h = await headers();
  const svixId = h.get("svix-id");
  const svixTimestamp = h.get("svix-timestamp");
  const svixSignature = h.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  let evt: ClerkUserCreatedPayload;
  try {
    evt = new Webhook(secret).verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserCreatedPayload;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[clerk-webhook] verify failed", err);
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  if (evt.type === "user.created") {
    const u = evt.data;
    const primary = u.email_addresses?.find((e) => e.id === u.primary_email_address_id);
    const email = primary?.email_address ?? u.email_addresses?.[0]?.email_address ?? null;

    // Idempotent
    const existing = await db.query.accounts.findFirst({
      where: eq(accounts.clerkUserId, u.id),
    });
    if (existing) return NextResponse.json({ ok: true, status: "already_exists" });

    const [account] = await db.insert(accounts).values({ clerkUserId: u.id, email }).returning();

    const [profile] = await db
      .insert(profiles)
      .values({
        accountId: account.id,
        name: u.first_name ?? "You",
        avatarColor: "#FFB070",
        onboardingDone: false,
      })
      .returning();

    await db.insert(watchlists).values({
      profileId: profile.id,
      name: "Watchlist",
      isDefault: true,
    });

    return NextResponse.json({ ok: true, accountId: account.id, profileId: profile.id });
  }

  if (evt.type === "user.deleted") {
    await db.delete(accounts).where(eq(accounts.clerkUserId, evt.data.id));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: evt.type });
}
