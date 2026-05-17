/**
 * Lumen — poster/backdrop URL resolver.
 *
 * TMDB titles store a path like `/abc.jpg` → prefix the TMDB CDN. Public-
 * domain titles ingested from Archive.org store an ABSOLUTE thumbnail URL
 * (`https://archive.org/services/img/<id>`); pass those through unchanged.
 * Pure + dependency-free.
 */

const TMDB = "https://image.tmdb.org/t/p";

export function posterUrl(
  path: string | null | undefined,
  size: "w92" | "w154" | "w185" | "w342" | "w500" | "w780" = "w342",
): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${TMDB}/${size}${path}`;
}

export function backdropUrl(
  path: string | null | undefined,
  size: "w780" | "w1280" | "original" = "w1280",
): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${TMDB}/${size}${path}`;
}
