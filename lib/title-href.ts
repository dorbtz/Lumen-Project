/**
 * Canonical /title link. TMDB movie-ids and tv-ids share one number space
 * and a re-pointed CC0 series can collide with a movie (tv 2373 "The
 * Fantastic Four" vs movie 2373 "My Uncle Benjamin"), so a TV title MUST
 * carry ?type=tv or the page resolves the movie instead. Pure — safe in
 * client and server. Use this everywhere instead of building the href by
 * hand; never link a TV title without the hint.
 */
export function titleHref(tmdbId: number, type?: string | null): string {
  return `/title/${tmdbId}${type === "tv" ? "?type=tv" : ""}`;
}
