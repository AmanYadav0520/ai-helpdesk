# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repo is an early-stage scaffold for the system described in `PROJECT.md` (an AI-powered ticket management system). `tech-stack.md` records the actual tech decisions (and where they diverge from the original plan), and `IMPLEMENTATION_PLAN.md` tracks phased work. Database (Postgres/Prisma) and authentication (Better Auth) are now wired up — see the Authentication section below; AI integration and email ingestion are still not wired up. Read those three files for product requirements and open questions instead of assuming behavior from the current code.

## Commands

- Install deps: `bun install` (run at repo root; Bun workspaces link `apps/*`)
- Run both apps in dev: `bun run dev` (root script — runs `bun --filter '*' dev`, i.e. web + server concurrently with HMR)
- Run a single app: `bun run dev` inside `apps/web` or `apps/server`
- Build the web app for production: `bun run build` in `apps/web` (runs `vite build`)
- Production start: `bun run start` in either `apps/web` or `apps/server`

There is no lint, typecheck, or test command configured yet in either workspace's `package.json` — don't assume one exists.

## Architecture

- Bun workspace monorepo: `apps/web` (frontend) and `apps/server` (API), each an independent deployable — not a single Next.js app despite what `PROJECT.md` originally scoped (see `tech-stack.md` for the revision note).
- `apps/server`: Express v5 run directly by Bun (no separate compile step). CORS is restricted to the frontend origin via the `WEB_ORIGIN` env var (defaults to `http://localhost:3000`). Runs on port 3001.
- `apps/web`: React 19, bundled/served by Vite (`vite.config.ts`) — matches the course's Vite setup; this replaced an earlier Bun-bundler-only approach. Tailwind is wired in via `@tailwindcss/vite`. Runs on port 3000 (`vite` for dev, `vite build` for production, `vite preview` to serve a build locally).
- The two apps communicate over plain cross-origin HTTP (fetch calls from web to server), not shared routes — there's no proxy between them.
- Client-side env vars must be prefixed `VITE_*` to be inlined into the web bundle, read via `import.meta.env.VITE_*`; the API origin is passed this way as `VITE_API_URL`.
- Session strategy is database-backed sessions (not JWT), specifically so an admin disabling an agent kills that agent's active sessions immediately — this rules out pure-JWT approaches.

## Authentication

Better Auth (`apps/server/src/auth.ts`), backed by Postgres via `prismaAdapter`. See `tech-stack.md` for the decision rationale (why Better Auth over Auth.js, why database sessions).

- **Mounting**: `app.all("/api/auth/*splat", toNodeHandler(auth))` in `apps/server/src/index.ts` — mounted *before* `express.json()`, since Better Auth parses the raw request body itself. Don't add body-parsing middleware ahead of it.
- **Email/password only**, and `disableSignUp: true` — there is no self-registration endpoint. The only account creation path today is `bun run seed` in `apps/server` (`prisma/seed.ts`), which creates a single admin user from `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NAME` env vars (skips if that email already exists). Agent invite/creation by an admin is unbuilt Phase 1 work — don't assume an endpoint for it exists.
- **Role**: `role` is a Better Auth `user.additionalFields` entry (`admin` | `agent`, default `agent`, `input: false` so it can't be set by the client) — mirrored as a Prisma `Role` enum on the `User` model. Read `req.user.role` server-side; never trust a role value from the client.
- **Protecting server routes**: use the `requireAuth` middleware (`apps/server/src/require-auth.ts`) — it calls `auth.api.getSession`, 401s if there's no session, and otherwise attaches `req.user` / `req.session` (typed via `apps/server/src/express.d.ts`). Apply it per-route; nothing is protected by default.
- **Client**: `apps/web/src/lib/auth-client.ts` wraps `better-auth/react`'s `createAuthClient`, pointed at `${VITE_API_URL}/api/auth`; exports `authClient`, `useSession`, `signIn`, `signOut`. `apps/web/src/components/ProtectedRoute.tsx` gates routes on `useSession()`, redirecting to `/login` when there's no session.
- **Required env vars**: server needs `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `WEB_ORIGIN` (also used for CORS + Better Auth's `trustedOrigins`); web needs `VITE_API_URL`. See `apps/server/.env.example`.

## Documentation lookups

Use the context7 MCP tools (`resolve-library-id` / `query-docs`) to pull current docs for the libraries in this stack (Bun, Express, React, Tailwind, Prisma, Better Auth) rather than relying on training data — several of these APIs (Bun's bundler/serve, Express 5, Better Auth) change fast enough that memorized answers are likely stale.
 
 # Project Instructions

This project follows Code with Mosh's architecture and coding style.

Rules:
- Follow Code with Mosh's folder structure.
- Do not refactor existing architecture unless I explicitly ask.
- Prefer consistency with the course over introducing new patterns.
- Suggest improvements only after explaining why they differ from the course.