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
- Component tests: `bun run test` in `apps/web` (single run), `test:watch` (watch mode while writing tests), `test:ui` (Vitest UI) — see [Component Tests](#component-tests)

No lint or typecheck command exists yet — don't assume one does.

## Architecture

Bun workspace monorepo with two independently deployable apps plus a shared `core` package — not a single Next.js app (see `tech-stack.md` for the revision note).

- **`core`** (top-level, sibling of `apps/`, matching the course's own layout) — no direct dependencies of its own, just a `zod` peer dependency; holds code shared between `apps/web` and `apps/server` (currently: `core/schemas/`, see [Validation](#validation)). Not deployed on its own; both apps depend on it via `"core": "workspace:*"`.
- **`apps/server`** — Express v5 run directly by Bun, port 3001. CORS restricted to `WEB_ORIGIN` (default `http://localhost:3000`).
- Express 5 automatically forwards rejected promises from `async` route handlers to the error-handling middleware — don't wrap route bodies in `try`/`catch` just to catch-and-rethrow (see `POST /api/users` in `apps/server/src/routes/users.ts`). Only reach for `try`/`catch` in a handler when you need to do something with the error yourself (map it to a specific response, log it, etc.) — e.g. `GET /api/health` catches to return a deliberate `503` body instead of the default error response.
- Route modules live under `apps/server/src/routes/` (e.g. `routes/users.ts`), each exporting a default `Router()` mounted in `index.ts` via `app.use("/api/<name>", router)` — `requireAuth`/`requireAdmin` stay in their existing flat locations, not moved into a `middleware/` subfolder.
- **`apps/web`** — React 19 + Vite, port 3000. Tailwind via `@tailwindcss/vite`.
- The apps talk over plain cross-origin HTTP — no shared routes, no proxy.
- Client env vars need a `VITE_*` prefix (e.g. `VITE_API_URL`) to be exposed via `import.meta.env`.
- Sessions are database-backed, not JWT, so an admin can instantly revoke an agent's active sessions.

## Data Fetching

- Use axios through `apps/web/src/lib/api.ts`; don't create per-component axios instances.
- Use TanStack Query (`useQuery`/`useMutation`) for server state instead of `useEffect` + manual fetching.
- **Table components own their query**: a resource table (e.g. `apps/web/src/pages/UsersTable.tsx`) calls its own `useQuery` internally rather than receiving `data`/`isPending` as props from its page — the page (`Users.tsx`) just renders `<UsersTable />` with no data-fetching logic of its own. Matches the course's `UsersTable`/`UsersPage` split. Loading-skeleton rows and the fetch-error `Alert` live inside the table component too, for the same reason.

## Validation

Use zod for data validation, both client and server side — don't hand-roll validation logic.

- **Shared schemas**: any schema needed by both `apps/web` and `apps/server` (e.g. create/update payloads for a resource) belongs in the `core` workspace, not duplicated in each app. Define it under `core/schemas/<resource>.ts` (zod v4 syntax, e.g. `z.email(...)`) and export both the schema and its inferred type (`z.infer<typeof schema>`) — see `core/schemas/users.ts`. Import it with a bare `core/schemas/<resource>` specifier (mapped via `core/package.json`'s `exports` field — subpaths there include an explicit `.ts` extension so `tsc`'s exports resolution finds the file; Bun/Vite resolve it either way). Both `apps/web` and `apps/server` depend on `core` via `"core": "workspace:*"` and on `zod` directly (`^4`, satisfying `core`'s `zod` peer dependency) — one zod major version across the whole repo, no more per-app version split. A schema used by only one side (e.g. `Login.tsx`'s sign-in form, which Better Auth handles, not a shared resource payload) stays local to that app — don't move something into `core` just because it uses zod.
- **Client**: React Hook Form is the form library — wire the (often `core`-provided) schema to the form via `@hookform/resolvers`' `zodResolver`, and render fields with `Controller` (not `register`), matching the `Field`/`FieldLabel`/`FieldError` shadcn pattern (see `apps/web/src/pages/Login.tsx`, `apps/web/src/pages/CreateUserForm.tsx`).
- **Form vs. dialog split**: when a form is shown in a modal, keep the `<form>` itself (fields, `useForm`, the mutation, an `onSuccess` callback prop) in its own component, separate from the `Dialog`/`DialogTrigger`/`DialogContent` chrome that owns the open/close state — see `apps/web/src/pages/CreateUserForm.tsx` (form) vs. `CreateUserDialog.tsx` (dialog wrapper, calls `setOpen(false)` from `onSuccess`). Relies on Radix `Dialog.Content` unmounting when closed (no `forceMount` used anywhere in this repo) to reset the form's internal state between opens — don't add manual `reset()` calls to work around a problem that doesn't exist.
- **Naming note**: the course names this component `CreateUserForm.tsx` at this stage (create-only) and only renames it to the generic `UserForm.tsx` in a later lesson, once it's reused for both create and edit (taking an optional `user` prop). Don't rename ours to `UserForm.tsx` preemptively — that's follow-on work for whenever edit-user support is actually requested, not something to do speculatively now.
- **Server**: `schema.safeParse(req.body)` in the route handler, `400` with the first issue's message on failure (see `POST /api/users` in `apps/server/src/routes/users.ts`).

## Component Tests

Vitest + React Testing Library, scoped to `apps/web` — this is not part of the course (the reference repo has no component-testing setup at all), added on top of it.

- Config lives in `apps/web/vite.config.ts` (`test` block: jsdom environment, globals, setup file), setup file at `apps/web/src/test/setup.ts` (jest-dom matchers).
- Colocate tests next to the component: `Component.tsx` → `Component.test.tsx`.
- Wrap components that use TanStack Query with `renderWithQuery` from `apps/web/src/test/render-with-query.tsx` instead of reaching for `QueryClientProvider` directly in each test.
- Mock the shared axios client (`vi.mock("../lib/api")`) rather than mocking `axios` itself or hitting the real API.
- Run with `bun run test` (single run), `test:watch` (watch mode), or `test:ui` (Vitest UI), all from `apps/web`.

## Authentication

Better Auth (`apps/server/src/auth.ts`), backed by Postgres via `prismaAdapter`. See `tech-stack.md` for rationale (why Better Auth, why database sessions).

- **Mounting**: `app.all("/api/auth/*splat", toNodeHandler(auth))` runs *before* `express.json()`, since Better Auth parses its own request body. Don't add body-parsing middleware ahead of it.

- **Sign-up**: email/password only, `disableSignUp: true` — no self-registration through Better Auth. The bootstrap admin comes from `bun run seed` (`apps/server/prisma/seed.ts`), which creates one admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NAME` (skips if that email exists). Beyond that, an admin creates agent accounts directly via `POST /api/users` (`apps/server/src/routes/users.ts`), which writes the `User`/`Account` rows itself rather than going through Better Auth's (disabled) sign-up flow.

- **Role**: `admin` | `agent` (default `agent`), defined via Better Auth's `additionalFields` (`input: false`, so clients can't set it) and mirrored as a Prisma `Role` enum. Trust `req.user.role` server-side only — never the client. Server-side code that sets or compares a role value should use the generated `Role` enum (`apps/server/src/generated/prisma/enums`, e.g. `Role.agent`), not a string literal — see `POST /api/users` in `apps/server/src/routes/users.ts`, which hardcodes new users to `Role.agent` (the client can't request a role). The one exception is `apps/server/src/auth.ts`'s Better Auth config, where `additionalFields` takes plain strings because that's Better Auth's own API surface. The web app has no access to the Prisma enum, so it uses a `"admin" | "agent"` string union type instead — unlike zod schemas, the `Role` enum itself isn't (yet) hoisted into `core` (the course has a `core/constants/role.ts` for this; not done here since it wasn't requested).

- **Protecting routes**: use the `requireAuth` middleware (`apps/server/src/require-auth.ts`) — 401s without a session, otherwise attaches `req.user`/`req.session`. Applied per-route; nothing is protected by default.

- **Client**: `apps/web/src/lib/auth-client.ts` wraps `better-auth/react` (`authClient`, `useSession`, `signIn`, `signOut`). `ProtectedRoute.tsx` redirects to `/login` when there's no session.

- **Env vars**: server needs `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `WEB_ORIGIN`; web needs `VITE_API_URL`. See `apps/server/.env.example`.

## Documentation Lookups

Use the context7 MCP tools (`resolve-library-id` / `query-docs`) for current docs on this stack (Bun, Express, React, Tailwind, Prisma, Better Auth) rather than relying on training data — these APIs change fast enough that memorized answers are likely stale.
