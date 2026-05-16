/**
 * Lumen — CC0 / public-domain catalog (SPEC Appendix A.1, decision D1).
 *
 * Each entry pairs:
 *   - tmdbId            → links the Mux asset to our `titles` row
 *   - archiveIdentifier → an Internet Archive item id; the ingest script
 *                          resolves the largest MP4 via the IA metadata API
 *                          and hands that URL to Mux as the asset `input`.
 *
 * Capped at 10 entries: Mux's free plan hard-limits an account to 10 video
 * assets (`400 invalid_parameters "Free plan is limited to 10 assets"`).
 * SPEC §17 originally listed 20 films, but the free-tier-only constraint
 * makes 10 the real ceiling, so the catalog is trimmed to exactly the 10
 * that are ingested and `ready` on Mux. `/title/[id]/watch` plays these
 * via Mux HLS and gracefully falls back to the YouTube trailer for any
 * other title. archive.org hosts these as public-domain media; Mux pulls
 * the file once at ingest and serves HLS thereafter (no archive.org on
 * the hot path).
 *
 * All identifiers verified 2026-05-16 against the IA metadata API.
 * All TMDB ids verified 2026-05-16 against the TMDB movie endpoint.
 * All 10 confirmed `ready` on Mux 2026-05-16.
 */

export interface Cc0CatalogEntry {
  title: string;
  year: number;
  tmdbId: number;
  archiveIdentifier: string;
}

export const CC0_CATALOG: Cc0CatalogEntry[] = [
  {
    title: "A Trip to the Moon",
    year: 1902,
    tmdbId: 775,
    archiveIdentifier: "le-voyage-dans-la-lune-1902-georges-melies",
  },
  {
    title: "The Cabinet of Dr. Caligari",
    year: 1920,
    tmdbId: 234,
    archiveIdentifier:
      "the-cabinet-of-dr.-caligari-1920-fantasy-horror-mystery-silent-film-1080p-25fps-h-264-128kbit-aac",
  },
  {
    title: "Nosferatu",
    year: 1922,
    tmdbId: 653,
    archiveIdentifier: "nosferatu_202501",
  },
  {
    title: "Nanook of the North",
    year: 1922,
    tmdbId: 669,
    archiveIdentifier: "NanookOfTheNorth",
  },
  {
    title: "Sherlock Jr.",
    year: 1924,
    tmdbId: 992,
    archiveIdentifier: "sherlock-jr.-1924-by-buster-keaton",
  },
  {
    title: "The Phantom of the Opera",
    year: 1925,
    tmdbId: 964,
    archiveIdentifier: "PhantomOfTheOpera1925HD",
  },
  {
    title: "Battleship Potemkin",
    year: 1925,
    tmdbId: 643,
    archiveIdentifier: "BattleshipPotemkin",
  },
  {
    title: "The General",
    year: 1926,
    tmdbId: 961,
    archiveIdentifier: "TheGeneral1926",
  },
  {
    // TMDB lists this under its original release title "Tell Your Children";
    // "Reefer Madness" is the 1938 re-release title for the same film.
    title: "Reefer Madness",
    year: 1936,
    tmdbId: 37833,
    archiveIdentifier: "reefer_madness1938",
  },
  {
    title: "Night of the Living Dead",
    year: 1968,
    tmdbId: 10331,
    archiveIdentifier: "night-of-the-living-dead_1968",
  },
];
