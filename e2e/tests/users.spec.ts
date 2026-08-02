import { test, expect } from "@playwright/test";
import { loginAsAdmin, login, logout, expectHomePage } from "../fixtures/auth";
import { uniqueTestUser, createUserViaUI } from "../fixtures/users";
import { API_URL, testDb } from "../fixtures/db";
import { postInboundEmail, uniqueSubject, uniqueSenderEmail } from "../fixtures/tickets";
import { AI_AGENT_EMAIL } from "../../apps/server/src/lib/ai-agent";

test.describe("User Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/users");
  });

  test("should create a new user and show it in the table with an agent badge", async ({
    page,
  }) => {
    const user = uniqueTestUser();
    await createUserViaUI(page, user);

    const row = page.getByRole("row", { name: user.email });
    await expect(row).toBeVisible();
    await expect(row.getByText(user.name, { exact: true })).toBeVisible();
    // POST /api/users always creates agents — never a second admin.
    await expect(row.getByText("agent", { exact: true })).toBeVisible();
  });

  test("should update a user's name and email", async ({ page }) => {
    const user = uniqueTestUser();
    await createUserViaUI(page, user);

    await page
      .getByRole("row", { name: user.email })
      .getByRole("button", { name: `Edit ${user.name}` })
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Edit user")).toBeVisible();
    await expect(page.getByLabel("Name")).toHaveValue(user.name);
    await expect(page.getByLabel("Email")).toHaveValue(user.email);
    await expect(page.getByLabel("Password")).toHaveValue("");

    const updated = uniqueTestUser();
    await page.getByLabel("Name").fill(updated.name);
    await page.getByLabel("Email").fill(updated.email);
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(dialog).not.toBeVisible();

    const updatedRow = page.getByRole("row", { name: updated.email });
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow.getByText(updated.name, { exact: true })).toBeVisible();
    await expect(page.getByRole("row", { name: user.email })).toHaveCount(0);
  });

  test("should update a user's password and allow login with the new password", async ({
    page,
  }) => {
    const user = uniqueTestUser();
    await createUserViaUI(page, user);

    await page
      .getByRole("row", { name: user.email })
      .getByRole("button", { name: `Edit ${user.name}` })
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Only the Password field is touched — name/email are left as-is to
    // prove a blank-vs-filled password is what actually drives the change,
    // per updateUserSchema's "blank means don't change it" rule.
    const newPassword = "newpassword456";
    await page.getByLabel("Password").fill(newPassword);
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(dialog).not.toBeVisible();

    await logout(page);
    await login(page, { email: user.email, password: newPassword });

    await expectHomePage(page);
  });

  test("should delete a user", async ({ page }) => {
    const user = uniqueTestUser();
    await createUserViaUI(page, user);

    await page
      .getByRole("row", { name: user.email })
      .getByRole("button", { name: `Delete ${user.name}` })
      .click();

    const alertDialog = page.getByRole("alertdialog");
    await expect(alertDialog).toBeVisible();
    await expect(alertDialog.getByText("Delete User")).toBeVisible();
    await expect(
      alertDialog.getByText(
        `Are you sure you want to delete ${user.name}? This action cannot be undone.`
      )
    ).toBeVisible();

    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(alertDialog).not.toBeVisible();
    await expect(page.getByRole("row", { name: user.email })).toHaveCount(0);
  });

  /**
   * Ticket.assignedTo has onDelete: SetNull in schema.prisma, but that's a
   * real foreign-key action that only fires on an actual row delete —
   * DELETE /api/users/:id soft-deletes (sets deletedAt), which never
   * triggers it. This is real DB-cascading logic a mocked component test
   * can't reach, so it belongs here per CLAUDE.md's testing strategy.
   */
  test("should unassign a user's tickets when the user is deleted", async ({
    page,
    request,
  }) => {
    const ticketRes = await postInboundEmail(request, {
      from: `Jane Doe <${uniqueSenderEmail()}>`,
      subject: uniqueSubject(),
      text: "I need help with my account.",
    });
    expect(ticketRes.status()).toBe(201);
    const { ticket } = await ticketRes.json();

    const user = uniqueTestUser();
    await createUserViaUI(page, user);
    const agent = await testDb.user.findUniqueOrThrow({ where: { email: user.email } });

    const assignRes = await page.request.patch(`${API_URL}/api/tickets/${ticket.id}`, {
      data: { assignedToId: agent.id },
    });
    expect(assignRes.status()).toBe(200);

    await page
      .getByRole("row", { name: user.email })
      .getByRole("button", { name: `Delete ${user.name}` })
      .click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByRole("row", { name: user.email })).toHaveCount(0);

    const updatedTicket = await testDb.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(updatedTicket.assignedToId).toBeNull();
  });

  /**
   * seedAiAgent() (apps/server/prisma/seed.ts) creates the AI agent user
   * before this whole suite runs, so it's already in the DB here — GET
   * /api/users must filter it out (email: { not: AI_AGENT_EMAIL }) so an
   * admin never sees it, and never has a chance to delete it, in the table.
   */
  test("should not show the AI agent user in the users table", async ({ page }) => {
    const aiAgent = await testDb.user.findUniqueOrThrow({ where: { email: AI_AGENT_EMAIL } });

    await expect(page.getByRole("row", { name: AI_AGENT_EMAIL })).toHaveCount(0);
    await expect(page.getByRole("row", { name: aiAgent.name })).toHaveCount(0);
  });

  /**
   * Defense-in-depth: even though the AI agent is hidden from GET
   * /api/users (tested above), DELETE /api/users/:id still explicitly
   * rejects a direct request targeting its id — real route-guard/DB
   * behavior a mocked component test can't reach.
   */
  test("should reject deleting the AI agent user via a direct API request", async ({
    page,
  }) => {
    const aiAgent = await testDb.user.findUniqueOrThrow({ where: { email: AI_AGENT_EMAIL } });

    const deleteRes = await page.request.delete(`${API_URL}/api/users/${aiAgent.id}`);
    expect(deleteRes.status()).toBe(403);
    expect(await deleteRes.json()).toEqual({ error: "The AI agent cannot be deleted" });

    const stillExists = await testDb.user.findUniqueOrThrow({ where: { id: aiAgent.id } });
    expect(stillExists.deletedAt).toBeNull();

    await expect(page.getByRole("row", { name: AI_AGENT_EMAIL })).toHaveCount(0);
  });
});
