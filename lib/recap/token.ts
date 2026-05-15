/**
 * Lumen — recap share-token generation (SPEC_COMPLETION §1 A2).
 *
 * Pure + DB-free so it's unit-testable in isolation (SPEC_COMPLETION §2
 * B2). 16 random bytes → base64url → ~128 bits of entropy, unguessable.
 * Rotation = simply minting a fresh token (the old one no longer maps to
 * any row).
 */

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
