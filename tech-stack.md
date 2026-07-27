# Tech Stack

> **Revised**: originally scoped as a Next.js monolith (single deployable). Actual direction is a separate Express API + React frontend, both on Bun. Update this note if that changes again.

## Runtime & Package Manager
- Bun (runtime, package manager, bundler, dev server)
- Monorepo via Bun workspaces: `apps/web` (frontend), `apps/server` (API)
- `bun run dev` at the root runs both apps concurrently (`bun --filter '*' dev`)

## Frontend — `apps/web`
- React + TypeScript
- **Revised**: originally bundled/served by Bun's built-in bundler/dev server; switched to Vite (`vite.config.ts`) to match the course setup — `vite`/`vite build`/`vite preview`, HMR via Vite's own client
- Tailwind CSS via `@tailwindcss/vite`
- Client-side env vars must be prefixed `VITE_*` to be exposed, read via `import.meta.env.VITE_*` — e.g. `VITE_API_URL` for the API origin

## Backend — `apps/server`
- Express (v5) + TypeScript, run directly by Bun (`bun --hot src/index.ts`) — no separate build/compile step
- `cors` middleware scoped to the web app's origin (`WEB_ORIGIN` env var, defaults to `http://localhost:3000`)
- Runs on a separate port (3001) from the frontend (3000) — cross-origin, not same-app routes

## Database
- PostgreSQL
- Prisma ORM
- **Not yet wired up in the scaffold** — server currently has no DB connection

## Authentication
- **Revised**: Auth.js was originally scoped but assumes Next.js/a handful of supported frameworks, which doesn't fit the standalone Express API. Switched to [Better Auth](https://better-auth.com) — framework-agnostic, integrates directly with Express (`better-auth/node`'s `toNodeHandler`) and the existing Prisma client via `better-auth/adapters/prisma`
- Email/password auth only for now (`emailAndPassword.enabled: true`), with `disableSignUp: true` — PROJECT.md specifies a single admin account that creates agents, not open self-registration; the bootstrap admin / agent-invite flow is Phase 1 user-management work
- **Session strategy: database sessions** (not JWT) — Better Auth stores sessions in the `Session` table by default (no `secondaryStorage` configured), which satisfies this without extra config
  - Enables server-side session revocation (e.g. admin disables an agent and their active sessions die immediately) and avoids stale-claims issues from long-lived JWTs
  - Role (admin/agent) is a `role` additional field on the Better Auth `User` model (default `"agent"`, not user-settable via `input: false`), read from the `User` record on each request, not embedded in a token

## AI
- Anthropic API (Claude)
- Structured/tool-based output for ticket classification (constrained to: General, Technical Question, Refund Request)
- Used for: classification, ticket summaries, suggested/auto-generated replies
- **Revised (partial)**: the reply-polish feature (`POST /api/replies/polish`, "Polish" button on the ticket detail reply form) uses the [Vercel AI SDK](https://ai-sdk.dev) (`ai` + `@ai-sdk/openai`) with OpenAI's `gpt-5.2` instead of Claude — a deliberate one-off choice for this feature, not a switch away from Anthropic for classification/summaries/suggested replies above

## Email Ingestion
- Postmark or SendGrid inbound parse — inbound webhook creates a ticket

## Hosting
- Vercel (app)
- Neon or Supabase (managed Postgres)

## Open Questions
- Confirm inbound email provider (Postmark vs SendGrid) based on pricing/existing accounts
- Confirm whether KB articles are a separate authored table or generated/derived (see PROJECT.md Open Questions)
- Production build/deploy story for `apps/server` and `apps/web` as two separate deployables (was one deployable under the Next.js plan) — affects hosting choice below
