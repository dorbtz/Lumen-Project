/**
 * Lumen — onboarding seed films (SPEC §A.2).
 *
 * Picked for: (a) high recognition (most users have seen ≥5), (b) wide coverage
 * of valence × arousal × theme axes, (c) era spread, (d) one international,
 * one animated, one quiet character drama, one blockbuster pole, one modern horror.
 *
 * TMDB ids are verified against themoviedb.org as of 2026-05.
 */

export interface SeedFilm {
  tmdbId: number;
  /** Display label used as a fallback if the title row is somehow missing. */
  fallbackTitle: string;
  fallbackYear: number;
  director: string;
  axis: string;
}

export const ONBOARDING_SEED_FILMS: SeedFilm[] = [
  {
    tmdbId: 278,
    fallbackTitle: "The Shawshank Redemption",
    fallbackYear: 1994,
    director: "Frank Darabont",
    axis: "Universal drama anchor",
  },
  {
    tmdbId: 680,
    fallbackTitle: "Pulp Fiction",
    fallbackYear: 1994,
    director: "Quentin Tarantino",
    axis: "Non-linear / edgy",
  },
  {
    tmdbId: 129,
    fallbackTitle: "Spirited Away",
    fallbackYear: 2001,
    director: "Hayao Miyazaki",
    axis: "Animation / international",
  },
  {
    tmdbId: 38,
    fallbackTitle: "Eternal Sunshine of the Spotless Mind",
    fallbackYear: 2004,
    director: "Michel Gondry",
    axis: "Quirky melancholy",
  },
  {
    tmdbId: 155,
    fallbackTitle: "The Dark Knight",
    fallbackYear: 2008,
    director: "Christopher Nolan",
    axis: "Blockbuster pole",
  },
  {
    tmdbId: 76341,
    fallbackTitle: "Mad Max: Fury Road",
    fallbackYear: 2015,
    director: "George Miller",
    axis: "Pure visual action",
  },
  {
    tmdbId: 391713,
    fallbackTitle: "Lady Bird",
    fallbackYear: 2017,
    director: "Greta Gerwig",
    axis: "Quiet character drama",
  },
  {
    tmdbId: 419430,
    fallbackTitle: "Get Out",
    fallbackYear: 2017,
    director: "Jordan Peele",
    axis: "Modern horror w/ weight",
  },
  {
    tmdbId: 496243,
    fallbackTitle: "Parasite",
    fallbackYear: 2019,
    director: "Bong Joon-ho",
    axis: "International thriller",
  },
  {
    tmdbId: 666277,
    fallbackTitle: "Past Lives",
    fallbackYear: 2023,
    director: "Celine Song",
    axis: "Slow-burn romance",
  },
];

export const MIN_RATINGS_FOR_CENTROID = 10;
