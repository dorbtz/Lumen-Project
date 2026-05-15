/**
 * Lumen — PWA manifest (SPEC §11, SPEC_COMPLETION §2 B1).
 *
 * Colors match the sapphire base (globals.css --color-surface-0 = #0A1428).
 * Icons live in /public (maskable + any). display: standalone so the app
 * feels native on iOS/Android home screens.
 */

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lumen — discover by mood",
    short_name: "Lumen",
    description: "Mood-first movie discovery, explainable AI taste, and a living cinema journal.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0A1428",
    theme_color: "#0A1428",
    categories: ["entertainment", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
