import { randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { Role } from "../../core/constants/role";
import { API_URL, testDb } from "./db";

// e2e/fixtures/db.ts loads apps/server/.env.test via dotenv as an import
// side effect, so WEBHOOK_SECRET is on process.env by the time this file's
// top-level code below runs.
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) {
  throw new Error(
    "WEBHOOK_SECRET is not set — expected it to come from apps/server/.env.test"
  );
}

/**
 * Returns a collision-resistant subject, safe to use concurrently across
 * parallel tests/spec files against a DB that's only reset once per run.
 * The inbound-email webhook and the tickets list "search" filter both do
 * substring matches, so a unique subject also doubles as a way to isolate
 * a single row in the UI amid tickets created by other parallel tests.
 */
export function uniqueSubject(): string {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `Test Ticket ${unique}`;
}

/** Returns a collision-resistant sender email for webhook/ticket fixtures. */
export function uniqueSenderEmail(): string {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `sender-${unique}@example.com`;
}

/**
 * POSTs a multipart/form-data payload to the inbound-email webhook, the same
 * shape a real email-parsing provider (e.g. SendGrid) would send. Requires
 * the `x-webhook-secret` header — see requireWebhookSecret middleware.
 */
export async function postInboundEmail(
  request: APIRequestContext,
  fields: { from: string; to?: string; subject: string; text: string }
) {
  return request.post(`${API_URL}/api/webhooks/inbound-email`, {
    headers: { "x-webhook-secret": WEBHOOK_SECRET! },
    multipart: {
      from: fields.from,
      to: fields.to ?? "support@example.com",
      subject: fields.subject,
      text: fields.text,
    },
  });
}

/**
 * Like postInboundEmail, but lets the caller control (or omit entirely) the
 * x-webhook-secret header — for tests exercising requireWebhookSecret's
 * failure paths (missing/incorrect secret) rather than the happy path,
 * which always goes through postInboundEmail above.
 */
export async function postInboundEmailWithHeader(
  request: APIRequestContext,
  secretHeaderValue: string | undefined,
  fields: { from: string; to?: string; subject: string; text: string }
) {
  const headers: Record<string, string> =
    secretHeaderValue === undefined ? {} : { "x-webhook-secret": secretHeaderValue };

  return request.post(`${API_URL}/api/webhooks/inbound-email`, {
    headers,
    multipart: {
      from: fields.from,
      to: fields.to ?? "support@example.com",
      subject: fields.subject,
      text: fields.text,
    },
  });
}

/**
 * Creates a ticket directly in the DB, bypassing both the webhook and the
 * UI, for tests that need a pre-existing ticket but aren't testing ticket
 * creation itself (e.g. detail view, updates, replies).
 */
export async function createTicketDirectly(
  overrides: Partial<{
    subject: string;
    body: string;
    senderName: string;
    senderEmail: string;
  }> = {}
) {
  return testDb.ticket.create({
    data: {
      subject: overrides.subject ?? uniqueSubject(),
      body: overrides.body ?? "This is a test ticket body, created directly via testDb.",
      senderName: overrides.senderName ?? "Test Sender",
      senderEmail: overrides.senderEmail ?? uniqueSenderEmail(),
    },
  });
}

/**
 * Creates an agent-role user directly in the DB (no Account/login needed)
 * so UpdateTicket's "Assigned To" dropdown — populated from GET /api/agents,
 * which only lists Role.agent users — has an option to select in tests. No
 * agent is seeded by prisma/seed.ts today, so tests that exercise assignment
 * need to create their own.
 */
export async function createAgentDirectly(name?: string) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return testDb.user.create({
    data: {
      id: randomUUID(),
      name: name ?? `Test Agent ${unique}`,
      email: `agent-${unique}@example.com`,
      role: Role.agent,
      emailVerified: true,
    },
  });
}
