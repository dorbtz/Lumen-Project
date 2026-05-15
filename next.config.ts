import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Next.js 16 — view transitions for cross-route morphs
    viewTransition: true,
    // Cache Components disabled for MVP: Clerk Next.js SDK v6 isn't fully
    // compatible with the new dynamic-IO model yet (root ClerkProvider triggers
    // "uncached data outside <Suspense>"). Re-enable in v1.1 once Clerk ships
    // its Cache Components support. SPEC §7.2 caching strategy still works via
    // unstable_cache / cacheTag / cacheLife.
    // cacheComponents: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
    ],
  },
  // SPEC §5: typography expects SF Pro / Inter Display — make sure system fonts pass through cleanly
  // SPEC §11: PWA — service worker registered in app/layout
  serverExternalPackages: ["@neondatabase/serverless"],
};

export default nextConfig;
