import { expect, type Page } from "@playwright/test";

export type TestUser = { name: string; email: string; password: string };

/**
 * Returns a user with a collision-resistant name/email, safe to create
 * concurrently across parallel tests against a DB that's only reset once
 * per whole run (POST /api/users 409s on a duplicate email).
 */
export function uniqueTestUser(): TestUser {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: `Test User ${unique}`,
    email: `test-user-${unique}@example.com`,
    password: "password123",
  };
}

/**
 * Opens the "New User" dialog from the Users page, fills it in, submits,
 * and waits for the dialog to close. Reused by every test that needs a
 * fresh non-admin user to act on (edit/delete/password-change).
 */
export async function createUserViaUI(page: Page, user: TestUser) {
  await page.getByRole("button", { name: "New User" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Create" }).click();

  await expect(dialog).not.toBeVisible();
}
