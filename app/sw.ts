/**
 * Lumen — service worker (SPEC §11, SPEC_COMPLETION §2 B1).
 *
 * Built by @serwist/next to /public/sw.js. Strategy:
 *   - Precache the app shell (Serwist injects the precache manifest).
 *   - Network-first for navigations + data so signed-in pages stay fresh,
 *     with the offline fallback page when the network is gone.
 *   - Default runtime caching for static assets.
 */

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Network-first for page navigations — signed-in content must stay
      // fresh; the offline fallback covers a dead network.
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "lumen-pages",
        networkTimeoutSeconds: 4,
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.mode === "navigate",
      },
    ],
  },
});

serwist.addEventListeners();
