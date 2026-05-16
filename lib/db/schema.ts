/**
 * Lumen — Drizzle schema
 * Matches SPEC.md §6 exactly. Multi-profile model — every personalized table
 * keys to `profile_id`, never `account_id`.
 *
 * pgvector dimensions:
 *   - 384d: titles.embedding, profiles.taste_centroid, journal_entries.reflection_embedding,
 *           taste_snapshots.taste_centroid
 *   - 64d:  titles.mood_vector, journal_entries.mood_at_watch
 *
 * ivfflat indexes are added in the migration SQL (drizzle/0001_indexes.sql) since
 * drizzle-kit doesn't yet emit IVFFLAT options natively.
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  vector,
} from "drizzle-orm/pg-core";

// Native pgvector column type ships with drizzle-orm ≥ 0.31.
// Usage: vector("col_name", { dimensions: 384 })

// ---------- enums ----------

export const titleTypeEnum = pgEnum("title_type", ["movie", "tv"]);
export const creditRoleEnum = pgEnum("credit_role", ["cast", "crew"]);
export const trailerSourceEnum = pgEnum("trailer_source", ["youtube", "mux"]);
export const trailerKindEnum = pgEnum("trailer_kind", ["trailer", "teaser", "clip"]);

// ---------- catalog (TMDB-cached) ----------

export const titles = pgTable(
  "titles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tmdbId: integer("tmdb_id").notNull(),
    type: titleTypeEnum("type").notNull().default("movie"),
    title: text("title").notNull(),
    originalTitle: text("original_title"),
    releaseYear: smallint("release_year"),
    runtimeMin: smallint("runtime_min"),
    overview: text("overview"),
    tagline: text("tagline"),
    posterPath: text("poster_path"),
    backdropPath: text("backdrop_path"),
    /** 5-stop palette from node-vibrant: {dominant,vibrant,muted,darkVibrant,lightVibrant,darkMuted,lightMuted} */
    vibrantPalette: jsonb("vibrant_palette"),
    imdbId: varchar("imdb_id", { length: 16 }),
    popularity: integer("popularity").default(0).notNull(),
    voteAverage: integer("vote_average").default(0).notNull(), // stored * 10 to keep integer
    voteCount: integer("vote_count").default(0).notNull(),
    keywords: text("keywords").array(),
    genres: text("genres").array(),
    /** TMDB belongs_to_collection — powers franchise search ("marvel" → MCU). */
    collectionId: integer("collection_id"),
    collectionName: text("collection_name"),
    /** 64d: valence/arousal + theme dims (SPEC §8 Mood-axis tagging) */
    moodVector: vector("mood_vector", { dimensions: 64 }),
    /** 384d: nomic-embed-text-v1.5 projected (SPEC §8) */
    embedding: vector("embedding", { dimensions: 384 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tmdbIdUnique: uniqueIndex("titles_tmdb_id_unique").on(t.tmdbId),
    popularityIdx: index("titles_popularity_idx").on(sql`${t.popularity} DESC`),
    typeIdx: index("titles_type_idx").on(t.type),
    collectionIdx: index("titles_collection_idx").on(t.collectionId),
  }),
);

export const people = pgTable(
  "people",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tmdbId: integer("tmdb_id").notNull(),
    name: text("name").notNull(),
    profilePath: text("profile_path"),
    bio: text("bio"),
    knownForDept: varchar("known_for_dept", { length: 64 }),
    birthday: timestamp("birthday", { withTimezone: false }),
    deathday: timestamp("deathday", { withTimezone: false }),
    popularity: integer("popularity").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tmdbIdUnique: uniqueIndex("people_tmdb_id_unique").on(t.tmdbId),
  }),
);

export const credits = pgTable(
  "credits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    role: creditRoleEnum("role").notNull(),
    job: varchar("job", { length: 128 }),
    character: text("character"),
    billingOrder: smallint("billing_order"),
    episodeCount: smallint("episode_count"),
  },
  (t) => ({
    titleBillingIdx: index("credits_title_billing_idx").on(t.titleId, t.billingOrder),
    personIdx: index("credits_person_idx").on(t.personId),
  }),
);

export const trailers = pgTable("trailers", {
  id: uuid("id").defaultRandom().primaryKey(),
  titleId: uuid("title_id")
    .notNull()
    .references(() => titles.id, { onDelete: "cascade" }),
  source: trailerSourceEnum("source").notNull(),
  externalId: varchar("external_id", { length: 128 }).notNull(),
  kind: trailerKindEnum("kind").notNull().default("trailer"),
  language: varchar("language", { length: 8 }),
  official: boolean("official").default(false).notNull(),
});

export const cc0Videos = pgTable("cc0_videos", {
  id: uuid("id").defaultRandom().primaryKey(),
  titleId: uuid("title_id")
    .notNull()
    .references(() => titles.id, { onDelete: "cascade" }),
  // Nullable since 0005: a row is EITHER a Mux asset OR a direct-URL
  // (Archive.org / Wikimedia) public-domain stream.
  muxAssetId: varchar("mux_asset_id", { length: 128 }),
  muxPlaybackId: varchar("mux_playback_id", { length: 128 }),
  durationSec: integer("duration_sec"),
  hlsUrl: text("hls_url"),
  /** 'mux' (default, existing) | 'archive' | 'wikimedia'. */
  source: varchar("source", { length: 16 }).default("mux"),
  /** Direct streamable URL for non-Mux sources (mp4/webm/ogv). */
  streamUrl: text("stream_url"),
  status: varchar("status", { length: 32 }),
});

/**
 * Per-episode streams for CC0 *series* (one Archive.org item → many video
 * files). Additive: single-file CC0 movies keep using only `cc0_videos`.
 * A series keeps its `cc0_videos` row (points at episode 1, so existing
 * "is this title CC0?" detection and the movie path are unchanged) AND
 * gets one `cc0_episodes` row per playable file.
 */
export const cc0Episodes = pgTable(
  "cc0_episodes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    /** 1-based playback order (natural filename sort). */
    episodeIndex: integer("episode_index").notNull(),
    /** Human label, e.g. "Episode 1 — The Mad Scientist". */
    label: text("label").notNull(),
    /** 'archive' | 'wikimedia' — mirrors cc0_videos.source. */
    source: varchar("source", { length: 16 }).default("archive").notNull(),
    streamUrl: text("stream_url").notNull(),
    durationSec: integer("duration_sec"),
    status: varchar("status", { length: 32 }).default("ready").notNull(),
  },
  (t) => ({
    titleEpisodeUnique: uniqueIndex("cc0_episodes_title_episode_unique").on(
      t.titleId,
      t.episodeIndex,
    ),
  }),
);

/**
 * Resume / completion history per profile. `episode_index = 0` means the
 * whole title (a single-file movie); 1-based for series episodes. Powers
 * the "✓ completed / ◐ resume" episode-button states and resume-at-position.
 */
export const watchProgress = pgTable(
  "watch_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    episodeIndex: integer("episode_index").notNull().default(0),
    positionSec: integer("position_sec").default(0).notNull(),
    durationSec: integer("duration_sec"),
    completed: boolean("completed").default(false).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    profileTitleEpUnique: uniqueIndex("watch_progress_profile_title_ep_unique").on(
      t.profileId,
      t.titleId,
      t.episodeIndex,
    ),
    profileIdx: index("watch_progress_profile_idx").on(t.profileId),
  }),
);

// ---------- Lumen-native: accounts → profiles (Netflix-style) ----------

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: varchar("clerk_user_id", { length: 128 }).notNull(),
    email: text("email"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastActive: timestamp("last_active", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    clerkUserIdUnique: uniqueIndex("accounts_clerk_user_id_unique").on(t.clerkUserId),
  }),
);

/** Max 5 profiles per account — enforced at app layer (SPEC §6). */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 64 }).notNull(),
    /** OKLCH-derived accent for the profile chip (UI affordance, not user-chosen palette) */
    avatarColor: varchar("avatar_color", { length: 16 }).notNull().default("#FFB070"),
    isKid: boolean("is_kid").default(false).notNull(),
    /** 384d taste centroid — weighted mean of rated titles' embeddings (SPEC §6 + Appendix A.2) */
    tasteCentroid: vector("taste_centroid", { dimensions: 384 }),
    onboardingDone: boolean("onboarding_done").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    accountIdx: index("profiles_account_idx").on(t.accountId),
  }),
);

export const profileSessions = pgTable("profile_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

// ---------- personalization ----------

export const ratings = pgTable(
  "ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    score: smallint("score"), // 1..10 (nullable: liked-only path)
    liked: boolean("liked"),
    ratedAt: timestamp("rated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    profileTitleUnique: uniqueIndex("ratings_profile_title_unique").on(t.profileId, t.titleId),
  }),
);

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    watchedAt: timestamp("watched_at", { withTimezone: true }).defaultNow().notNull(),
    reflection: text("reflection"),
    /** 384d embedding of the user's reflection text */
    reflectionEmbedding: vector("reflection_embedding", { dimensions: 384 }),
    /** LLM-generated thoughtful question (SPEC §3.1 #3 Echo Journal) */
    generatedQuestion: text("generated_question"),
    /** 64d: valence/arousal at moment of watch */
    moodAtWatch: vector("mood_at_watch", { dimensions: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    profileWatchedIdx: index("journal_entries_profile_watched_idx").on(
      t.profileId,
      sql`${t.watchedAt} DESC`,
    ),
  }),
);

/** Weekly cron — snapshot of taste centroid for Taste Drift (v1.1) */
export const tasteSnapshots = pgTable("taste_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  snapshotAt: timestamp("snapshot_at", { withTimezone: true }).defaultNow().notNull(),
  tasteCentroid: vector("taste_centroid", { dimensions: 384 }),
  filmsLoggedCount: integer("films_logged_count").default(0).notNull(),
  topThemes: jsonb("top_themes"),
});

/** Why-card LLM output, cached for 14 days per (profile, title) — see SPEC §7.2 */
export const whyExplanations = pgTable(
  "why_explanations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    /** [{dimension, contribution, copy}] — see SPEC §8 prompt schema */
    reasons: jsonb("reasons").notNull(),
    explanationText: text("explanation_text").notNull(),
    modelUsed: varchar("model_used", { length: 128 }),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    profileTitleUnique: uniqueIndex("why_explanations_profile_title_unique").on(
      t.profileId,
      t.titleId,
    ),
  }),
);

export const watchlists = pgTable("watchlists", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 64 }).notNull().default("Watchlist"),
  isDefault: boolean("is_default").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const watchlistItems = pgTable(
  "watchlist_items",
  {
    watchlistId: uuid("watchlist_id")
      .notNull()
      .references(() => watchlists.id, { onDelete: "cascade" }),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.watchlistId, t.titleId] }),
  }),
);

/** Nightly cron-built Recap story (SPEC §3.1 #4) */
export const recapStates = pgTable(
  "recap_states",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
    storyJson: jsonb("story_json").notNull(),
    /**
     * Unguessable public share token (nanoid, app-generated — see
     * SPEC_COMPLETION §1 A2). Nullable so historic rows + non-shared
     * recaps stay valid; rotated whenever a recap is rebuilt to revoke
     * old links. Partial-unique index allows many NULLs.
     */
    shareToken: text("share_token"),
  },
  (t) => ({
    shareTokenUnique: uniqueIndex("recap_states_share_token_unique")
      .on(t.shareToken)
      .where(sql`${t.shareToken} IS NOT NULL`),
  }),
);

// ---------- inferred types ----------

export type Title = typeof titles.$inferSelect;
export type NewTitle = typeof titles.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Rating = typeof ratings.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type WhyExplanation = typeof whyExplanations.$inferSelect;
export type RecapState = typeof recapStates.$inferSelect;
export type Cc0Episode = typeof cc0Episodes.$inferSelect;
export type WatchProgress = typeof watchProgress.$inferSelect;

// Helper: SQL to ensure pgvector extension exists — emitted by the bootstrap migration
export const ENSURE_PGVECTOR = sql`CREATE EXTENSION IF NOT EXISTS vector`;
