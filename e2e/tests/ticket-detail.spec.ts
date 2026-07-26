import { test, expect, type APIRequestContext } from "@playwright/test";
import { postInboundEmail, uniqueSubject, uniqueSenderEmail } from "../fixtures/tickets";
import { API_URL, testDb } from "../fixtures/db";
import { loginAsAdmin } from "../fixtures/auth";
import { uniqueTestUser } from "../fixtures/users";

// Rendering of a ticket's own fields (subject/status/sender/body, sanitized
// bodyHtml), status/category/assignee mutation payloads, reply-thread
// rendering/empty/error states, and reply-form submission/validation are all
// covered against a mocked API client by component tests colocated with each
// piece: apps/web/src/components/TicketDetail.test.tsx, UpdateTicket.test.tsx,
// ReplyThread.test.tsx, ReplyForm.test.tsx. What's left here is what those
// tests can't reach because they never talk to a real server/DB: a real
// multi-page authenticated journey from the tickets list to a real ticket's
// detail page, a full client -> server -> DB -> client update round-trip,
// session-gated access to /tickets/:id, and the real API's 404 response for
// an id that doesn't exist.
test.describe("Ticket Detail Page", () => {
  /** Creates a fresh ticket via the (unauthenticated, secret-header-gated) inbound-email webhook. */
  async function createTicket(request: APIRequestContext) {
    const subject = uniqueSubject();
    const res = await postInboundEmail(request, {
      from: `Jane Doe <${uniqueSenderEmail()}>`,
      subject,
      text: "I need help with my account.",
    });
    expect(res.status()).toBe(201);
    const { ticket } = await res.json();
    return { id: ticket.id as number, subject };
  }

  test("navigates from the tickets list to a real ticket's detail page and renders the loaded data", async ({
    page,
    request,
  }) => {
    const { subject } = await createTicket(request);

    await loginAsAdmin(page);
    await page.goto("/tickets");

    // The unique subject also isolates this row among tickets created by
    // other parallel tests/spec files against the same, once-per-run-reset DB.
    await page.getByRole("link", { name: subject }).click();

    await expect(page).toHaveURL(/\/tickets\/\d+$/);
    await expect(page.getByRole("heading", { name: subject })).toBeVisible();
    await expect(page.getByText("Jane Doe")).toBeVisible();
    await expect(page.getByText("I need help with my account.")).toBeVisible();
  });

  test("persists a status change through a full client-server-DB-client round-trip", async ({
    page,
    request,
  }) => {
    const { id, subject } = await createTicket(request);

    await loginAsAdmin(page);
    await page.goto(`/tickets/${id}`);
    await expect(page.getByRole("heading", { name: subject })).toBeVisible();

    await page.getByRole("combobox", { name: "Status" }).click();
    await page.getByRole("option", { name: "Resolved" }).click();

    // Wait for the PATCH to actually complete (not just fire) before asserting.
    await page.waitForResponse(
      (res) => res.url().includes(`/api/tickets/${id}`) && res.request().method() === "PATCH"
    );

    // Confirm the write actually landed in Postgres, not just that the UI
    // optimistically shows the new value.
    await expect
      .poll(async () => (await testDb.ticket.findUnique({ where: { id } }))?.status)
      .toBe("resolved");

    // Reload to prove the value is being read back from the server, not
    // just held in client-side query cache.
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Status" })).toHaveText("Resolved");
  });

  test("persists an assignee change through a full client-server-DB-client round-trip", async ({
    page,
    request,
  }) => {
    const { id, subject } = await createTicket(request);

    await loginAsAdmin(page);

    // POST /api/users is requireAdmin-protected, so this must ride the
    // authenticated session cookie via page.request (not the bare `request`
    // fixture, which is unauthenticated) — same approach as the assignment
    // tests in tickets.spec.ts. page.request has no baseURL for apps/server
    // (only apps/web's origin is configured as the project baseURL), so the
    // full API origin is required here too.
    const agent = uniqueTestUser();
    const createRes = await page.request.post(`${API_URL}/api/users`, { data: agent });
    expect(createRes.status()).toBe(201);
    const { user: createdAgent } = await createRes.json();

    await page.goto(`/tickets/${id}`);
    await expect(page.getByRole("heading", { name: subject })).toBeVisible();

    await page.getByRole("combobox", { name: "Assigned To" }).click();
    // exact: true — this repo's DB is reset once per whole test run, so
    // other parallel tests may have created other "Test User <suffix>"
    // agents; an inexact match would violate Playwright's strict mode.
    await page.getByRole("option", { name: agent.name, exact: true }).click();

    await page.waitForResponse(
      (res) => res.url().includes(`/api/tickets/${id}`) && res.request().method() === "PATCH"
    );

    await expect
      .poll(async () => (await testDb.ticket.findUnique({ where: { id } }))?.assignedToId)
      .toBe(createdAgent.id);

    // Reload to prove the value is being read back from the server, not
    // just held in client-side query cache.
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Assigned To" })).toHaveText(agent.name);
  });

  test("redirects an unauthenticated user straight to /login when visiting a ticket URL directly", async ({
    page,
    request,
  }) => {
    const { id } = await createTicket(request);

    await page.goto(`/tickets/${id}`);

    await expect(page).toHaveURL("/login");
    await expect(page.getByText("Sign in to Help Desk")).toBeVisible();
  });

  test("shows a 'Ticket not found' error for an id the real API has no ticket for", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    // Astronomically unlikely to collide with an autoincrement id from this
    // test run's tickets.
    await page.goto("/tickets/999999999");

    // frontend.tsx's QueryClient uses TanStack Query's default retry (3
    // attempts with exponential backoff), so a 404 response doesn't reach
    // the query's error state — and this alert — for several seconds.
    // Real, observed behavior; not something a mocked component test would
    // ever see, since those construct a `retry: false` QueryClient.
    await expect(page.getByRole("alert")).toContainText("Ticket not found", {
      timeout: 15000,
    });
  });
});
