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
    archiveIdentifier: "le-voyage-dans-la-lune-1902",
  },
  {
    title: "The Cabinet of Dr. Caligari",
    year: 1920,
    tmdbId: 234,
    archiveIdentifier: "the-cabinet-of-dr.-caligari-1920",
  },
  { title: "Nosferatu", year: 1922, tmdbId: 653, archiveIdentifier: "nosferatu_201902" },
  {
    title: "Nanook of the North",
    year: 1922,
    tmdbId: 56353,
    archiveIdentifier: "nanook-of-the-north-1922",
  },
  { title: "Sherlock Jr.", year: 1924, tmdbId: 992, archiveIdentifier: "sherlock-jr-1924" },
  {
    title: "The Phantom of the Opera",
    year: 1925,
    tmdbId: 31065,
    archiveIdentifier: "ThePhantomOfTheOpera1925",
  },
  {
    title: "Battleship Potemkin",
    year: 1925,
    tmdbId: 706,
    archiveIdentifier: "BattleshipPotemkin",
  },
  { title: "The General", year: 1926, tmdbId: 961, archiveIdentifier: "TheGeneral1926" },
  { title: "Reefer Madness", year: 1936, tmdbId: 36420, archiveIdentifier: "reefer_madness1938" },
  { title: "His Girl Friday", year: 1940, tmdbId: 3083, archiveIdentifier: "his_girl_friday" },
  { title: "Detour", year: 1945, tmdbId: 27911, archiveIdentifier: "detour_1945" },
  { title: "The Stranger", year: 1946, tmdbId: 3104, archiveIdentifier: "TheStranger1946" },
  { title: "D.O.A.", year: 1949, tmdbId: 27482, archiveIdentifier: "DOA_1949" },
  {
    title: "Plan 9 from Outer Space",
    year: 1959,
    tmdbId: 922,
    archiveIdentifier: "Plan9FromOuterSpace_584",
  },
  { title: "The Killer Shrews", year: 1959, tmdbId: 30528, archiveIdentifier: "the_killer_shrews" },
  { title: "Carnival of Souls", year: 1962, tmdbId: 19586, archiveIdentifier: "carnival_of_souls" },
  { title: "Dementia 13", year: 1963, tmdbId: 25786, archiveIdentifier: "Dementia13 " },
  { title: "Charade", year: 1963, tmdbId: 4808, archiveIdentifier: "Charade_1963" },
  {
    title: "The Last Man on Earth",
    year: 1964,
    tmdbId: 23730,
    archiveIdentifier: "TheLastManOnEarth1964",
  },
  {
    title: "Night of the Living Dead",
    year: 1968,
    tmdbId: 10331,
    archiveIdentifier: "night-of-the-living-dead_1968",
  },
];
