# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Instructions

This project follows Code with Mosh's architecture and coding style.

- Follow Code with Mosh's folder structure.
- Don't refactor existing architecture unless explicitly asked.
- Prefer consistency with the course over new patterns.
- Explain how a suggestion differs from the course before proposing it.
- Use the `e2e-test-writer` subagent to write or update Playwright E2E tests.

## Project Status

Early-stage scaffold for the AI-powered ticket management system described in `PROJECT.md`. See `tech-stack.md` for tech decisions (and deviations from the original plan) and `IMPLEMENTATION_PLAN.md` for phased work.

- Built: database (Postgres/Prisma) and [authentication](#authentication) (Better Auth)
- Not built yet: AI integration, email ingestion

Check those three files for requirements — don't assume behavior from the code alone.

## Commands

- Install deps: `bun install` (repo root)
- Dev, both apps: `bun run dev`
- Dev, single app: `bun run dev` in `apps/web` or `apps/server`
- Build web app: `bun run build` in `apps/web`
- Production start: `bun run start` in `apps/web` or `apps/server`
- E2E tests: `bun run test:e2e` (also `test:e2e:ui`, `test:e2e:headed`) — see `e2e-test-writer` agent for details

No lint or typecheck command exists yet — don't assume one does.

## Architecture

Bun workspace monorepo with two independently deployable apps — not a single Next.js app (see `tech-stack.md` for the revision note).

- **`apps/server`** — Express v5 run directly by Bun, port 3001. CORS restricted to `WEB_ORIGIN` (default `http://localhost:3000`).
- **`apps/web`** — React 19 + Vite, port 3000. Tailwind via `@tailwindcss/vite`.
- The apps talk over plain cross-origin HTTP — no shared routes, no proxy.
- Client env vars need a `VITE_*` prefix (e.g. `VITE_API_URL`) to be exposed via `import.meta.env`.
- Sessions are database-backed, not JWT, so an admin can instantly revoke an agent's active sessions.

## Data Fetching

- Use axios through `apps/web/src/lib/api.ts`; don't create per-component axios instances.
- Use TanStack Query (`useQuery`/`useMutation`) for server state instead of `useEffect` + manual fetching.

## Authentication

Better Auth (`apps/server/src/auth.ts`), backed by Postgres via `prismaAdapter`. See `tech-stack.md` for rationale (why Better Auth, why database sessions).

- **Mounting**: `app.all("/api/auth/*splat", toNodeHandler(auth))` runs *before* `express.json()`, since Better Auth parses its own request body. Don't add body-parsing middleware ahead of it.

- **Sign-up**: email/password only, `disableSignUp: true` — no self-registration. The only account-creation path is `bun run seed` (`apps/server/prisma/seed.ts`), which creates one admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NAME` (skips if that email exists). Admin-driven agent invites aren't built yet.

- **Role**: `admin` | `agent` (default `agent`), defined via Better Auth's `additionalFields` (`input: false`, so clients can't set it) and mirrored as a Prisma `Role` enum. Trust `req.user.role` server-side only — never the client.

- **Protecting routes**: use the `requireAuth` middleware (`apps/server/src/require-auth.ts`) — 401s without a session, otherwise attaches `req.user`/`req.session`. Applied per-route; nothing is protected by default.

- **Client**: `apps/web/src/lib/auth-client.ts` wraps `better-auth/react` (`authClient`, `useSession`, `signIn`, `signOut`). `ProtectedRoute.tsx` redirects to `/login` when there's no session.

- **Env vars**: server needs `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `WEB_ORIGIN`; web needs `VITE_API_URL`. See `apps/server/.env.example`.

## Documentation Lookups

Use the context7 MCP tools (`resolve-library-id` / `query-docs`) for current docs on this stack (Bun, Express, React, Tailwind, Prisma, Better Auth) rather than relying on training data — these APIs change fast enough that memorized answers are likely stale.
