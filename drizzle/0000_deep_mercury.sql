CREATE TYPE "public"."credit_role" AS ENUM('cast', 'crew');--> statement-breakpoint
CREATE TYPE "public"."title_type" AS ENUM('movie', 'tv');--> statement-breakpoint
CREATE TYPE "public"."trailer_kind" AS ENUM('trailer', 'teaser', 'clip');--> statement-breakpoint
CREATE TYPE "public"."trailer_source" AS ENUM('youtube', 'mux');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" varchar(128) NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cc0_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_id" uuid NOT NULL,
	"mux_asset_id" varchar(128) NOT NULL,
	"mux_playback_id" varchar(128) NOT NULL,
	"duration_sec" integer,
	"hls_url" text,
	"status" varchar(32)
);
--> statement-breakpoint
CREATE TABLE "credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"role" "credit_role" NOT NULL,
	"job" varchar(128),
	"character" text,
	"billing_order" smallint,
	"episode_count" smallint
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"watched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reflection" text,
	"reflection_embedding" vector(384),
	"generated_question" text,
	"mood_at_watch" vector(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tmdb_id" integer NOT NULL,
	"name" text NOT NULL,
	"profile_path" text,
	"bio" text,
	"known_for_dept" varchar(64),
	"birthday" timestamp,
	"deathday" timestamp,
	"popularity" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" varchar(64) NOT NULL,
	"avatar_color" varchar(16) DEFAULT '#FFB070' NOT NULL,
	"is_kid" boolean DEFAULT false NOT NULL,
	"taste_centroid" vector(384),
	"onboarding_done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"score" smallint,
	"liked" boolean,
	"rated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recap_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"story_json" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taste_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"snapshot_at" timestamp with time zone DEFAULT now() NOT NULL,
	"taste_centroid" vector(384),
	"films_logged_count" integer DEFAULT 0 NOT NULL,
	"top_themes" jsonb
);
--> statement-breakpoint
CREATE TABLE "titles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tmdb_id" integer NOT NULL,
	"type" "title_type" DEFAULT 'movie' NOT NULL,
	"title" text NOT NULL,
	"original_title" text,
	"release_year" smallint,
	"runtime_min" smallint,
	"overview" text,
	"tagline" text,
	"poster_path" text,
	"backdrop_path" text,
	"vibrant_palette" jsonb,
	"imdb_id" varchar(16),
	"popularity" integer DEFAULT 0 NOT NULL,
	"vote_average" integer DEFAULT 0 NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL,
	"keywords" text[],
	"genres" text[],
	"mood_vector" vector(64),
	"embedding" vector(384),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trailers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_id" uuid NOT NULL,
	"source" "trailer_source" NOT NULL,
	"external_id" varchar(128) NOT NULL,
	"kind" "trailer_kind" DEFAULT 'trailer' NOT NULL,
	"language" varchar(8),
	"official" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchlist_items" (
	"watchlist_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_items_watchlist_id_title_id_pk" PRIMARY KEY("watchlist_id","title_id")
);
--> statement-breakpoint
CREATE TABLE "watchlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"name" varchar(64) DEFAULT 'Watchlist' NOT NULL,
	"is_default" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "why_explanations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"reasons" jsonb NOT NULL,
	"explanation_text" text NOT NULL,
	"model_used" varchar(128),
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cc0_videos" ADD CONSTRAINT "cc0_videos_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits" ADD CONSTRAINT "credits_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits" ADD CONSTRAINT "credits_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_sessions" ADD CONSTRAINT "profile_sessions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recap_states" ADD CONSTRAINT "recap_states_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taste_snapshots" ADD CONSTRAINT "taste_snapshots_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trailers" ADD CONSTRAINT "trailers_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_watchlist_id_watchlists_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."watchlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "why_explanations" ADD CONSTRAINT "why_explanations_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "why_explanations" ADD CONSTRAINT "why_explanations_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_clerk_user_id_unique" ON "accounts" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "credits_title_billing_idx" ON "credits" USING btree ("title_id","billing_order");--> statement-breakpoint
CREATE INDEX "credits_person_idx" ON "credits" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "journal_entries_profile_watched_idx" ON "journal_entries" USING btree ("profile_id","watched_at" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "people_tmdb_id_unique" ON "people" USING btree ("tmdb_id");--> statement-breakpoint
CREATE INDEX "profiles_account_idx" ON "profiles" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ratings_profile_title_unique" ON "ratings" USING btree ("profile_id","title_id");--> statement-breakpoint
CREATE UNIQUE INDEX "titles_tmdb_id_unique" ON "titles" USING btree ("tmdb_id");--> statement-breakpoint
CREATE INDEX "titles_popularity_idx" ON "titles" USING btree ("popularity" DESC);--> statement-breakpoint
CREATE INDEX "titles_type_idx" ON "titles" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "why_explanations_profile_title_unique" ON "why_explanations" USING btree ("profile_id","title_id");