/**
 * Lumen — palette extraction.
 * SPEC §5.3: extract a 5-stop vibrant palette per poster at ingest, store as jsonb.
 * Used for: content tinting on title pages, glass material tint, recap card backgrounds.
 *
 * Runtime: Node-only (uses node-vibrant). Never import from client components.
 *
 * Note: node-vibrant v4 changed the Swatch API — hex is now a property, not getHex().
 */

import type { Swatch } from "@vibrant/color";
import { Vibrant } from "node-vibrant/node";

export interface LumenPalette {
  /** Hex strings (e.g. "#1a2b3c") */
  dominant: string | null;
  vibrant: string | null;
  muted: string | null;
  darkVibrant: string | null;
  lightVibrant: string | null;
  darkMuted: string | null;
  lightMuted: string | null;
}

const toHex = (sw: Swatch | null | undefined): string | null => {
  if (!sw) return null;
  try {
    return sw.hex;
  } catch {
    return null;
  }
};

export async function extractPalette(imageUrl: string): Promise<LumenPalette> {
  const v = Vibrant.from(imageUrl);
  const p = await v.getPalette();
  const dominant =
    toHex(p.Vibrant) ?? toHex(p.LightVibrant) ?? toHex(p.DarkVibrant) ?? toHex(p.Muted) ?? null;
  return {
    dominant,
    vibrant: toHex(p.Vibrant),
    muted: toHex(p.Muted),
    darkVibrant: toHex(p.DarkVibrant),
    lightVibrant: toHex(p.LightVibrant),
    darkMuted: toHex(p.DarkMuted),
    lightMuted: toHex(p.LightMuted),
  };
}
