# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repo is an early-stage scaffold for the system described in `PROJECT.md` (an AI-powered ticket management system). `tech-stack.md` records the actual tech decisions (and where they diverge from the original plan), and `IMPLEMENTATION_PLAN.md` tracks phased work. Only Phase 0 scaffolding exists so far — no database, auth, AI integration, or email ingestion is wired up yet. Read those three files for product requirements and open questions instead of assuming behavior from the current code.

## Commands

- Install deps: `bun install` (run at repo root; Bun workspaces link `apps/*`)
- Run both apps in dev: `bun run dev` (root script — runs `bun --filter '*' dev`, i.e. web + server concurrently with HMR)
- Run a single app: `bun run dev` inside `apps/web` or `apps/server`
- Build the web app for production: `bun run build` in `apps/web` (runs `build.ts`)
- Production start: `bun run start` in either `apps/web` or `apps/server`

There is no lint, typecheck, or test command configured yet in either workspace's `package.json` — don't assume one exists.

## Architecture

- Bun workspace monorepo: `apps/web` (frontend) and `apps/server` (API), each an independent deployable — not a single Next.js app despite what `PROJECT.md` originally scoped (see `tech-stack.md` for the revision note).
- `apps/server`: Express v5 run directly by Bun (no separate compile step). CORS is restricted to the frontend origin via the `WEB_ORIGIN` env var (defaults to `http://localhost:3000`). Runs on port 3001.
- `apps/web`: React 19, bundled/served by Bun's own bundler and dev server (`bun --hot src/index.ts`) — there is no Vite/webpack config. Tailwind is wired in via `bun-plugin-tailwind`, configured in `apps/web/bunfig.toml`. Runs on port 3000.
- The two apps communicate over plain cross-origin HTTP (fetch calls from web to server), not shared routes — there's no proxy between them.
- Client-side env vars must be prefixed `BUN_PUBLIC_*` to be inlined into the web bundle (see `apps/web/bunfig.toml`); the API origin is passed this way as `BUN_PUBLIC_API_URL`.
- Session strategy is decided as database-backed sessions (not JWT), specifically so an admin disabling an agent kills that agent's active sessions immediately — keep this in mind once auth is implemented, since it rules out pure-JWT approaches.

## Documentation lookups

Use the context7 MCP tools (`resolve-library-id` / `query-docs`) to pull current docs for the libraries in this stack (Bun, Express, React, Tailwind, and later Prisma/Auth.js) rather than relying on training data — several of these APIs (Bun's bundler/serve, Express 5) change fast enough that memorized answers are likely stale.
 