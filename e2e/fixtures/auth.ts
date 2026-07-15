import { expect, type Page } from "@playwright/test";

export const TEST_USERS = {
  admin: {
    email: "admin@example.com",
    password: "password123",
    name: "Admin",
  },
};

export async function login(
  page: Page,
  user: { email: string; password: string }
) {
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

export async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await login(page, TEST_USERS.admin);
  await expectHomePage(page);
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: /sign out/i }).click();
  // NavBar's sign-out redirects to /login only inside signOut's onSuccess
  // callback, after the server has actually invalidated the session. Wait
  // for that redirect so callers can safely assume the session is gone
  // immediately afterward (e.g. before an explicit page.goto elsewhere) —
  // without this, a subsequent navigation can race the in-flight sign-out
  // request and still see the old session as valid.
  await page.waitForURL("/login");
}

export async function expectLoginPage(page: Page) {
  await expect(page).toHaveURL("/login");
  await expect(page.getByText("Sign in to Help Desk")).toBeVisible();
}

export async function expectHomePage(page: Page) {
  await expect(page).toHaveURL("/");
  await expect(page.getByText(/welcome to the dashboard/i)).toBeVisible();
}
