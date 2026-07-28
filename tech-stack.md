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
- **Revised**: the reply-polish feature (`POST /api/replies/polish`, "Polish" button on the ticket detail reply form), the ticket-summary feature (`POST /api/tickets/:id/summarize`, "Summarize" button on the ticket detail page), and ticket classification (`apps/server/src/lib/queue.ts`) all use the [Vercel AI SDK](https://ai-sdk.dev) (`ai` + `@ai-sdk/openai`) with OpenAI's `gpt-5-nano` instead of Claude — confirmed against the course's own reference implementation (`github.com/mosh-hamedani/helpdesk`), which uses `gpt-5-nano` for classification too (plain-text category output, not structured/tool-based). Suggested replies (not yet built) remain unconfirmed against the reference repo
- Ticket classification runs as a `pg-boss` background job (Postgres-backed queue, reusing `DATABASE_URL`), not a fire-and-forget in-process async call — matches the course's own progression (`server/src/lib/queue.ts`), confirmed via commit history (`4d65778`, "Process background jobs with pg-boss", the commit immediately following the original plain-text classification lesson). Reply-polish and summarization stay synchronous request/response calls; only classification was moved to the queue, matching the course at this stage

## Email Ingestion
- Postmark or SendGrid inbound parse — inbound webhook creates a ticket

## Hosting
- Vercel (app)
- Neon or Supabase (managed Postgres)

## Open Questions
- Confirm inbound email provider (Postmark vs SendGrid) based on pricing/existing accounts
- Confirm whether KB articles are a separate authored table or generated/derived (see PROJECT.md Open Questions)
- Production build/deploy story for `apps/server` and `apps/web` as two separate deployables (was one deployable under the Next.js plan) — affects hosting choice below
