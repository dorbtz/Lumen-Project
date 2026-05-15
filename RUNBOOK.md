# Lumen — Week 1 runbook

> Owner: Dor (dbtzur@gmail.com). Spec: `SPEC.md` (locked v1.0).
> This runbook covers the **one-time setup** needed to take Week 1 from scaffolded code → running dev server.

## 0. TLS prefix (critical, every Node command)

Corporate/AV cert chain on this Windows machine breaks Node's default CA store.
**Every** Node-based CLI invocation must be prefixed:

```bash
NODE_OPTIONS=--use-system-ca <command>
```

Without it: `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Non-negotiable.

---

## 1. Install dependencies

From `D:\High-Tech\04_Movies Project\`:

```bash
NODE_OPTIONS=--use-system-ca npm install
```

This installs Next.js 16, Drizzle, Clerk, Mux player, Framer Motion, R3F + drei,
`node-vibrant`, Vercel Analytics, PostHog, Biome, Zod, RHF, and TypeScript tooling.

> No ESLint/Prettier — replaced by Biome per spec §12.

---

## 2. Link project to Vercel

```bash
NODE_OPTIONS=--use-system-ca vercel link
```

When prompted:
- **Set up new project**: yes
- **Project name**: `lumen`
- **Directory**: `.`
- **Modify settings**: no

> User is already logged in as `dorbtz`.

---

## 3. Provision Marketplace integrations

Open Vercel dashboard → your `lumen` project → **Storage** / **Integrations**.

Provision the following (each opens its own modal/browser flow):

| Service | What to pick | Notes |
|---|---|---|
| **Neon Postgres** | Free tier; region `iad1` or closest | Marketplace one-click |
| **Upstash Redis** (or "Vercel KV") | Free tier; same region as Neon | Marketplace one-click |
| **Clerk** | Free tier dev instance | Marketplace one-click |
| **Mux** | Free dev plan | Marketplace one-click |

After each provisioning completes, Vercel auto-injects env vars into the project.

**Browser URL pattern**: `https://vercel.com/<team>/lumen/integrations`

---

## 4. Pull env vars locally

```bash
NODE_OPTIONS=--use-system-ca vercel env pull .env.local
```

This should populate everything in `.env.example` that came from Marketplace integrations.

### Vars Marketplace will NOT auto-fill (manual):

| Var | Where to get it |
|---|---|
| `TMDB_API_KEY` + `TMDB_API_READ_ACCESS_TOKEN` | https://www.themoviedb.org/settings/api |
| `HF_API_TOKEN` | https://huggingface.co/settings/tokens (read scope) |
| `NEXT_PUBLIC_POSTHOG_KEY` | https://app.posthog.com → Project Settings → Project API key |
| `LUMEN_PROFILE_COOKIE_SECRET` | Generate: `openssl rand -hex 32` |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Clerk dashboard → Webhooks → create endpoint `https://<your-domain>/api/webhooks/clerk` → copy the signing secret |

Add these manually to `.env.local`.

---

## 5. Database migrations

Order matters — pgvector must exist before the schema migration runs.

```bash
# 5a. Bootstrap pgvector
NODE_OPTIONS=--use-system-ca psql "$DATABASE_URL" -f drizzle/0000_init_pgvector.sql

# 5b. Generate the structural migration from schema.ts
NODE_OPTIONS=--use-system-ca npm run db:generate

# 5c. Apply migrations
NODE_OPTIONS=--use-system-ca npm run db:migrate

# 5d. ivfflat indexes (after data exists is ideal, but creating empty is fine)
NODE_OPTIONS=--use-system-ca psql "$DATABASE_URL" -f drizzle/0002_ivfflat_indexes.sql
```

If `psql` isn't available locally, use Neon's SQL editor in the dashboard for steps 5a and 5d.

---

## 6. Clerk webhook setup

In Clerk dashboard:
1. **Webhooks** → **+ Endpoint**
2. URL: `https://<your-vercel-url>/api/webhooks/clerk` (or use `vercel dev` tunnel for local)
3. Subscribe to: `user.created`, `user.deleted`
4. Copy the signing secret → `CLERK_WEBHOOK_SIGNING_SECRET` in `.env.local` and Vercel env

---

## 7. Smoke test

```bash
NODE_OPTIONS=--use-system-ca npm run dev
```

Verify:
1. `http://localhost:3000` renders the landing page with **three glass cards** visible.
2. Top chrome nav uses the **chrome material** (blurred, translucent).
3. `Sign in` button routes to `/sign-in` with Clerk's themed form.
4. After sign-up: webhook fires → DB has 1 `accounts` row + 1 `profiles` row.
5. `/profiles` shows the "Who's watching?" picker with the default profile.
6. Selecting a profile sets the cookie and lands at `/home`.

---

## 8. Catalog seed (DO NOT run yet)

Once `TMDB_API_KEY` is in `.env.local` AND Dor confirms:

```bash
NODE_OPTIONS=--use-system-ca npm run seed:catalog
```

Budget: ~15 minutes for 20k titles + palette extraction. Costs $0 (TMDB free, palette is local).

---

## 9. What's NOT in Week 1 (don't try to test these)

- Mood Dial, Why Card, Echo Journal, Recap, Cinema Weather, Time-Box → Weeks 2–4
- HF embeddings (cost guardrail — wired but not called)
- CC0 catalog Mux upload (Week 4)
- PWA install prompt (Week 4)
- Performance / Lighthouse pass (Week 4)
