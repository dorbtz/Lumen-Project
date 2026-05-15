# Changelog

All notable changes to Lumen. Format loosely follows Keep a Changelog;
versioning is pre-1.0 (portfolio MVP).

## [0.2.0] — 2026-05-15 — MVP completion

Closes every gap between the live build and the SPEC MVP per
`SPEC_COMPLETION.md`. Free-tier AI only; zero new LLM call sites.

### Added

- **Time-Box Discovery** (`/discover/timebox`) — runtime-budget slider +
  preset chips; ranks by taste-centroid cosine over the existing pgvector
  path, +8 min grace, empty state below 40 min. (A1)
- **Discover hub** (`/discover`) + **mood presets**
  (`/discover/mood/[slug]`) — 6 curated "moments" via a static
  slug→(valence,arousal[,runtime]) map reusing the Mood Dial query;
  unknown slug → 404. (A5)
- **Home Mood Dial** — the existing dial embedded above the personalized
  rows. (A6)
- **Public recap share** (`/recap/share/[token]`) — unguessable,
  rotation-revocable token; read-only, no auth, no PII beyond the recap
  story; Satori OG image (hex/rgba only). Share button on `/recap`. (A2)
- **Settings** (`/settings`) — Profile (links to profiles), Taste reset
  (clears ratings + nulls centroid + re-onboarding; **keeps journal &
  recap** per decision D2), Accessibility toggles (reduce
  transparency/motion, persisted, mirror the OS media queries), Sign
  out. Reachable from the profile menu. (A3)
- **Crons** — `/api/cron/recap` nightly (active-profile rebuild) and
  `/api/cron/catalog` daily with a Sunday self-gate for the heavy TMDB
  refresh (decision D3). Bearer-`CRON_SECRET` auth, constant-time,
  fail-closed. (A4)
- **CC0 / Mux** — `scripts/ingest-cc0.ts` (20 public-domain films →
  Mux), `cc0_videos` linkage, `/title/[tmdb_id]/watch` themed
  `@mux/mux-player-react` (Apple-TV+ glass chrome) with YouTube trailer
  fallback. (D1)
- **PWA** — `app/manifest.ts`, real Serwist service worker (configurator
  mode, Turbopack-safe), offline fallback, "Add to Home Screen" prompt
  after the 2nd session. (B1)
- **Why Card flip** — 3D framer-motion flip (spring damping:26
  stiffness:220); `prefers-reduced-motion` → cross-fade. (B4)
- **PostHog** — optional, graceful no-op without a key; pageviews +
  product events (rated_film, logged_journal, viewed_recap, mood_search,
  timebox_search); identify by Clerk user id only. (B3)
- **Tests** — Vitest unit suite (35 tests: centroid math, mood→vector,
  timebox rule, share-token, presets, cron auth, a11y cookie) +
  Playwright E2E (auth-free gate paths always run; authenticated
  journeys self-skip without a test session). (B2)

### Changed

- `recap_states` gains a nullable, partial-unique `share_token`.
- Pure logic extracted for testability (centroid, mood-vector,
  timebox-rule, recap token); call sites rewired with no behaviour
  change.
- Nav "Discover" now points at the `/discover` hub.
- `next.config.ts` false "service worker registered" comment removed;
  real SW pipeline documented.

### Security

- Recap share route is token-bound, rotation-revocable, leaks no
  profile data; cron endpoints constant-time Bearer auth, fail-closed,
  Clerk-bypassed only for `/api/cron/*`; Mux SDK server-only, `public`
  playback policy appropriate for public-domain content.
