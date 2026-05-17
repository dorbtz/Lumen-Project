/**
 * Pure CC0 episode-label helpers. NO server imports — safe to use from
 * both the server data layer (lib/watch/episodes.ts) and client
 * components (Cc0SeasonsBrowser). Keeping these out of episodes.ts (which
 * imports the Neon `db` client) is what prevents server code being
 * bundled into the browser.
 */

/** "Episode 14 — 02x01 The Insidious Six" → {season:2, ep:1}. */
export function parseSeasonEp(label: string): {
  season: number | null;
  ep: number | null;
} {
  const m = label.match(/\b(\d{1,2})\s*x\s*(\d{1,3})\b/i);
  if (!m) return { season: null, ep: null };
  return { season: Number(m[1]), ep: Number(m[2]) };
}

/** Display name: drop the "Episode N — " and "NNxNN" prefixes. */
export function cleanEpisodeName(label: string): string {
  return (
    label
      .replace(/^\s*episode\s+\d+\s*[—–-]\s*/i, "")
      .replace(/^\s*\d{1,2}\s*x\s*\d{1,3}\s*[-—–:.]?\s*/i, "")
      .trim() || label
  );
}
