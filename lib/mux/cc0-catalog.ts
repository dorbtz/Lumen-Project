/**
 * Lumen — CC0 / public-domain catalog (SPEC Appendix A.1, decision D1).
 *
 * The 20 confirmed-public-domain (US) films from the spec. Each entry pairs:
 *   - tmdbId            → links the Mux asset to our `titles` row
 *   - archiveIdentifier → an Internet Archive item id; the ingest script
 *                          resolves the largest MP4 via the IA metadata API
 *                          and hands that URL to Mux as the asset `input`.
 *
 * Catalog is capped at 20 per SPEC §17 (Mux egress / trial-credit budget).
 * archive.org hosts these as public-domain media; Mux pulls the file once
 * at ingest and serves HLS thereafter (no archive.org on the hot path).
 *
 * All identifiers verified 2026-05-16 against the IA metadata API.
 * All TMDB ids verified 2026-05-16 against the TMDB movie endpoint.
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
    title: "His Girl Friday",
    year: 1940,
    tmdbId: 3085,
    archiveIdentifier: "his_girl_friday",
  },
  {
    title: "Detour",
    year: 1945,
    tmdbId: 20367,
    archiveIdentifier: "detour_1945",
  },
  {
    title: "The Stranger",
    year: 1946,
    tmdbId: 20246,
    archiveIdentifier: "the-stranger-1946_202404",
  },
  {
    title: "D.O.A.",
    year: 1949,
    tmdbId: 18995,
    archiveIdentifier: "DOA1950",
  },
  {
    title: "Plan 9 from Outer Space",
    year: 1957,
    tmdbId: 10513,
    archiveIdentifier: "plan-9-from-outer-space_202011",
  },
  {
    title: "The Killer Shrews",
    year: 1959,
    tmdbId: 43109,
    archiveIdentifier: "the-killer-shrews",
  },
  {
    title: "Carnival of Souls",
    year: 1962,
    tmdbId: 16093,
    archiveIdentifier: "carnival_of_souls",
  },
  {
    title: "Dementia 13",
    year: 1963,
    tmdbId: 28503,
    archiveIdentifier: "dementia-13-1963_202312",
  },
  {
    title: "Charade",
    year: 1963,
    tmdbId: 4808,
    archiveIdentifier: "charade_202604",
  },
  {
    title: "The Last Man on Earth",
    year: 1964,
    tmdbId: 21159,
    archiveIdentifier: "TheLastManOnEarth1964_201808",
  },
  {
    title: "Night of the Living Dead",
    year: 1968,
    tmdbId: 10331,
    archiveIdentifier: "night-of-the-living-dead_1968",
  },
];
