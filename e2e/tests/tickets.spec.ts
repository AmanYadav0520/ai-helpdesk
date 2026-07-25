import { test, expect } from "@playwright/test";
import { postInboundEmail, postInboundEmailWithHeader, uniqueSubject, uniqueSenderEmail } from "../fixtures/tickets";
import { testDb } from "../fixtures/db";

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
