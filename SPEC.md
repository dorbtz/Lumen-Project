# Lumen — Product & Engineering Spec

> A Netflix + IMDB hybrid, reimagined with Apple's Liquid Glass design language and three differentiating pillars: **mood discovery, explainable AI taste, and a living cinema journal.**

| | |
|---|---|
| **Working title** | Lumen |
| **Owner** | Dor (dbtzur@gmail.com) |
| **Status** | Draft v0.1 — pending owner approval |
| **Last updated** | 2026-05-12 |
| **Target** | Production-quality portfolio MVP — 2–4 weeks of focused work |

---

## 1. Vision

Lumen is a movie discovery app for people who treat watching films as more than time-killing. It does three things no current product does together:

1. **Discover by mood and moment**, not by genre grid.
2. **Explain every recommendation** in plain language grounded in *your* taste, not a black box.
3. **Keep a living journal** of what you watch — and at any moment turn it into a Spotify-Wrapped-style story about who you've become as a viewer.

It looks and feels like an Apple product — specifically, the **Liquid Glass / visionOS** material language Apple introduced at WWDC 2025 — translucent, content-driven, calm, with controls that recede and content that breathes.

**One-line positioning**: *Letterboxd's depth meets Apple TV+'s cinematics, with an AI layer that actually understands you.*

### 1.1 Why this is differentiated

| Competitor | What they do | What they don't |
|---|---|---|
| Netflix | Personalized rows, autoplay previews | Black-box recs, no "why", no journal |
| IMDB | Authoritative metadata, ratings, watchlist | Cluttered, ad-heavy, no taste model, no mood |
| Letterboxd | Diary, lists, reviews, social feed | No mood/context discovery, no AI "why", recap is a static stats page |
| Trakt | Watch-history sync, basic stats | Genre-grid discovery, no narrative recap |
| JustWatch / Reelgood | "Where to stream" filters with coarse mood tags | Tags are checkboxes; no taste model, no journal |
| Mubi | Hand-curated rotating catalog, editorial Notebook | One-size-fits-all curation; no personalization, no journal |
| TasteDive | "If you like X, try Y" recommender | Single-shot recs; no profile, no journal, no recap |
| Apple TV+ | Editorial spotlights, "Up Next" continuity | Closed catalog, no journal, no taste model |
| Spotify Wrapped | Animated annual story cards | Music only; yearly snapshot, not a living document |

**The white space Lumen owns:** mood-as-primary-axis + explainable AI recs + a *living*, always-on recap layer, wrapped in a visual language no movie product currently uses.

---

## 2. Product Pillars (DNA)

Every feature in Lumen must serve at least one of these three. If it doesn't, it's deferred.

### Pillar 1 — Mood / Situational Discovery
> "What do I want to feel tonight?" instead of "What genre am I in the mood for?"

A continuous 2D affect space (valence × arousal), context signals (time of day, last watch, runtime budget), and a curated set of "moments" (rainy Sunday, dinner party, 90 minutes to kill, post-breakup).

### Pillar 2 — AI Taste Profile + "Why This Movie"
> Every recommendation comes with a 1–2 sentence personalized explanation tied to *your* embedding.

User onboards with ~10 rated films → we build a taste embedding. On every recommendation we surface the three contributing dimensions ("you respond to quiet endings + naturalistic dialogue + restrained color"). Powered by Hugging Face Inference (embeddings + small LLM for explanations).

### Pillar 3 — Personal Cinema Journal + Living Recap
> A Letterboxd-style log that auto-renders into a Spotify-Wrapped-style story at any moment.

Each watched film is logged with optional reflection. The journal continuously feeds back into the taste embedding. A "Recap" surface re-renders nightly into a sequence of full-screen glass cards (mood arc, signature director, biggest taste shift, longest streak, etc.) — shareable.

---

## 3. Feature List

### 3.1 MVP — must ship (6 features)

| # | Feature | Pillar | Engineering Lift |
|---|---|---|---|
| 1 | **Mood Dial** — 2D affect dial; results stream as you drag | Mood | Medium — pgvector + debounced streaming |
| 2 | **The Why Card** — every rec flips to show 3 personalized reasons | AI Taste | Medium — vector diff + cached LLM call |
| 3 | **Echo Journal** — log a film; receive one thoughtful question; reply feeds embedding | Journal | Low–Medium — LLM call + write to DB |
| 4 | **Living Recap** — always-on Wrapped; re-renders nightly | Journal | Medium — cron + `@vercel/og` for share images |
| 5 | **Time-Box Discovery** — "I have 73 minutes" → ranked picks | Mood | Low — runtime filter + vector rank |
| 6 | **Cinema Weather** — ambient glass orb reflecting last 5 watches | AI Taste (visualizing it) | Medium — WebGL shader; deterministic |

### 3.2 Built-in surfaces (foundational pages, not separate features)

| Surface | Purpose |
|---|---|
| Onboarding (taste-seeding) | Rate 10 hand-picked films; first taste embedding computed |
| Home | Hero billboard + Tonight nudge + Mood Dial + 3 personalized rows |
| Title detail | IMDB-grade depth on a glass canvas (cast, crew, trailers, "Why this for you" if recommended) |
| Person detail | Career timeline + collaborator graph (lightweight) |
| Browse / Search | Mood-first browse + classic search |
| Journal | Diary + reflections + lists |
| Recap | The Living Recap surface |
| Player | Mux-powered HLS player for trailers + small CC0 catalog |
| Settings | Profile, taste reset, accessibility toggles |

### 3.3 Deferred — v1.1 hero features (post-MVP)

| Feature | Pillar | Why deferred |
|---|---|---|
| **Tonight Card** — daily 6pm nudge using weather + last watch + slot | Mood | Needs daily cron + weather integration polish |
| **Taste Drift** — UMAP-projected animated path of your taste over time | Journal | Needs 4+ weeks of data to be meaningful |
| **Double Feature** — AI pairs two films into one evening | Mood | Best after taste model has matured |
| **Glass Shelf** — 3D refractive R3F library view | Journal (presentation) | Highest engineering risk; great re-launch hero |

### 3.4 Explicit non-goals (MVP)

- Social graph, following, public reviews, comments
- Group watch / watch parties
- Hosting/licensing real streaming films
- Native iOS/Android apps (PWA only)
- Multi-language UI (English-only)
- Payment / tiers / Stripe

---

## 4. Information Architecture

```
/                       Home (hero + Tonight + Mood Dial + rows)
/onboarding             Taste-seeding flow (first-run gate)
/discover               Mood-first discovery surface
/discover/mood/[slug]   Mood-specific results (e.g., /discover/mood/rainy-sunday)
/discover/timebox       Time-Box Discovery
/title/[tmdb_id]        Title detail
/title/[tmdb_id]/watch  Player (trailer or CC0 stream)
/person/[tmdb_id]       Person detail
/journal                Diary + lists overview
/journal/entry/[id]     Individual reflection
/recap                  Living Recap surface (current state)
/recap/share/[token]    Public share view
/search                 Universal search (titles + people)
/settings               Profile, taste, accessibility
/sign-in /sign-up       Clerk-hosted (themed)
```

### 4.1 Route conventions

- All metadata-heavy routes are **statically rendered** with `cacheLife('hours')` and revalidated by `cacheTag('title:<id>')`. Personalized rows are **Server Components** that compose static title cards with per-user data — leveraging Next.js 16 Cache Components.
- Personalization happens at the row level via dynamic Server Component children; static title cards stay cached.

---

## 5. Design System — Liquid Glass on Web

> Apple's Liquid Glass is a translucent material that **reflects, refracts, and dynamically tints** based on content behind it. Our job is to bring its spirit to the web without paying the GPU tax that breaks mobile Safari.

### 5.1 Material hierarchy

We adopt four web-implementable material weights, named to match Apple's vocabulary:

| Weight | Use | Web recipe |
|---|---|---|
| **Chrome** | Top nav, persistent toolbars | `backdrop-filter: blur(24px) saturate(180%)` + `background: color-mix(in oklab, var(--surface) 64%, transparent)` |
| **Regular** | Cards, sheets, modals | `blur(18px) saturate(160%)` + 72% opaque tint |
| **Thin** | Popovers, hover cards | `blur(12px) saturate(140%)` + 56% opaque tint |
| **Vibrant** | Decorative orbs, hero overlays | `blur(40px)` + SVG `feDisplacementMap` for refraction |

Every material variant has light + dark mode tokens. We use `color-mix(in oklab, ...)` so tints inherit from the underlying poster artwork via a CSS variable updated when content changes.

### 5.2 Refraction & specular ("liquid" feel)

Per LogRocket and the open-source `nikdelvin/liquid-glass` + `kevinbism/liquid-glass-effect` work, the "liquid" feel is achieved by **SVG `feTurbulence` + `feDisplacementMap`** applied as a filter to a backdrop-blurred element, optionally combined with `mix-blend-mode: overlay` for specular highlights. Firefox doesn't support displacement on backdrop layers — we degrade to flat glass there.

Required CSS feature gates:
- `@supports (backdrop-filter: blur(1px))` — fallback to opaque tinted surface
- `@media (prefers-reduced-transparency: reduce)` — collapse all materials to solid surfaces (Apple HIG accessibility requirement; web-equivalent media query)
- `@media (prefers-reduced-motion: reduce)` — disable refraction animation; freeze specular highlights

### 5.3 Color

- **Base palette**: pure black `#000` and near-white `#FAFAFA`; greys via `oklab` to preserve perceived luminance.
- **Content tinting**: extract a 5-stop palette from each poster (via the [Vibrant.js](https://github.com/Vibrant-Colors/node-vibrant) library, computed once at ingest, stored on the `titles` row). On a title detail page, the dominant color tints the surrounding chrome at low saturation.
- **Accent**: a single warm accent (`#FFB070` / `#FF8E3C`) used for primary action only — Apple-restrained accent usage.
- All colors defined as CSS custom properties keyed off `--surface-*` and `--ink-*`; theming is one stylesheet swap.

### 5.4 Typography

- **Display**: SF Pro Display via `font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter Display", ...` with `font-feature-settings: "ss01", "cv01"` for Apple-style numerals. **Inter Display** is the documented web fallback when SF Pro isn't available.
- **Text**: SF Pro Text / Inter.
- **Type scale** (rem): `0.75 / 0.875 / 1 / 1.125 / 1.25 / 1.5 / 2 / 2.75 / 4` — modular ratio 1.25.
- Line-height: `1.4` for text, `1.1` for display.
- Generous tracking on display sizes (`letter-spacing: -0.02em`) — Apple-style.

### 5.5 Motion

- All transitions use Apple's signature **spring** curves. We expose three: `spring-fast` (180ms), `spring-default` (280ms), `spring-soft` (520ms). Implemented via `framer-motion` springs with `damping: 26, stiffness: 220` defaults.
- **View Transitions API** for cross-route morphs (title card → title page poster). Next.js 16's `viewTransitions` opt-in.
- Hover-to-preview cards expand with a 120ms delay then play a muted trailer fade-in (Netflix-style but quieter).

### 5.6 Accessibility (non-negotiable)

- WCAG AA contrast on all text against worst-case backdrop (we test against pure-white poster).
- Honor `prefers-reduced-transparency` and `prefers-reduced-motion`.
- All interactive elements ≥44px touch target.
- Keyboard navigation for every surface; visible focus rings (Apple-style: 2px accent, 4px offset).
- Auto-pause autoplay-on-hover when `prefers-reduced-motion` is set.

### 5.7 Performance budget

Backdrop-filter is **GPU-expensive**. Rules:
- **≤6 simultaneous glass surfaces** on any viewport.
- No glass on long-scroll list items — only on overlay/chrome.
- Vibrant material (SVG displacement) limited to *one* element per page (the Cinema Weather orb).
- Lighthouse mobile performance target: **≥90**. LCP target: **<2.0s** on a Moto G4.

---

## 6. Data Model (Postgres + pgvector)

> **Multi-profile** is enabled. An *account* is the Clerk-authenticated entity (one per real human). Each account owns 1–N *profiles* (Netflix-style "Who's watching?"). All personalization — taste centroid, journal, recap, watchlist — is keyed to **profile_id**, never `account_id`. This is the right shape because the entire AI taste model would otherwise collapse a couple's diverging tastes into noise.

```
-- Authoritative cache of TMDB metadata
titles                    (id PK, tmdb_id, type[movie|tv], title, original_title,
                           release_year, runtime_min, overview, tagline,
                           poster_path, backdrop_path, vibrant_palette jsonb,
                           imdb_id, popularity, vote_average, vote_count,
                           keywords text[], genres text[],
                           mood_vector vector(64),       -- valence/arousal + theme dims
                           embedding vector(384),         -- nomic-embed-text-v1.5
                           created_at, updated_at)

people                    (id PK, tmdb_id, name, profile_path, bio, known_for_dept,
                           birthday, deathday, popularity, updated_at)

credits                   (id PK, title_id FK, person_id FK, role[cast|crew],
                           job, character, billing_order, episode_count)

trailers                  (id PK, title_id FK, source[youtube|mux], external_id,
                           kind[trailer|teaser|clip], language, official boolean)

cc0_videos                (id PK, title_id FK, mux_asset_id, mux_playback_id,
                           duration_sec, hls_url, status)

-- Lumen-native: Account = Clerk user, Profile = "Who's watching?"
accounts                  (id PK, clerk_user_id UNIQUE, email,
                           created_at, last_active)

profiles                  (id PK, account_id FK, name, avatar_color, is_kid boolean,
                           taste_centroid vector(384), onboarding_done,
                           created_at)
                          -- max 5 profiles per account at MVP

profile_sessions          (id PK, profile_id FK, started_at, ended_at)
                          -- tracks "active profile" per browser session

ratings                   (id PK, profile_id FK, title_id FK, score smallint[1-10],
                           liked boolean, rated_at)
                          UNIQUE(profile_id, title_id)

journal_entries           (id PK, profile_id FK, title_id FK,
                           watched_at, reflection text, reflection_embedding vector(384),
                           generated_question text, mood_at_watch vector(64),
                           created_at)

taste_snapshots           (id PK, profile_id FK, snapshot_at,
                           taste_centroid vector(384), films_logged_count,
                           top_themes jsonb)   -- weekly cron

why_explanations          (id PK, profile_id FK, title_id FK,
                           reasons jsonb,         -- 3 reasons w/ contributing dims
                           explanation_text text, model_used, generated_at)
                          UNIQUE(profile_id, title_id)

watchlists                (id PK, profile_id FK, name, is_default boolean,
                           created_at)
watchlist_items           (watchlist_id FK, title_id FK, added_at, PRIMARY KEY both)

recap_states              (id PK, profile_id FK, generated_at,
                           story_json jsonb)     -- nightly cron-built
```

**Profile flow:**
- Clerk webhook on `user.created` → create `accounts` row + 1 default `profiles` row.
- After sign-in: `<ProfileGate>` server component checks `profile_sessions`; if no active profile, render the **Who's watching?** picker.
- Active `profile_id` is stored in a signed, HTTP-only cookie (`lumen_active_profile`).
- Settings page allows adding profiles (cap 5), renaming, deleting, switching.

**Index priorities:**
- `titles(tmdb_id)` UNIQUE, `titles(popularity DESC)`, `ivfflat` on `titles.embedding` and `titles.mood_vector`
- `journal_entries(profile_id, watched_at DESC)`
- `ratings(profile_id, title_id)` UNIQUE
- `credits(title_id, billing_order)`, `credits(person_id)`
- `profiles(account_id)`

### 6.1 TMDB sync strategy

- **On-demand**: when a user lands on `/title/[id]`, fetch+upsert if stale (>7 days).
- **Background**: weekly cron pulls TMDB `/trending/all/week` + `/movie/popular` and refreshes our catalog (~20k titles for MVP).
- **Vibrant palette**: extracted on poster ingest, stored as jsonb (5 colors + dominant).
- **Embedding generation**: HF Inference (`nomic-embed-text-v1.5`) on `title + overview + keywords + genres` concatenation, stored on row.

---

## 7. Backend Architecture

```
Browser  ─────────  Next.js 16 (Vercel)  ──────  Postgres (Neon)
                          │
                          ├──── Redis (Upstash)              cache hot keys
                          ├──── Mux                          HLS streams
                          ├──── TMDB API                     metadata
                          ├──── HF Inference API             embeddings + LLM
                          ├──── Clerk                        auth
                          └──── Vercel Blob                  posters, share-out PNGs
```

All backend code lives in the same Next.js app. No separate API service.

### 7.1 Layering

- **Server Components** for data fetching on render (most pages).
- **Server Actions** for mutations (rate, log, save, generate Why card).
- **Route Handlers** for streaming endpoints (Mood Dial live results, Recap progress).
- **Vercel Cron** for nightly recap rebuild + weekly catalog refresh.

### 7.2 Caching strategy

- **Title metadata**: Postgres-cached forever, refreshed weekly by cron. Next.js `unstable_cache` with `cacheTag('title:<id>')` on read.
- **Why Card** per `(user, title)`: Redis, 14-day TTL — same explanation served on every revisit.
- **Mood Dial results**: edge-cached by `(mood_x, mood_y, taste_centroid_hash)` for 5 min.
- **Recap state**: Postgres jsonb, rebuilt nightly.

### 7.3 API contract (server actions)

Only the most-load-bearing ones — the agents will fill in the rest:

| Action | Input | Output |
|---|---|---|
| `rateTitle` | `titleId, score, liked` | updated `taste_centroid` |
| `logWatch` | `titleId, reflection?, moodAtWatch?` | `journalEntry, prompted_question` |
| `getWhyCard` | `titleId` | `{reasons[], explanation_text}` (cached) |
| `streamMoodResults` | `valence, arousal, runtimeMax` | SSE stream of title cards |
| `getRecap` | — | story_json for current state |
| `addToWatchlist` | `titleId` | ok |

---

## 8. AI Layer (Hugging Face Inference API)

| Job | Model | Why |
|---|---|---|
| Title & reflection embeddings | `nomic-ai/nomic-embed-text-v1.5` (768d → projected to 384d) | High-quality open embeddings, generous free tier |
| Mood-axis tagging | `mistralai/Mistral-7B-Instruct-v0.3` | Cheap inference; we batch at ingest |
| "Why this movie" explanations | `meta-llama/Llama-3.1-8B-Instruct` | Best small-model quality for short personalized text |
| Echo Journal questions | Same as above | Already paid for in cache |

**Prompt strategy**: a single shared prompt template per job, versioned in `lib/ai/prompts/*.ts`. Why-card output is JSON-schema-constrained to enforce `{reasons: [{dimension, contribution, copy}], explanation_text}`.

**Cost guardrails**: every LLM call goes through a thin wrapper with Redis-based per-user rate limits (10 explanations/hour for free use; cached results don't count). Embeddings batched offline, never on the request path.

**Latency**: HF Inference cold-start is 1–3s. Why-card is *pre-warmed* the moment a recommendation is rendered (`startTransition` + Server Action) so the flip animation feels instant when the user taps.

---

## 9. Video Pipeline

- **Trailers**: YouTube embeds via TMDB `videos` endpoint (with our own `<MuxPlayer>`-themed chrome via `react-player`).
- **CC0 catalog** (~20 public-domain films — *Night of the Living Dead*, *Nosferatu*, *Carnival of Souls*, *His Girl Friday*, etc.): uploaded to Mux at ingest, served as HLS via `@mux/mux-player-react` with Apple-styled controls.
- Mux gives us automatic poster frames, scrub thumbnails, and CDN egress — no custom encoding work.
- Player chrome custom-built to match Apple TV+ player aesthetic: glassy bottom bar that fades on idle, transport scrubber with frame thumbnails on hover.

---

## 10. Auth & User Model (Clerk)

- Clerk via Vercel Marketplace — one-click provision.
- Methods enabled: **email magic link, Google**. Apple Sign-In deferred (avoids $99/yr Developer fee at MVP).
- Clerk-hosted sign-in/sign-up *themed* to Liquid Glass (custom appearance config in `<ClerkProvider>`).
- `accounts.clerk_user_id` mirrors Clerk's `userId`; a Clerk webhook on `user.created` provisions an `accounts` row + 1 default `profiles` row + default watchlist on that profile.
- First sign-in → **Who's watching?** picker (with one default profile already created). New profile creation → `/onboarding` (10-film taste seed).

---

## 11. PWA & Mobile

- Mobile-first. All layouts built ground-up at 375px, scaled up.
- `next-pwa` for service worker + manifest. App-shell pre-cached.
- Add-to-home-screen prompt after second session.
- iOS-specific meta tags (`apple-mobile-web-app-status-bar-style: black-translucent`) so the app feels native on Safari.
- Web Push (deferred — would carry Tonight Card nudges in v1.1).

---

## 12. Tech Stack Summary

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Cache Components) |
| Language | TypeScript |
| DB | Postgres (Neon, via Vercel Marketplace) + `pgvector` |
| Cache | Redis (Upstash, via Vercel Marketplace) |
| Auth | Clerk (Vercel Marketplace) |
| Video | Mux |
| AI | Hugging Face Inference API |
| Metadata | TMDB API v3 |
| Asset storage | Vercel Blob (for share-out images, etc.) |
| Hosting | Vercel (Functions + Edge + Cron) |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Component primitives | shadcn/ui (themed to Liquid Glass) + Radix |
| Motion | Framer Motion + native View Transitions |
| 3D / WebGL | React Three Fiber (Cinema Weather only) |
| Forms | React Hook Form + Zod |
| Linting/Format | Biome (lint + format in one binary) |
| Testing | Vitest (unit), Playwright (E2E) |
| Analytics | Vercel Analytics + Speed Insights (perf) + PostHog Cloud (events, funnels, session replay, feature flags — free tier) |

---

## 13. Project Structure (proposed)

```
D:\High-Tech\04_Movies Project\
├── app/                         # Next.js App Router
│   ├── (marketing)/             # public surfaces, no auth
│   │   └── page.tsx
│   ├── (app)/                   # auth-gated
│   │   ├── layout.tsx
│   │   ├── page.tsx             # home
│   │   ├── onboarding/
│   │   ├── discover/
│   │   ├── title/[tmdb_id]/
│   │   ├── person/[tmdb_id]/
│   │   ├── journal/
│   │   ├── recap/
│   │   └── settings/
│   ├── api/                     # route handlers (streaming)
│   │   ├── mood-stream/route.ts
│   │   └── webhooks/clerk/route.ts
│   ├── actions/                 # server actions
│   └── globals.css
├── components/
│   ├── glass/                   # GlassChrome, GlassCard, GlassSheet, GlassOrb
│   ├── title/                   # TitleCard, HoverPreview, TitleHero
│   ├── mood/                    # MoodDial, MoodChip
│   ├── why/                     # WhyCard
│   ├── journal/                 # EchoPrompt, ReflectionEditor
│   ├── recap/                   # StoryDeck, RecapCard
│   └── ui/                      # shadcn primitives, themed
├── lib/
│   ├── db/                      # Drizzle schema + queries
│   ├── tmdb/                    # typed TMDB client + sync jobs
│   ├── ai/
│   │   ├── prompts/             # versioned prompt templates
│   │   ├── embeddings.ts
│   │   ├── why.ts
│   │   └── echo.ts
│   ├── mux/                     # Mux client + upload helpers
│   ├── auth/                    # Clerk helpers
│   ├── recap/                   # nightly story builder
│   └── design/                  # palette extraction, color tokens
├── public/
├── scripts/
│   ├── seed-catalog.ts          # initial TMDB import (~20k titles)
│   ├── ingest-cc0.ts            # one-time Mux upload
│   └── compute-mood-vectors.ts  # batch embedding job
├── drizzle/                     # migrations
├── tests/
├── biome.json
├── drizzle.config.ts
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── SPEC.md
```

---

## 14. Milestones — Week-by-Week MVP

### Week 1 — Foundation
- Vercel project + Neon Postgres + Upstash Redis + Clerk provisioned via Marketplace
- Drizzle schema migrated; TMDB client written and typed
- Seed script imports 20k popular titles + extracts vibrant palettes
- HF Inference batch job computes title embeddings + mood vectors offline
- Tailwind theme + glass material primitives shipped (`<GlassChrome>`, `<GlassCard>`, `<GlassSheet>`)
- Clerk-themed sign-in surface

### Week 2 — Core surfaces
- Home (hero + 3 personalized rows)
- Title detail (cinematic glass canvas, cast/crew, trailers)
- Person detail (basic career timeline)
- Search (titles + people)
- Hover-preview cards w/ trailer autoplay
- Onboarding (10-film taste seed) → computes first taste centroid

### Week 3 — Differentiators
- **Mood Dial** (Pillar 1) — drag UI, debounced streaming results
- **Time-Box Discovery** (Pillar 1)
- **Why Card** (Pillar 2) — pre-warmed LLM explanations, flip animation
- **Echo Journal** (Pillar 3) — log a film, get a question, store reflection
- **Cinema Weather orb** (Pillar 2) — WebGL shader driven by taste centroid

### Week 4 — Polish, performance, launch
- **Living Recap** (Pillar 3) — story-deck + nightly cron + share images via `@vercel/og`
- Mux player chrome polish + CC0 catalog ingest
- PWA manifest + install prompt + offline shell
- Accessibility audit (`prefers-reduced-transparency`, contrast, keyboard, screen reader)
- Performance pass (Lighthouse mobile ≥90)
- E2E happy paths in Playwright
- Production deploy

---

## 15. Agent Workflow

The orchestrator agent will drive the build with autonomous permission, delegating to specialists:

| Stream | Lead agent | Supporting |
|---|---|---|
| Infra + Vercel setup | `devops-engineer` | `vercel:bootstrap`, `vercel:env`, `vercel:marketplace` skills |
| Schema + data ingest | `data-engineer` | TMDB sync, pgvector, Drizzle migrations |
| Auth integration | `backend-engineer` | Clerk + webhooks |
| Backend (server actions, AI layer) | `backend-engineer` | `ml-engineer` for prompt/embedding tuning |
| Design system + Liquid Glass primitives | `ui-designer` → `frontend-engineer` | `vercel:shadcn`, `frontend-design` skills |
| Page-by-page UI | `frontend-engineer` | Per-pillar handoff |
| Video pipeline | `backend-engineer` | Mux client |
| Testing | `qa-engineer` | Per-week feature deliverables |
| Performance pass | `performance-engineer` | Week 4 |
| Security pass | `security-auditor` | Week 4 |
| Release + deploy | `release-manager` | Week 4 |

Claude (parent session) is the conductor — routes work, resolves cross-stream conflicts, surfaces decisions back to Dor.

---

## 16. Open Questions — RESOLVED 2026-05-12

| # | Question | Decision |
|---|---|---|
| 1 | Name & domain | **"Lumen"** as working title; no custom domain yet — ship on `*.vercel.app` for MVP |
| 2 | CC0 catalog | **We pick** — see Appendix A.1 |
| 3 | Onboarding taste-seed films | **We pick** — see Appendix A.2 |
| 4 | Account model | **Multi-profile** (Netflix-style, up to 5 per account) — see §6 |
| 5 | Analytics | **Vercel Analytics + Speed Insights + PostHog Cloud** (free tier) |
| 6 | Apple Sign-In | **Skip** for MVP — email + Google only |
| 7 | Reduce visual ambition on mobile if Lighthouse fails | **Yes** — Cinema Weather degrades to a static glass orb on devices that fail the capability check |

---

## 17. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| HF Inference latency tanks Why Card UX | Med | Pre-warm explanations the moment a card renders; aggressive Redis cache; pre-bake for top 1000 popular titles for cold users |
| `backdrop-filter` performance on low-end Android | Med | Strict 6-glass-surface budget; capability check disables vibrant material; fallback to opaque tinted surfaces |
| TMDB API key rate-limited | Low | Postgres caches everything; on-demand fetch only when stale (>7 days) |
| Mux egress costs creep | Low (MVP scale) | CC0 catalog capped at ~20 films; monitor monthly |
| Scope creep into "social features" | High | This spec is the gate. New features need a written addendum. |
| Spec drift between agents during build | Med | Orchestrator is the single source of truth; agents read SPEC.md at start of every task |

---

## 18. Research Appendix — Sources

### Apple Liquid Glass
- [Apple Newsroom — *Apple introduces a delightful and elegant new software design* (Jun 2025)](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/)
- [Apple Developer — New Design Gallery 2026](https://developer.apple.com/design/new-design-gallery-2026/)
- [Wikipedia — Liquid Glass](https://en.wikipedia.org/wiki/Liquid_Glass)
- [LogRocket — *How to create Liquid Glass effects with CSS and SVG*](https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg/)
- [nikdelvin/liquid-glass — open-source CSS+SVG recreation](https://github.com/nikdelvin/liquid-glass)
- [kevinbism/liquid-glass-effect — alternative pure-CSS approach](https://github.com/kevinbism/liquid-glass-effect)
- [Inverness Design Studio — Glassmorphism 2026](https://invernessdesignstudio.com/glassmorphism-what-it-is-and-how-to-use-it-in-2026)

### Netflix
- [Shaped — *Key Insights from the Netflix Personalization Workshop 2025* (Hydra multi-task model, Foundation Model)](https://www.shaped.ai/blog/key-insights-from-the-netflix-personalization-search-recommendation-workshop-2025)
- [ZenML — *Netflix Foundation Model for Unified Personalization at Scale*](https://www.zenml.io/llmops-database/foundation-model-for-unified-personalization-at-scale)
- [ClickItTech — *Netflix Architecture 2026*](https://www.clickittech.com/software-development/netflix-architecture/)
- [Createbytes — *Netflix Design: A Deep Dive into UX Strategy*](https://createbytes.com/insights/netflix-design-analysis-ui-ux-review)
- [CXL — *Analyzing Netflix Design, UI and UX*](https://cxl.com/blog/netflix-design/)

### IMDB
- [IMDB Help — Name Page Redesign](https://help.imdb.com/article/imdb/new-features-updates/imdb-name-page-redesign/GMWASETVPLJYXEZE)
- [IndieWire — *IMDb Officially Launches Redesign with Revamped Name Pages*](https://www.indiewire.com/features/general/imdb-launches-site-redesign-revamped-name-pages-1234746279/)
- [IMDB Community — Redesigned Title Reference View Beta](https://community-imdb.sprinklr.com/conversations/imdbcom/redesigned-title-reference-view-beta-optin/682e99af97b64c4df354c18c)

### TMDB
- [TMDB — Getting Started](https://developer.themoviedb.org/reference/intro/getting-started)
- [TMDB — Movie Details endpoint](https://developer.themoviedb.org/reference/movie-details)

### Novel features benchmarks
- Letterboxd, Trakt, JustWatch, Reelgood, Mubi, Criterion Channel, TasteDive, MovieLens, Spotify Wrapped, Last.fm Year, Strava Year-in-Sport (consulted as prior art for the 10-feature brainstorm; see §3).

---

---

## Appendix A — Curated content sets

### A.1 — CC0 / Public-Domain Catalog (20 films)

A spread across silent, noir, screwball, foreign classics, and horror. All confirmed public-domain in the United States.

| # | Title | Year | Director | Bucket |
|---|---|---|---|---|
| 1 | A Trip to the Moon | 1902 | Georges Méliès | Silent / fantasy |
| 2 | Nosferatu | 1922 | F. W. Murnau | Silent / horror |
| 3 | Nanook of the North | 1922 | Robert J. Flaherty | Documentary |
| 4 | Sherlock Jr. | 1924 | Buster Keaton | Silent / comedy |
| 5 | The Phantom of the Opera | 1925 | Rupert Julian | Silent / horror |
| 6 | Battleship Potemkin | 1925 | Sergei Eisenstein | Silent / drama |
| 7 | The General | 1926 | Buster Keaton | Silent / comedy |
| 8 | The Cabinet of Dr. Caligari | 1920 | Robert Wiene | Silent / horror |
| 9 | Reefer Madness | 1936 | Louis J. Gasnier | Cult |
| 10 | His Girl Friday | 1940 | Howard Hawks | Screwball |
| 11 | Detour | 1945 | Edgar G. Ulmer | Noir |
| 12 | The Stranger | 1946 | Orson Welles | Noir / thriller |
| 13 | D.O.A. | 1949 | Rudolph Maté | Noir |
| 14 | Plan 9 from Outer Space | 1959 | Ed Wood | Cult / sci-fi |
| 15 | The Killer Shrews | 1959 | Ray Kellogg | Cult / horror |
| 16 | Carnival of Souls | 1962 | Herk Harvey | Horror / arthouse |
| 17 | Dementia 13 | 1963 | Francis Ford Coppola | Horror |
| 18 | Charade | 1963 | Stanley Donen | Romance / thriller |
| 19 | The Last Man on Earth | 1964 | Sidoni Salkow & Ubaldo Ragona | Sci-fi / horror |
| 20 | Night of the Living Dead | 1968 | George A. Romero | Horror |

> *Ingest plan: Mux upload at seed time, automatic HLS + thumbnails. Each linked to its TMDB title row.*

### A.2 — Onboarding Taste-Seed Films (10)

Picked for: (a) high recognition — most users have seen ≥5; (b) wide coverage of valence × arousal × theme axes so even 5 ratings produce a meaningfully distinct centroid; (c) era spread; (d) one international, one animated, one quiet character drama, one blockbuster pole, one modern horror.

| # | Title | Year | Director | Axis served |
|---|---|---|---|---|
| 1 | The Shawshank Redemption | 1994 | Frank Darabont | Universal drama anchor |
| 2 | Pulp Fiction | 1994 | Quentin Tarantino | Non-linear / edgy |
| 3 | Spirited Away | 2001 | Hayao Miyazaki | Animation / international |
| 4 | Eternal Sunshine of the Spotless Mind | 2004 | Michel Gondry | Quirky melancholy |
| 5 | The Dark Knight | 2008 | Christopher Nolan | Blockbuster pole |
| 6 | Mad Max: Fury Road | 2015 | George Miller | Pure visual action |
| 7 | Lady Bird | 2017 | Greta Gerwig | Quiet character drama |
| 8 | Get Out | 2017 | Jordan Peele | Modern horror w/ weight |
| 9 | Parasite | 2019 | Bong Joon-ho | International thriller |
| 10 | Past Lives | 2023 | Celine Song | Slow-burn romance |

> *Flow: cards present 5-star tap with "Haven't seen it" skip. Users must rate ≥5 to compute a usable centroid; 8–10 ideal. Onboarding writes initial `profiles.taste_centroid` as the weighted mean of rated titles' embeddings.*

---

*End of Spec v1.0 — all open questions resolved. Orchestrator is cleared to start Week 1 once the owner gives the launch signal.*
