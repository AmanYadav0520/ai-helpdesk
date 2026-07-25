import { test, expect, type APIRequestContext } from "@playwright/test";
import { postInboundEmail, postInboundEmailWithHeader, uniqueSubject, uniqueSenderEmail } from "../fixtures/tickets";
import { API_URL, testDb } from "../fixtures/db";
import { TEST_USERS, loginAsAdmin } from "../fixtures/auth";
import { uniqueTestUser } from "../fixtures/users";

// UI-level coverage for the tickets list/detail pages (rendering, filtering,
// status/category/assignee updates, reply submission) now lives in
// component tests colocated with each component (apps/web/src/pages and
// apps/web/src/components — TicketsTable.test.tsx, TicketDetail.test.tsx,
// UpdateTicket.test.tsx, ReplyThread.test.tsx, ReplyForm.test.tsx). What's
// left here is what those tests can't reach: the actual webhook -> DB
// creation/threading behavior and its auth/validation failure paths.
test.describe("Inbound Email Webhook", () => {
  test("creates a ticket from an inbound email", async ({ request }) => {
    const subject = uniqueSubject();
    const senderEmail = uniqueSenderEmail();

    const res = await postInboundEmail(request, {
      from: `Jane Doe <${senderEmail}>`,
      subject,
      text: "I need help with my account.",
    });

    expect(res.status()).toBe(201);
    const { ticket } = await res.json();
    expect(ticket.subject).toBe(subject);
    expect(ticket.senderName).toBe("Jane Doe");
    expect(ticket.senderEmail).toBe(senderEmail);
    expect(ticket.status).toBe("open");
    expect(ticket.category).toBeNull();
    expect(ticket.assignedToId).toBeNull();
  });

  test("a threaded follow-up email does not create a second ticket", async ({ request }) => {
    const subject = uniqueSubject();
    const senderEmail = uniqueSenderEmail();
    const from = `John Smith <${senderEmail}>`;

    const first = await postInboundEmail(request, {
      from,
      subject,
      text: "Initial message.",
    });
    expect(first.status()).toBe(201);
    const { ticket: firstTicket } = await first.json();

    // Same sender + "Re: <subject>" (case-insensitive after stripping the
    // Re:/Fwd: prefix) should thread onto the existing ticket instead of
    // creating a new one.
    const second = await postInboundEmail(request, {
      from,
      subject: `re: ${subject.toUpperCase()}`,
      text: "Following up on this.",
    });
    expect(second.status()).toBe(200);
    const { ticket: secondTicket } = await second.json();
    expect(secondTicket.id).toBe(firstTicket.id);
  });
});

// Pure API-level tests against requireWebhookSecret and inboundEmailSchema's
// failure paths.
test.describe("Inbound Email Webhook Failure Paths", () => {
  test("returns 401 with a missing x-webhook-secret header", async ({ request }) => {
    const res = await postInboundEmailWithHeader(request, undefined, {
      from: `Jane Doe <${uniqueSenderEmail()}>`,
      subject: uniqueSubject(),
      text: "I need help with my account.",
    });

    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid webhook secret" });
  });

  test("returns 401 with an incorrect x-webhook-secret header", async ({ request }) => {
    const res = await postInboundEmailWithHeader(request, "not-the-real-secret", {
      from: `Jane Doe <${uniqueSenderEmail()}>`,
      subject: uniqueSubject(),
      text: "I need help with my account.",
    });

    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid webhook secret" });
  });

  test("returns 400 and creates no ticket when the subject is empty", async ({ request }) => {
    const senderEmail = uniqueSenderEmail();

    const res = await postInboundEmail(request, {
      from: `Jane Doe <${senderEmail}>`,
      subject: "",
      text: "I need help with my account.",
    });

    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: "Subject is required" });

    // Confirm validation failure short-circuits before any DB write, not
    // just that the response looks right.
    const tickets = await testDb.ticket.findMany({ where: { senderEmail } });
    expect(tickets).toHaveLength(0);
  });
});

/**
 * Coverage for PATCH /api/tickets/:id's assignedToId validation (routes/tickets.ts
 * lines ~78-84): a truthy assignedToId is only accepted if it resolves to a User
 * that exists, has role === Role.agent, and has deletedAt === null. This is DB-backed
 * logic that apps/web/src/components/UpdateTicket.test.tsx can't reach (it mocks the
 * API client entirely) — per CLAUDE.md's testing strategy, real backend/DB behavior
 * like this belongs here, not in a component test.
 *
 * PATCH requires an authenticated session (requireAuth), so these use page.request
 * rather than the bare `request` fixture used by the webhook tests above — page.request
 * shares the browser context's cookies, so it rides the session cookie set by
 * loginAsAdmin. POST /api/users (used to create a fresh agent to assign) is also
 * requireAdmin-protected, so the same authenticated page.request is reused for that.
 */
test.describe("Ticket Assignment Validation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  /** Creates a fresh ticket via the (unauthenticated, secret-header-gated) inbound-email webhook. */
  async function createTicket(request: APIRequestContext) {
    const res = await postInboundEmail(request, {
      from: `Jane Doe <${uniqueSenderEmail()}>`,
      subject: uniqueSubject(),
      text: "I need help with my account.",
    });
    expect(res.status()).toBe(201);
    const { ticket } = await res.json();
    return ticket as { id: number };
  }

  test("rejects assignment to an assignedToId that has no matching user", async ({
    page,
    request,
  }) => {
    const ticket = await createTicket(request);

    const res = await page.request.patch(`${API_URL}/api/tickets/${ticket.id}`, {
      data: { assignedToId: "no-such-user-id" },
    });

    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid assignee" });

    const dbTicket = await testDb.ticket.findUnique({ where: { id: ticket.id } });
    expect(dbTicket?.assignedToId).toBeNull();
  });

  test("rejects assignment to a user whose role is admin, not agent", async ({
    page,
    request,
  }) => {
    const ticket = await createTicket(request);
    const admin = await testDb.user.findUniqueOrThrow({
      where: { email: TEST_USERS.admin.email },
    });

    const res = await page.request.patch(`${API_URL}/api/tickets/${ticket.id}`, {
      data: { assignedToId: admin.id },
    });

    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid assignee" });

    const dbTicket = await testDb.ticket.findUnique({ where: { id: ticket.id } });
    expect(dbTicket?.assignedToId).toBeNull();
  });

  test("rejects assignment to a soft-deleted agent", async ({ page, request }) => {
    const ticket = await createTicket(request);

    const createRes = await page.request.post(`${API_URL}/api/users`, {
      data: uniqueTestUser(),
    });
    expect(createRes.status()).toBe(201);
    const { user: agent } = await createRes.json();

    // POST /api/users always creates agents (never a second admin — see
    // routes/users.ts), so this row already satisfies the role check; soft-delete
    // it directly in the DB the same way DELETE /api/users/:id would, to isolate
    // the deletedAt branch of the assignee check from the role branch above.
    await testDb.user.update({
      where: { id: agent.id },
      data: { deletedAt: new Date() },
    });

    const res = await page.request.patch(`${API_URL}/api/tickets/${ticket.id}`, {
      data: { assignedToId: agent.id },
    });

    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid assignee" });

    const dbTicket = await testDb.ticket.findUnique({ where: { id: ticket.id } });
    expect(dbTicket?.assignedToId).toBeNull();
  });

  test("assigns a ticket to a real, active agent", async ({ page, request }) => {
    const ticket = await createTicket(request);

    const createRes = await page.request.post(`${API_URL}/api/users`, {
      data: uniqueTestUser(),
    });
    expect(createRes.status()).toBe(201);
    const { user: agent } = await createRes.json();

    const res = await page.request.patch(`${API_URL}/api/tickets/${ticket.id}`, {
      data: { assignedToId: agent.id },
    });

    expect(res.status()).toBe(200);
    const updated = await res.json();
    expect(updated.assignedTo).toEqual({ id: agent.id, name: agent.name });

    const dbTicket = await testDb.ticket.findUnique({ where: { id: ticket.id } });
    expect(dbTicket?.assignedToId).toBe(agent.id);
  });

  test("unassigns a ticket when assignedToId is set to null", async ({ page, request }) => {
    const ticket = await createTicket(request);

    const createRes = await page.request.post(`${API_URL}/api/users`, {
      data: uniqueTestUser(),
    });
    expect(createRes.status()).toBe(201);
    const { user: agent } = await createRes.json();

    const assignRes = await page.request.patch(`${API_URL}/api/tickets/${ticket.id}`, {
      data: { assignedToId: agent.id },
    });
    expect(assignRes.status()).toBe(200);

    const res = await page.request.patch(`${API_URL}/api/tickets/${ticket.id}`, {
      data: { assignedToId: null },
    });

    expect(res.status()).toBe(200);
    const updated = await res.json();
    expect(updated.assignedTo).toBeNull();

    const dbTicket = await testDb.ticket.findUnique({ where: { id: ticket.id } });
    expect(dbTicket?.assignedToId).toBeNull();
  });
});
