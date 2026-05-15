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
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
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
