# Tech Stack

> **Revised**: originally scoped as a Next.js monolith (single deployable). Actual direction is a separate Express API + React frontend, both on Bun. Update this note if that changes again.

## Runtime & Package Manager
- Bun (runtime, package manager, bundler, dev server)
- Monorepo via Bun workspaces: `apps/web` (frontend), `apps/server` (API)
- `bun run dev` at the root runs both apps concurrently (`bun --filter '*' dev`)

## Frontend — `apps/web`
- React + TypeScript
- Bundled and served by Bun's built-in bundler/dev server (no Vite/webpack) — `bun --hot src/index.ts`, HMR enabled
- Tailwind CSS via `bun-plugin-tailwind`
- Client-side env vars must be prefixed `BUN_PUBLIC_*` (configured in `apps/web/bunfig.toml`) to be inlined into the bundle — e.g. `BUN_PUBLIC_API_URL` for the API origin

## Backend — `apps/server`
- Express (v5) + TypeScript, run directly by Bun (`bun --hot src/index.ts`) — no separate build/compile step
- `cors` middleware scoped to the web app's origin (`WEB_ORIGIN` env var, defaults to `http://localhost:3000`)
- Runs on a separate port (3001) from the frontend (3000) — cross-origin, not same-app routes

## Database
- PostgreSQL
- Prisma ORM
- **Not yet wired up in the scaffold** — server currently has no DB connection

## Authentication
- Auth.js (NextAuth) — **not yet wired up**; needs re-evaluation since Auth.js is designed around Next.js. With a standalone Express API, either front the API with Next.js just for auth, or use a framework-agnostic session approach (e.g. `express-session` + a Postgres session store) to keep the database-session requirement
- **Session strategy: database sessions** (not JWT) — still the requirement regardless of library
  - Enables server-side session revocation (e.g. admin disables an agent and their active sessions die immediately) and avoids stale-claims issues from long-lived JWTs
  - Role (admin/agent) read from the `User` record on each request, not embedded in a token

## AI
- Anthropic API (Claude)
- Structured/tool-based output for ticket classification (constrained to: General, Technical Question, Refund Request)
- Used for: classification, ticket summaries, suggested/auto-generated replies

## Email Ingestion
- Postmark or SendGrid inbound parse — inbound webhook creates a ticket

## Hosting
- Vercel (app)
- Neon or Supabase (managed Postgres)

## Open Questions
- Confirm inbound email provider (Postmark vs SendGrid) based on pricing/existing accounts
- Confirm whether KB articles are a separate authored table or generated/derived (see PROJECT.md Open Questions)
- **Auth library**: Auth.js assumes Next.js/a handful of supported frameworks. With Express as the API, decide between `express-session` + `connect-pg-simple` (or similar Postgres store) vs. another approach — needs a decision before Phase 1 of the implementation plan
- Production build/deploy story for `apps/server` and `apps/web` as two separate deployables (was one deployable under the Next.js plan) — affects hosting choice below
