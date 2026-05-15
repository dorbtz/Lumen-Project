/**
 * Lumen — active-profile cookie.
 * SPEC §6: signed HTTP-only cookie `lumen_active_profile` stores the selected
 * profile id for the current browser session.
 *
 * We use HMAC-SHA256 over the secret in `LUMEN_PROFILE_COOKIE_SECRET`. Web Crypto only.
 */

import { cookies } from "next/headers";

const COOKIE_NAME = "lumen_active_profile";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

const enc = new TextEncoder();

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.LUMEN_PROFILE_COOKIE_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "[lumen/auth] LUMEN_PROFILE_COOKIE_SECRET must be a 32+ char random string. Generate with: openssl rand -hex 32",
    );
  }
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function b64url(bytes: ArrayBuffer): string {
  const b = Buffer.from(bytes).toString("base64");
  return b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(str: string): Uint8Array<ArrayBuffer> {
  const buf = Buffer.from(
    str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4),
    "base64",
  );
  // Copy into a fresh ArrayBuffer (NOT ArrayBufferLike) to satisfy WebCrypto's
  // BufferSource type. Node's Buffer<ArrayBufferLike> isn't assignable since TS5.
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  return new Uint8Array(ab);
}

async function sign(value: string): Promise<string> {
  const key = await getKey();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return `${value}.${b64url(sig)}`;
}

async function verify(signed: string): Promise<string | null> {
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const key = await getKey();
  const ok = await crypto.subtle.verify("HMAC", key, fromB64url(sig), enc.encode(value));
  return ok ? value : null;
}

/** Read the active profile id from the signed cookie, or null. */
export async function getActiveProfileId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return verify(raw);
}

/** Sets the active profile id cookie. Must be called from a Server Action or Route Handler. */
export async function setActiveProfileId(profileId: string): Promise<void> {
  const store = await cookies();
  const signed = await sign(profileId);
  store.set({
    name: COOKIE_NAME,
    value: signed,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SEC,
    path: "/",
  });
}

/** Clears the active profile cookie (e.g. on sign-out or "switch profile"). */
export async function clearActiveProfile(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
