/**
 * Lumen — typed TMDB v3 client (read-only).
 * SPEC §6.1: on-demand fetch when stale; weekly cron full refresh.
 *
 * Week 2 extensions: person, search/multi, videos, similar, credits — all
 * needed by /title/[id], /person/[id], /search, and the hover-preview card.
 */

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

export interface TmdbMovie {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  overview: string;
  tagline?: string;
  runtime?: number;
  poster_path: string | null;
  backdrop_path: string | null;
  imdb_id?: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  genres?: { id: number; name: string }[];
  genre_ids?: number[];
  belongs_to_collection?: { id: number; name: string } | null;
  keywords?: { keywords?: { id: number; name: string }[] };
  videos?: { results: TmdbVideo[] };
  credits?: TmdbCredits;
  external_ids?: { imdb_id?: string };
  media_type?: "movie";
}

export interface TmdbTvLite {
  id: number;
  name: string;
  original_name: string;
  first_air_date?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  popularity: number;
  vote_average: number;
  vote_count: number;
  media_type?: "tv";
}

export interface TmdbSeasonSummary {
  season_number: number;
  name: string;
  episode_count: number;
  poster_path: string | null;
  air_date?: string | null;
  overview?: string;
}

export interface TmdbEpisode {
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date?: string | null;
  runtime?: number | null;
  vote_average?: number;
}

export interface TmdbSeasonDetail {
  season_number: number;
  name: string;
  overview?: string;
  poster_path: string | null;
  episodes?: TmdbEpisode[];
}

export interface TmdbTvDetail {
  id: number;
  name: string;
  original_name?: string;
  overview: string;
  tagline?: string;
  first_air_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  popularity: number;
  vote_average: number;
  vote_count: number;
  genres?: { id: number; name: string }[];
  /** Per-episode runtimes in minutes (may be empty/multiple). */
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: TmdbSeasonSummary[];
  // TV keywords come back under `results` (movies use `keywords`).
  keywords?: { results?: { id: number; name: string }[] };
  external_ids?: { imdb_id?: string };
  media_type?: "tv";
}

export interface TmdbPerson {
  id: number;
  name: string;
  biography?: string;
  birthday?: string | null;
  deathday?: string | null;
  place_of_birth?: string | null;
  profile_path: string | null;
  known_for_department?: string;
  popularity: number;
  also_known_as?: string[];
  combined_credits?: TmdbCombinedCredits;
  movie_credits?: TmdbPersonMovieCredits;
  media_type?: "person";
}

export interface TmdbVideo {
  id: string;
  iso_639_1?: string;
  iso_3166_1?: string;
  key: string;
  name: string;
  site: "YouTube" | "Vimeo" | string;
  size: number;
  type: "Trailer" | "Teaser" | "Clip" | "Featurette" | "Behind the Scenes" | string;
  official: boolean;
  published_at?: string;
}

export interface TmdbCastMember {
  id: number;
  cast_id?: number;
  credit_id?: string;
  name: string;
  character?: string;
  order?: number;
  profile_path: string | null;
  popularity?: number;
}

export interface TmdbCrewMember {
  id: number;
  credit_id?: string;
  name: string;
  job?: string;
  department?: string;
  profile_path: string | null;
  popularity?: number;
}

export interface TmdbCredits {
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

export interface TmdbPersonMovieCredits {
  cast: Array<{
    id: number;
    title: string;
    character?: string;
    release_date?: string;
    poster_path: string | null;
    popularity?: number;
    vote_average?: number;
    media_type?: "movie";
  }>;
  crew: Array<{
    id: number;
    title: string;
    job?: string;
    department?: string;
    release_date?: string;
    poster_path: string | null;
    popularity?: number;
    vote_average?: number;
    media_type?: "movie";
  }>;
}

export interface TmdbCombinedCredits {
  cast: Array<{
    id: number;
    title?: string;
    name?: string; // tv
    character?: string;
    release_date?: string;
    first_air_date?: string;
    poster_path: string | null;
    popularity?: number;
    vote_average?: number;
    media_type?: "movie" | "tv";
  }>;
  crew: Array<{
    id: number;
    title?: string;
    name?: string;
    job?: string;
    department?: string;
    release_date?: string;
    first_air_date?: string;
    poster_path: string | null;
    popularity?: number;
    vote_average?: number;
    media_type?: "movie" | "tv";
  }>;
}

export type TmdbMultiResult =
  | (TmdbMovie & { media_type: "movie" })
  | (TmdbTvLite & { media_type: "tv" })
  | (TmdbPerson & { media_type: "person" });

export interface TmdbPaged<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

const apiKey = () => {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new Error(
      "[lumen/tmdb] TMDB_API_KEY not set — obtain from https://www.themoviedb.org/settings/api",
    );
  }
  return key;
};

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  cacheKey?: string,
): Promise<T> {
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set("api_key", apiKey());
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    // Next.js: longish cache, tag-invalidated on cron refresh
    next: {
      revalidate: 60 * 60 * 24,
      tags: [`tmdb:${cacheKey ?? path.split("/")[1] ?? "root"}`],
    },
  });
  if (!res.ok) {
    throw new Error(`[tmdb] ${res.status} ${res.statusText} — ${url.pathname}`);
  }
  return res.json() as Promise<T>;
}

export const tmdb = {
  popular: (page = 1) =>
    tmdbFetch<TmdbPaged<TmdbMovie>>("/movie/popular", { page, language: "en-US" }),

  topRated: (page = 1) =>
    tmdbFetch<TmdbPaged<TmdbMovie>>("/movie/top_rated", { page, language: "en-US" }),

  trending: (window: "day" | "week" = "week", page = 1) =>
    tmdbFetch<TmdbPaged<TmdbMovie>>(`/trending/movie/${window}`, { page, language: "en-US" }),

  trendingAll: (window: "day" | "week" = "week", page = 1) =>
    tmdbFetch<TmdbPaged<TmdbMultiResult>>(`/trending/all/${window}`, {
      page,
      language: "en-US",
    }),

  movie: (id: number) =>
    tmdbFetch<TmdbMovie>(
      `/movie/${id}`,
      {
        append_to_response: "keywords,credits,videos,external_ids,similar",
        language: "en-US",
      },
      `title:${id}`,
    ),

  movieVideos: (id: number) =>
    tmdbFetch<{ id: number; results: TmdbVideo[] }>(
      `/movie/${id}/videos`,
      {
        language: "en-US",
      },
      `title:${id}:videos`,
    ),

  movieCredits: (id: number) =>
    tmdbFetch<TmdbCredits & { id: number }>(
      `/movie/${id}/credits`,
      { language: "en-US" },
      `title:${id}:credits`,
    ),

  movieSimilar: (id: number, page = 1) =>
    tmdbFetch<TmdbPaged<TmdbMovie>>(
      `/movie/${id}/similar`,
      { page, language: "en-US" },
      `title:${id}:similar`,
    ),

  person: (id: number) =>
    tmdbFetch<TmdbPerson>(
      `/person/${id}`,
      {
        append_to_response: "combined_credits,movie_credits",
        language: "en-US",
      },
      `person:${id}`,
    ),

  searchMulti: (query: string, page = 1) =>
    tmdbFetch<TmdbPaged<TmdbMultiResult>>(
      "/search/multi",
      {
        query,
        page,
        include_adult: "false",
        language: "en-US",
      },
      "search:multi",
    ),

  searchMovie: (query: string, page = 1) =>
    tmdbFetch<TmdbPaged<TmdbMovie>>(
      "/search/movie",
      {
        query,
        page,
        include_adult: "false",
        language: "en-US",
      },
      "search:movie",
    ),

  // --- TV (series) — used by the catalog seed + Time-Box Series row ---
  tvPopular: (page = 1) =>
    tmdbFetch<TmdbPaged<TmdbTvDetail>>("/tv/popular", { page, language: "en-US" }),

  trendingTv: (window: "day" | "week" = "week", page = 1) =>
    tmdbFetch<TmdbPaged<TmdbTvDetail>>(`/trending/tv/${window}`, {
      page,
      language: "en-US",
    }),

  tv: (id: number) =>
    tmdbFetch<TmdbTvDetail>(
      `/tv/${id}`,
      { append_to_response: "keywords,external_ids", language: "en-US" },
      `tv:${id}`,
    ),

  tvSeason: (id: number, seasonNumber: number) =>
    tmdbFetch<TmdbSeasonDetail>(
      `/tv/${id}/season/${seasonNumber}`,
      { language: "en-US" },
      `tv:${id}:season:${seasonNumber}`,
    ),

  poster: (path: string | null | undefined, size: "w185" | "w342" | "w500" | "w780" = "w500") =>
    path ? `${IMAGE_BASE}/${size}${path}` : null,

  backdrop: (path: string | null | undefined, size: "w780" | "w1280" | "original" = "w1280") =>
    path ? `${IMAGE_BASE}/${size}${path}` : null,

  profile: (path: string | null | undefined, size: "w185" | "h632" = "w185") =>
    path ? `${IMAGE_BASE}/${size}${path}` : null,

  /** YouTube watch URL for an embeddable trailer. */
  youtube: (key: string) => `https://www.youtube.com/embed/${key}?modestbranding=1&rel=0`,

  /** Pick the best YouTube trailer from a TMDB videos result. */
  pickTrailer: (videos: TmdbVideo[] | undefined): TmdbVideo | null => {
    if (!videos?.length) return null;
    const yt = videos.filter((v) => v.site === "YouTube");
    const officialTrailers = yt.filter((v) => v.type === "Trailer" && v.official);
    if (officialTrailers[0]) return officialTrailers[0];
    const anyTrailer = yt.find((v) => v.type === "Trailer");
    if (anyTrailer) return anyTrailer;
    const teaser = yt.find((v) => v.type === "Teaser");
    return teaser ?? yt[0] ?? null;
  },
};
