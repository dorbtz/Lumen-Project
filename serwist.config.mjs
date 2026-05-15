/**
 * Lumen — Serwist configurator (SPEC §11, SPEC_COMPLETION §2 B1).
 *
 * Configurator mode is bundler-agnostic — it works with Next.js 16's
 * default Turbopack (the legacy @serwist/next webpack plugin does NOT).
 * `serwist build` runs AFTER `next build` and precaches the prerendered
 * app shell, emitting public/sw.js (gitignored — built artefact).
 */

import { serwist } from "@serwist/next/config";

export default await serwist({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  globDirectory: ".next",
});
