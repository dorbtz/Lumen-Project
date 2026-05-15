/**
 * Lumen — Clerk auth proxy (Next.js 16 renamed `middleware.ts` → `proxy.ts`).
 * Protects everything under /(app), leaves /(marketing), /sign-in, /sign-up,
 * and the webhook public.
 *
 * `next dev` still tolerated the old `middleware.ts` filename, but the Next 16
 * production build path requires `proxy.ts` — without it the Clerk middleware
 * never ran in prod and every protected route 404'd. Same clerkMiddleware
 * API; only the file name changed.
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/(.*)",
  // Public read-only recap share (SPEC_COMPLETION §1 A2). No auth, no profile
  // data beyond the recap story; token is unguessable + rotated on rebuild.
  "/recap/share/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  // Explicit redirect over `auth.protect()`: protect() returns a bare 404 for
  // signed-out users when Clerk can't resolve a sign-in URL (happens with a
  // development instance on a non-localhost domain). redirectToSignIn always
  // produces a proper 307 to our self-hosted /sign-in and preserves the
  // return-to URL.
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
