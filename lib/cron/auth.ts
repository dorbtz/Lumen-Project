/**
 * Lumen — cron authorization (SPEC_COMPLETION §1 A4).
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. We reject any
 * request that doesn't present it. Constant-time compare to avoid leaking
 * the secret via timing.
 */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed if misconfigured
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  // Length-pad to keep the compare constant-ish even on prefix mismatch.
  return (
    timingSafeEqual(header.padEnd(expected.length, "\0").slice(0, expected.length), expected) &&
    header.length === expected.length
  );
}
