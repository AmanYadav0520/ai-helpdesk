import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";
import {
  postInboundEmail,
  postInboundEmailWithHeader,
  uniqueSubject,
  uniqueSenderEmail,
  createTicketDirectly,
  createAgentDirectly,
} from "../fixtures/tickets";
import { testDb } from "../fixtures/db";

test.describe("Ticket Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("an inbound email creates a ticket and it appears in the tickets list", async ({
    page,
    request,
  }) => {
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

    await page.goto("/tickets");
    await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();

    // Search narrows the (potentially multi-page, parallel-populated) list
    // down to just this test's own row.
    await page.getByPlaceholder("Search tickets...").fill(subject);

    const row = page.getByRole("row", { name: subject });
    await expect(row).toBeVisible();
    await expect(row.getByText("Jane Doe", { exact: true })).toBeVisible();
    await expect(row.getByText(senderEmail, { exact: true })).toBeVisible();
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

  test("opening a ticket from the list shows its detail", async ({ page }) => {
    const ticket = await createTicketDirectly({
      subject: uniqueSubject(),
      body: "Please help me reset my password.",
      senderName: "Alice Example",
    });

    await page.goto("/tickets");
    await page.getByPlaceholder("Search tickets...").fill(ticket.subject);
    await page.getByRole("link", { name: ticket.subject }).click();

    await expect(page).toHaveURL(`/tickets/${ticket.id}`);
    await expect(page.getByRole("heading", { name: ticket.subject })).toBeVisible();
    await expect(
      page.getByText(`${ticket.senderName} <${ticket.senderEmail}>`)
    ).toBeVisible();
    await expect(page.getByText(ticket.body)).toBeVisible();
  });

  test("updating status, category, and assignee via the detail page persists after reload", async ({
    page,
  }) => {
    const ticket = await createTicketDirectly();
    const agent = await createAgentDirectly();

    await page.goto(`/tickets/${ticket.id}`);
    await expect(page.getByRole("heading", { name: ticket.subject })).toBeVisible();

    const statusSelect = page.getByRole("combobox", { name: "Status" });
    const categorySelect = page.getByRole("combobox", { name: "Category" });
    const assigneeSelect = page.getByRole("combobox", { name: "Assigned To" });

    // Sanity-check the defaults from a freshly created ticket before changing them.
    await expect(statusSelect).toHaveText("Open");
    await expect(categorySelect).toHaveText("None");
    await expect(assigneeSelect).toHaveText("Unassigned");

    await statusSelect.click();
    await page.getByRole("option", { name: "Resolved" }).click();
    await expect(statusSelect).toHaveText("Resolved");

    await categorySelect.click();
    await page.getByRole("option", { name: "Technical" }).click();
    await expect(categorySelect).toHaveText("Technical");

    await assigneeSelect.click();
    await page.getByRole("option", { name: agent.name }).click();
    await expect(assigneeSelect).toHaveText(agent.name);

    await page.reload();

    await expect(page.getByRole("combobox", { name: "Status" })).toHaveText("Resolved");
    await expect(page.getByRole("combobox", { name: "Category" })).toHaveText("Technical");
    await expect(page.getByRole("combobox", { name: "Assigned To" })).toHaveText(agent.name);

    // The list's Status badge should reflect the update too.
    await page.goto("/tickets");
    await page.getByPlaceholder("Search tickets...").fill(ticket.subject);
    await expect(page.getByRole("row", { name: ticket.subject })).toContainText("Resolved");
  });

  test("adding an agent reply shows it in the reply thread", async ({ page }) => {
    const ticket = await createTicketDirectly();

    await page.goto(`/tickets/${ticket.id}`);
    await expect(page.getByRole("heading", { name: "Replies" })).toBeVisible();
    await expect(page.getByText("No replies yet.")).toBeVisible();

    const replyBody = `This is a test agent reply ${Date.now()}`;
    const replyTextbox = page.getByRole("textbox");
    await replyTextbox.fill(replyBody);
    await page.getByRole("button", { name: "Send Reply" }).click();

    await expect(page.getByText(replyBody)).toBeVisible();
    await expect(page.getByText("No replies yet.")).toHaveCount(0);
    // The form clears after a successful submit.
    await expect(replyTextbox).toHaveValue("");
  });
});

// Pure API-level tests against requireWebhookSecret and inboundEmailSchema's
// failure paths — no browser/session needed, so this is a sibling describe
// rather than nested under "Ticket Management" (whose beforeEach logs an
// admin in via `page`, which none of these tests use).
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
