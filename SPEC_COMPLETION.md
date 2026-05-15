# Lumen — MVP Completion Spec

> Addendum to `SPEC.md`. Scope: close every gap between the live build and the SPEC MVP.
> Constraint (hard): **free-tier AI only** (Gemini free tier) — no paid APIs, ever.
> Status: **Draft — pending Dor's approval. No code until approved.**
> Last updated: 2026-05-15

---

## 0. Guiding rules

- Spec-first: this doc is the contract. Agents read it at task start.
- No new paid services. No new AI quota pressure — new features reuse existing embeddings/centroids; **zero new LLM call sites** except where explicitly noted (none in this spec).
- Every change ships via Path A (push to `main` → auto-deploy). Build must stay green.
- Liquid Glass + accessibility rules from `SPEC.md §5` still bind. `next/og` (Satori) = hex/rgb only, no `oklch()`.

---

## 1. Scope — Track A (MVP feature completion)

### A1. Time-Box Discovery — `/discover/timebox`  (SPEC §3.1 #5)
- Input: a runtime budget ("I have ___ minutes") via glass slider/preset chips (90 / 120 / 150 / custom).
- Logic: filter `titles.runtime_min ≤ budget (+8 min grace)`, rank by taste-centroid cosine (existing pgvector path used by Mood Dial), tie-break popularity.
- UI: reuse the Mood Dial result grid; server action `searchByTimeboxAction(maxMinutes)`. No LLM.
- Empty state if budget < 40 min.

### A2. Recap share — `/recap/share/[token]` + OG image  (SPEC §3.1 #4)
- Add `share_token` (nanoid, unguessable) to `recap_states` (migration).
- "Share" button on `/recap` → copies public URL `/recap/share/<token>`.
- Public route (add to `proxy.ts` public matcher) renders a read-only recap, no auth, no profile data beyond the recap story.
- `app/(marketing)/recap/share/[token]/opengraph-image.tsx` — Satori, hex colors only, renders headline + first moment (Spotify-Wrapped feel).
- Revoke: regenerating a recap rotates the token.

### A3. Settings — `/settings`  (SPEC §3.2)
- Glass page reachable from the profile menu.
- Sections: **Profile** (rename / avatar color — reuse existing profile actions), **Taste** (Reset taste → confirm dialog → clears `ratings` for the profile + nulls `taste_centroid` + sets `onboarding_done=false` so the user re-seeds; **journal entries kept**), **Accessibility** (persisted toggles: reduce transparency, reduce motion — stored on profile or cookie, applied as a `data-*` attr on `<html>` that CSS honors alongside the OS media queries), **Sign out**.

### A4. Crons — nightly recap + weekly catalog  (SPEC §14)
- `vercel.json` → `crons` (Hobby-plan-safe: daily cadence, ≤2 jobs).
  - `0 7 * * *` → `/api/cron/recap` — rebuild recap for profiles active in last 14 days.
  - `0 8 * * *` → `/api/cron/catalog` — handler self-gates to **run heavy TMDB refresh only on Sundays** (day-of-week check), light no-op other days (works within Hobby's daily-only limit).
- Both handlers require `Authorization: Bearer $CRON_SECRET` (new env var, all envs). Reject otherwise.
- TMDB refresh reuses existing `lib/tmdb/sync.ts`; bounded to `/movie/popular` + `/trending/all/week` pages already used by the seed script. No embedding backfill on the request path.

### A5. `/discover` hub + mood presets — `/discover/mood/[slug]`  (SPEC §4)
- `/discover`: a calm glass index linking Mood Dial, Time-Box, and 4–6 preset "moments".
- `/discover/mood/[slug]` for presets (`rainy-sunday`, `dinner-party`, `90-minutes`, `post-breakup`, `wired-awake`, `comfort-rewatch`) → static slug→(valence,arousal[,runtime]) map → reuses Mood Dial query. Unknown slug → 404.

### A6. Home Mood Dial  (SPEC §3.2)
- Embed the existing `MoodDial` in a Home section ("What do you want to feel tonight?") above the personalized rows. Pure composition of the existing component; no new logic.

---

## 2. Scope — Track B (polish & credibility)

### B1. PWA  (SPEC §11)
- `app/manifest.ts` (name, icons, theme/bg color matching the sapphire base, `display: standalone`).
- Service worker via **`@serwist/next`** (maintained `next-pwa` successor; Next 16 + App Router compatible) — precache app shell, network-first for data, offline fallback page.
- Install prompt: capture `beforeinstallprompt`, show a glass "Add to Home Screen" affordance after the 2nd session (localStorage counter).
- Remove the false "service worker registered" comment in `next.config.ts` once real.
- iOS meta tags already present — verify only.

### B2. Tests  (SPEC §12)
- **Vitest**: config + unit tests for pure logic — taste-centroid math, mood→vector mapping, timebox filter, recap windowing, share-token rotation. Target the `lib/` functions, mock DB/AI.
- **Playwright**: `playwright.config.ts` + E2E happy paths — marketing→sign-in gate (307), onboarding rate-5→home, Mood Dial returns results, journal compose→question, recap renders, settings taste-reset round-trip. Auth via a test Clerk session/storage-state.
- `package.json` scripts: `test`, `test:unit`, `test:e2e`. CI optional (note only; no GH Actions unless asked).

### B3. PostHog  (SPEC §12)
- Client init (free-tier key via `NEXT_PUBLIC_POSTHOG_KEY`/`_HOST`), `<PostHogProvider>` in `app/layout.tsx`, pageview + a few product events (rated_film, logged_journal, viewed_recap, mood_search, timebox_search). No PII beyond Clerk user id. Gracefully no-op if key absent.

### B4. Why Card flip animation  (SPEC §3.1 #2, §5.5)
- Convert Why Card to a framer-motion 3D flip (front: poster/“Why this for you”; back: the 3 reasons), spring `damping:26 stiffness:220`, `prefers-reduced-motion` → cross-fade, not flip.

---

## 3. Explicit scope decisions — RESOLVED 2026-05-15 (Dor)

- **D1 — RESOLVED: Full Mux + CC0 ingest.** Build `scripts/ingest-cc0.ts` (upload all 20 SPEC Appendix A.1 public-domain films to Mux), `cc0_videos` table, themed `/title/[tmdb_id]/watch` route with Apple-TV-style `@mux/mux-player-react` chrome (glass transport bar, idle-fade, hover thumbnails) for CC0 titles; YouTube-embed fallback for non-CC0 trailers. Caveat noted & accepted: Mux has no perpetual free tier — uses trial credits, monitor egress; CC0 catalog capped at 20 per SPEC §17.
- **D2 — RESOLVED: Reset = clear `ratings` + null `taste_centroid` + `onboarding_done=false`; KEEP journal entries & recap.**
- **D3 — RESOLVED: Two daily Vercel crons; catalog handler self-gates heavy TMDB refresh to Sundays** (day-of-week check), light no-op other days. No paid plan upgrade.

---

## 4. Execution plan (orchestrated, after approval)

Spec-first per task; each agent reads this doc.

| Phase | Work | Lead agent(s) |
|---|---|---|
| 1 | Migrations: `recap_states.share_token`, `cc0_videos` table; `CRON_SECRET`/`MUX_*`/PostHog env scaffolding | data-engineer, devops-engineer |
| 2 | A1 Time-Box, A5 discover hub/presets, A6 Home dial | backend-engineer + frontend-engineer |
| 3 | A2 Recap share + OG, A3 Settings + taste reset | backend-engineer + frontend-engineer |
| 4 | A4 Crons | backend-engineer |
| 5 | D1 Mux/CC0: `scripts/ingest-cc0.ts` (20 films → Mux), `/title/[id]/watch` themed Mux player + YouTube fallback | backend-engineer + frontend-engineer |
| 6 | B1 PWA, B4 Why Card flip | frontend-engineer |
| 7 | B3 PostHog | frontend-engineer |
| 8 | B2 Tests (unit + E2E) across all of the above | qa-engineer |
| 9 | Accessibility + perf pass (Lighthouse ≥90, SPEC §5.7), security pass on share route + cron auth + Mux signing | performance-engineer, security-auditor |
| 10 | Final review, changelog, ship | code-reviewer → release |

Each phase: build → typecheck/build green → commit → push (auto-deploy) → brief verify before next.

---

## 5. Out of scope (stays deferred per SPEC §3.3 / §10–11)

Tonight Card, Taste Drift, Double Feature, Glass Shelf, Web Push, Apple Sign-In, Clerk production instance (needs paid domain), social features.
