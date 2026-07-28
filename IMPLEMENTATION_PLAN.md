# Implementation Plan

Assumptions made where PROJECT.md still has open questions (flagged inline with **[ASSUMPTION]**) — confirm before/during the relevant phase, adjust if wrong.

## Phase 0 — Project Setup

- [ ] Init Next.js + TypeScript + Tailwind project
- [ ] Set up Postgres instance (Neon or Supabase)
- [ ] Install Prisma, connect to DB
- [ ] Define initial Prisma schema: `User`, `Session`, `Account` (Auth.js tables)
- [ ] Configure Vercel project + env vars, connect repo for auto-deploy
- [ ] Set up basic lint/format (ESLint, Prettier)

## Phase 1 — Auth & User Management

- [x] Configure Better Auth with Prisma adapter, **database session strategy** (email/password, public sign-up disabled)
- [x] Add `role` field to `User` (admin / agent)
- [ ] Seed script: create the initial admin account on first deploy
- [ ] Login page + protected route middleware
- [ ] Admin UI: list agents
- [ ] Admin UI: create agent account
- [ ] Admin UI: disable/remove agent account (verify session is killed immediately — this is the point of database sessions)
- [ ] Role-based access checks on all admin-only routes

## Phase 2 — Core Ticketing (no AI, no email yet)

- [ ] Prisma schema: `Ticket` (status: open/resolved/closed, category: general/technical/refund), `Message` (thread entries on a ticket)
- [ ] Seed script with sample tickets for local dev
- [ ] Ticket list view: table with status/category filters + sort (date, status)
- [ ] Ticket detail view: message thread + metadata panel
- [ ] Manual status change (open → resolved → closed)
- [ ] Manual category change
- [ ] Shared queue behavior: any agent can open/work any ticket (no assignment field needed per current scope)

## Phase 3 — Email Ingestion

- [ ] Set up inbound email provider (Postmark or SendGrid inbound parse)
- [ ] Webhook endpoint: parse inbound email → create `Ticket` + first `Message`
- [ ] Map sender email → requester identity (create lightweight requester record if new)
- [ ] **[ASSUMPTION]** Threading: match replies to existing ticket via a reference ID in the subject/headers, append as new `Message` on that ticket rather than creating a duplicate
- [ ] Outbound send: agent (or AI) reply in the UI triggers an actual email out via the provider
- [ ] Handle provider delivery failures (log + surface in UI, no silent drops)

## Phase 4 — Knowledge Base

- [ ] Prisma schema: `KBArticle` (title, body, category tag)
- [ ] **[ASSUMPTION]** Authoring open to both admin and agents (confirm — PROJECT.md flags this as open)
- [ ] KB list + search UI
- [ ] KB article create/edit/delete UI

## Phase 5 — AI Classification & Summarization

- [x] ~~Integrate Anthropic API client~~ Integrate OpenAI API client (matches the course reference repo's actual implementation, not the originally-planned Anthropic client — see `tech-stack.md`'s AI section)
- [x] Classification call: plain-text category output, validated against the three category values, run on ticket creation (non-blocking, via `@ai-sdk/openai`/`gpt-5-nano`, matching the course's `server/src/lib/classify-ticket.ts`)
- [x] Background job queue: classification runs on `pg-boss` (Postgres-backed), enqueued via `sendClassifyJob` from the webhook and processed by a worker in `apps/server/src/lib/queue.ts` — matches the course's follow-up lesson (`server/src/lib/queue.ts`, commit `4d65778`, "Process background jobs with pg-boss")
- [ ] Store category + **[ASSUMPTION]** a confidence score on the ticket
- [ ] Summary generation: short summary shown in ticket list/detail
- [ ] **[ASSUMPTION]** Low-confidence fallback: default to "General" category and flag the ticket for manual review rather than guessing silently
- [ ] Manual override: agent can always recategorize regardless of AI output

## Phase 6 — AI-Suggested Replies

- [ ] Retrieve relevant KB articles for a ticket (simple keyword/category match to start, not full RAG)
- [ ] Generate a draft reply grounded in retrieved KB content
- [ ] **[ASSUMPTION]** Default flow is human-in-the-loop: draft appears in the ticket detail view, agent edits and clicks send — no autonomous auto-send in v1
- [ ] Send action wired to outbound email (Phase 3 plumbing)
- [ ] Regenerate-draft action if agent rejects the first draft

## Phase 7 — Dashboard

- [ ] Aggregate view: ticket counts by status and category
- [ ] Volume-over-time chart (tickets received/resolved per day)
- [ ] Filter dashboard by date range

## Phase 8 — Polish & Hardening

- [ ] Empty/loading/error states across all views
- [ ] Access-control edge cases (agent hitting admin routes directly, expired session handling)
- [ ] Tests for critical paths: auth, ticket creation from email, AI classification, reply send
- [ ] Basic rate-limiting / abuse handling on the inbound email webhook
- [ ] Pre-launch checklist (env vars, backups, monitoring/logging for AI + email failures)

## Sequencing Notes

- Phases 0–2 are the foundation and have no open questions blocking them — safe to start immediately.
- Phase 3 (email) and Phase 6 (AI replies) both depend on assumptions flagged above; worth confirming those before writing code for them, not just before shipping.
- Phase 5 and 6 depend on Phase 4 (KB) having at least a few real articles in it to be testable.
