import { test, expect } from "@playwright/test";
import { loginAsAdmin, login, logout, expectHomePage } from "../fixtures/auth";
import { uniqueTestUser, createUserViaUI } from "../fixtures/users";

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
});
