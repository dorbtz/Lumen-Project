<div align="center">

# 🎬 Lumen

### Discover films by *mood*, not by genre grid.

**A Netflix + IMDB hybrid, reimagined with Apple's Liquid Glass design language.**

*Letterboxd's depth meets Apple TV+'s cinematics, with an AI layer that actually understands you.*

[**🌐 Live demo → lumen-smoky.vercel.app**](https://lumen-smoky.vercel.app)

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Postgres](https://img.shields.io/badge/Postgres-Neon%20%2B%20pgvector-336791?logo=postgresql&logoColor=white)
![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)
![Tests](https://img.shields.io/badge/tests-Vitest%20%2B%20Playwright-6E9F18?logo=vitest&logoColor=white)

<br />

![Lumen home](docs/screenshots/home.png)

</div>

---

## What is Lumen?

Most movie apps ask *"what genre are you in the mood for?"* and hand you a wall of posters. Lumen asks **"what do you want to *feel* tonight?"** — and explains every recommendation in plain language grounded in *your* taste.

It does three things no current product does together:

1. **Discover by mood and moment**, not by genre grid.
2. **Explain every recommendation** in one or two sentences tied to your taste embedding — not a black box.
3. **Keep a living journal** of what you watch, that re-renders at any moment into a Spotify-Wrapped-style story of who you've become as a viewer.

It looks and feels like an Apple product — the translucent, content-driven **Liquid Glass / visionOS** material language: controls that recede, content that breathes.

> This is a **production-quality portfolio MVP**, built end-to-end on free-tier infrastructure.

---

## The three pillars

Every feature serves at least one of these. If it doesn't, it was deferred.

| Pillar | Idea | How it works |
|---|---|---|
| **🎚️ Mood / Situational Discovery** | *"What do I want to feel tonight?"* | A continuous 2D affect space (valence × arousal) + context signals (time of day, runtime budget) + curated "moments" (rainy Sunday, 90 minutes to kill). |
| **🧠 Explainable AI Taste** | *Every rec comes with a personalized "why".* | Onboard by rating ~10 films → a taste embedding. Each rec surfaces the 3 contributing dimensions ("you respond to quiet endings + naturalistic dialogue + restrained color"). |
| **📓 Living Cinema Journal** | *A diary that auto-renders into a story.* | Each watched film is logged with an optional reflection that feeds back into your taste model. The Recap surface re-renders nightly into shareable full-screen glass cards. |

---

## Features

### MVP surfaces

| Feature | Pillar |
|---|---|
| **Mood Dial** — 2D affect dial; results stream as you drag | Mood |
| **The Why Card** — every rec flips to reveal 3 personalized reasons | AI Taste |
| **Echo Journal** — log a film, get one thoughtful question; your reply feeds the embedding | Journal |
| **Living Recap** — always-on Wrapped; re-renders nightly, shareable with an auto-generated OG image | Journal |
| **Time-Box Discovery** — *"I have 73 minutes"* → ranked picks | Mood |
| **Cinema Weather** — ambient glass orb reflecting your last 5 watches | AI Taste |

### Supporting surfaces

Onboarding (taste-seeding) · Home (hero + Mood Dial + personalized rows) · Title & Person detail · Mood-first browse + ⌘K search · Journal & Watchlist · Settings (incl. taste reset) · Mux-powered HLS player for trailers + a small public-domain (CC0) catalog · Installable **PWA** with offline fallback.

---

## Screenshots

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/mood-dial.png" alt="Mood Dial" /><br /><sub><b>Mood Dial</b> — drag through valence × arousal; results stream live</sub></td>
    <td width="50%"><img src="docs/screenshots/why-card.png" alt="The Why Card" /><br /><sub><b>The Why Card</b> — flips to show 3 reasons tied to your taste</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/journal.png" alt="Echo Journal" /><br /><sub><b>Echo Journal</b> — a logged film + its reflection question</sub></td>
    <td width="50%"><img src="docs/screenshots/recap.png" alt="Living Recap" /><br /><sub><b>Living Recap</b> — Wrapped-style glass cards, shareable</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/title-detail.png" alt="Title detail" /><br /><sub><b>Title detail</b> — IMDB-grade depth on a glass canvas</sub></td>
    <td width="50%"><img src="docs/screenshots/discover-timebox.png" alt="Time-Box Discovery" /><br /><sub><b>Time-Box Discovery</b> — pick by the time you have</sub></td>
  </tr>
</table>

> 📸 Image files live in [`docs/screenshots/`](docs/screenshots/). If a tile above is blank, the screenshot hasn't been added yet — see that folder's README for the exact filenames to drop in.

---

## Tech stack

| Layer | Choice |
|---|---|
| **Framework** | Next.js 16 (App Router, RSC, View Transitions) + TypeScript |
| **Styling** | Tailwind CSS v4, custom Liquid Glass material system, Framer Motion |
| **Database** | Neon Postgres + **pgvector** (taste embeddings, semantic rank) via Drizzle ORM |
| **Cache / KV** | Upstash Redis |
| **Auth** | Clerk (middleware-protected app routes, Svix-verified webhooks) |
| **AI** | Google **Gemini** (free tier) via the Vercel AI SDK — embeddings + "why" explanations |
| **Media** | Mux — HLS playback for trailers + a small CC0 public-domain catalog |
| **Metadata** | TMDB |
| **Analytics** | Vercel Analytics + Speed Insights, PostHog (optional, graceful) |
| **PWA** | Serwist (configurator mode — Turbopack-safe) |
| **Testing** | Vitest (unit) + Playwright (E2E) |
| **Hosting** | Vercel (auto-deploy on push to `main`, 2 daily crons) |

Every external service runs on its **free tier** by design.

---

## Getting started

### Prerequisites

- Node.js ≥ 20
- A [Neon](https://neon.tech) Postgres database (with the `vector` extension)
- An [Upstash](https://upstash.com) Redis instance
- A [Clerk](https://clerk.com) application
- A [TMDB](https://www.themoviedb.org/settings/api) API key
- A free [Google AI Studio](https://aistudio.google.com/apikey) (Gemini) API key
- *(optional)* a [Mux](https://mux.com) account for the CC0 player, and a [PostHog](https://posthog.com) project for analytics

### 1. Install

```bash
git clone https://github.com/dorbtz/Lumen-Project.git
cd Lumen-Project
npm install
```

### 2. Configure environment

Copy the example and fill in your keys:

```bash
cp .env.example .env.local
```

If you provision the database/auth/media through the **Vercel Marketplace**, you can pull most vars automatically after `vercel link`:

```bash
vercel env pull .env.local
```

See [`.env.example`](.env.example) for the full annotated list.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, rate the 10 onboarding films, and the taste model comes alive.

> **Database & data pipeline:** schema migrations and the TMDB seed / Gemini
> embedding / Mux CC0 ingest are handled by operational tooling maintained
> privately (not part of this public repo). The Mux free plan caps an account
> at **10 video assets**, so the playable catalog is intentionally trimmed to
> 10; titles without a Mux asset gracefully fall back to the YouTube trailer.

---

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (Next.js + Serwist service worker) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run check` | Biome lint + format (autofix) |
| `npm test` | Vitest unit suite |
| `npm run test:e2e` | Playwright E2E happy paths |

---

## Architecture notes

- **Cache Components is intentionally off** — Clerk's Next.js SDK v6 isn't yet compatible with Next 16's dynamic-IO model. Caching still works via `unstable_cache` / `cacheTag` / `cacheLife`.
- **PWA** is built by Serwist in *configurator mode* (`serwist.config.mjs` + `serwist build` after `next build`), which is Turbopack-safe — no webpack plugin.
- **Two daily crons** (`vercel.json`): `/api/cron/recap` (07:00 UTC, re-renders every Living Recap) and `/api/cron/catalog` (08:00 UTC). Both are `Bearer $CRON_SECRET`-authenticated and fail closed.
- **Auth middleware** lives in `proxy.ts` (Next 16 renamed `middleware.ts`); webhook routes bypass it and verify Svix signatures in-handler.
- Recommendation ranking is **pgvector** cosine similarity against the user's taste centroid; "why" explanations are cached Gemini calls over the contributing embedding dimensions.

---

## Project structure

```
app/
  (app)/            authenticated surfaces — home, discover, journal,
                    recap, settings, title, person, watchlist, weather
  (marketing)/      public landing + shareable recap + offline page
  api/              cron jobs + Svix-verified webhooks
components/         Liquid Glass UI, Mood Dial, Why Card, analytics
lib/                db (Drizzle schema), ai (Gemini client), mux,
                    tmdb, cron auth, discovery rules
drizzle/            SQL migrations (pgvector, ivfflat indexes, collections)
tests/              Vitest unit + Playwright E2E
docs/screenshots/   README imagery
```

---

## Status & roadmap

✅ **MVP complete and live.** All six pillars ship, 3 daily-driver pillars working, PWA installable, tests green, auto-deployed.

Deferred (out of scope for a free-tier portfolio MVP): a Clerk **production** instance + production webhook — both require a paid custom domain. The Clerk *development* instance runs fine on `*.vercel.app`.

---

## Acknowledgements

Film metadata from [**TMDB**](https://www.themoviedb.org/) (this product uses the TMDB API but is not endorsed or certified by TMDB). Public-domain films via the [**Internet Archive**](https://archive.org/), served through [**Mux**](https://mux.com/). Design language inspired by Apple's Liquid Glass / visionOS material system.

---

<div align="center">
<sub>Built by <a href="mailto:dbtzur@gmail.com">Dor Ben Tzur</a> · a portfolio project</sub>
</div>
