import { test, expect } from "@playwright/test";
import {
  TEST_USERS,
  login,
  loginAsAdmin,
  logout,
  expectLoginPage,
  expectHomePage,
} from "../fixtures/auth";
import { API_URL, expireSessionByToken, extractSessionToken, testDb } from "../fixtures/db";

test.describe("Authentication", () => {
  test.describe("Login Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
    });

    test("should login successfully with valid admin credentials", async ({
      page,
    }) => {
      await login(page, TEST_USERS.admin);

      await expectHomePage(page);
      // exact: true — the Home page heading ("Welcome to the dashboard,
      // Admin!") also contains the name as a substring, so a plain
      // substring match would violate strict mode by matching both it and
      // the nav bar's user-name span.
      await expect(
        page.getByText(TEST_USERS.admin.name, { exact: true })
      ).toBeVisible();
    });

    test("should show error with invalid email (non-existent user)", async ({
      page,
    }) => {
      await login(page, {
        email: "nonexistent@example.com",
        password: "password123",
      });

      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByRole("alert")).toContainText(
        /invalid email or password/i
      );
      await expectLoginPage(page);
    });

    test("should show error with incorrect password", async ({ page }) => {
      await login(page, {
        email: TEST_USERS.admin.email,
        password: "wrongpassword",
      });

      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByRole("alert")).toContainText(
        /invalid email or password/i
      );
      await expectLoginPage(page);
    });
  });

  test.describe("Input Edge Cases", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
    });

    test("should log in successfully when the email has leading/trailing whitespace", async ({
      page,
    }) => {
      // <input type="email"> runs the HTML spec's value-sanitization
      // algorithm, which strips leading/trailing whitespace before React
      // (and therefore zod) ever sees the value — so a correctly-formatted
      // email padded with spaces still validates and logs in normally.
      await page.getByLabel("Email").fill(`  ${TEST_USERS.admin.email}  `);
      await page.getByLabel("Password").fill(TEST_USERS.admin.password);
      await page.getByRole("button", { name: /sign in/i }).click();

      await expectHomePage(page);
    });

    test("should log in successfully regardless of email casing", async ({
      page,
    }) => {
      // better-auth lowercases the email before the DB lookup, so sign-in
      // is case-insensitive even though the seeded email is stored lowercase.
      await login(page, {
        email: TEST_USERS.admin.email.toUpperCase(),
        password: TEST_USERS.admin.password,
      });

      await expectHomePage(page);
    });
  });

  test.describe("Network Failure Handling", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
    });

    test("should re-enable the form after a network-level failure (though it does not yet surface an error message)", async ({
      page,
    }) => {
      // KNOWN GAP: LoginPage.tsx's onSubmit calls `authClient.signIn.email(...)`
      // without a try/catch. An HTTP error response (e.g. 500, tested
      // above) resolves normally to `{ error }`, which the app handles —
      // but a raw network-level failure (DNS/connection/abort, no response
      // at all) makes the underlying fetch throw instead. react-hook-form
      // still resets isSubmitting (so the button re-enables), but the
      // thrown error bypasses `setError()` entirely, becomes an unhandled
      // promise rejection, and the user sees no feedback at all. This test
      // pins down that actually-observed behavior; ideally the app would
      // catch this case and show a fallback error like it does for 500s.
      await page.route("**/api/auth/sign-in/email", (route) =>
        route.abort("failed")
      );

      await login(page, TEST_USERS.admin);

      await expect(page.getByRole("alert")).not.toBeVisible();
      await expect(
        page.getByRole("button", { name: /sign(ing)? in/i })
      ).toBeEnabled();
      await expectLoginPage(page);
    });
  });

  test.describe("Session Cookie", () => {
    test("should set an httpOnly session cookie on login", async ({
      page,
      context,
    }) => {
      await loginAsAdmin(page);

      const cookies = await context.cookies();
      const sessionCookie = cookies.find((c) =>
        c.name.includes("session_token")
      );

      expect(sessionCookie).toBeDefined();
      expect(sessionCookie?.httpOnly).toBe(true);
    });
  });

  test.describe("Multiple Sessions", () => {
    test("logging out in one browser context should not affect a session in another", async ({
      browser,
    }) => {
      const contextA = await browser.newContext();
      const contextB = await browser.newContext();

      try {
        const pageA = await contextA.newPage();
        const pageB = await contextB.newPage();

        await pageA.goto("/login");
        await login(pageA, TEST_USERS.admin);
        await expectHomePage(pageA);

        await pageB.goto("/login");
        await login(pageB, TEST_USERS.admin);
        await expectHomePage(pageB);

        await logout(pageA);
        await expectLoginPage(pageA);

        // Sessions are database-backed rows, not shared JWTs — signing out
        // in one context only revokes that context's own session.
        await pageB.reload();
        await expectHomePage(pageB);
      } finally {
        await contextA.close();
        await contextB.close();
      }
    });
  });

  test.describe("Session Persistence", () => {
    test("should maintain session after page reload", async ({ page }) => {
      await loginAsAdmin(page);

      await page.reload();

      await expectHomePage(page);
      // exact: true — the Home page heading ("Welcome to the dashboard,
      // Admin!") also contains the name as a substring, so a plain
      // substring match would violate strict mode by matching both it and
      // the nav bar's user-name span.
      await expect(
        page.getByText(TEST_USERS.admin.name, { exact: true })
      ).toBeVisible();
    });

    test("should maintain session when navigating directly to protected route", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      await page.goto("/users");

      await expect(page).toHaveURL("/users");
      await expect(
        page.getByRole("heading", { name: /users/i })
      ).toBeVisible();
    });

    test("should maintain session across multiple page navigations", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      await page.goto("/users");
      await expect(page).toHaveURL("/users");

      await page.goto("/");
      await expectHomePage(page);

      // exact: true — the Home page heading ("Welcome to the dashboard,
      // Admin!") also contains the name as a substring, so a plain
      // substring match would violate strict mode by matching both it and
      // the nav bar's user-name span.
      await expect(
        page.getByText(TEST_USERS.admin.name, { exact: true })
      ).toBeVisible();
    });
  });

  test.describe("Logout", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test("should logout successfully", async ({ page }) => {
      await logout(page);

      await expectLoginPage(page);
    });

    test("should not be able to access protected routes after logout", async ({
      page,
    }) => {
      await logout(page);

      await page.goto("/");

      await expectLoginPage(page);
    });

    test("should not be able to access admin routes after logout", async ({
      page,
    }) => {
      await logout(page);

      await page.goto("/users");

      await expectLoginPage(page);
    });

    test("should require login again after logout", async ({ page }) => {
      await logout(page);

      await page.goto("/");
      await expectLoginPage(page);

      await loginAsAdmin(page);

      await expectHomePage(page);
    });

    test("should not restore a protected page via the browser back button after logout", async ({
      page,
    }) => {
      await page.goto("/users");
      await logout(page);
      await expectLoginPage(page);

      await page.goBack();

      await expectLoginPage(page);
    });
  });

  test.describe("Protected Routes", () => {
    test("should redirect unauthenticated user to login when accessing root", async ({
      page,
    }) => {
      await page.goto("/");
      await expectLoginPage(page);
    });

    test("should redirect unauthenticated user to login when accessing admin route", async ({
      page,
    }) => {
      await page.goto("/users");
      await expectLoginPage(page);
    });

    test("should allow access to protected route after login", async ({
      page,
    }) => {
      await page.goto("/");
      await expectLoginPage(page);

      await loginAsAdmin(page);

      await expectHomePage(page);
    });

    test("should land on Home after login, not the originally requested protected route", async ({
      page,
    }) => {
      // No return-to-intended-page redirect is implemented — login always
      // lands on "/" regardless of which protected route was requested first.
      await page.goto("/users");
      await expectLoginPage(page);

      await login(page, TEST_USERS.admin);

      await expectHomePage(page);
    });
  });

  test.describe("Admin Route Protection", () => {
    test("should allow admin to access admin routes", async ({ page }) => {
      await loginAsAdmin(page);

      await page.goto("/users");

      await expect(page).toHaveURL("/users");
      await expect(
        page.getByRole("heading", { name: /users/i })
      ).toBeVisible();
    });

    test("should show 'Users' link in navigation for admin", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      await expect(page.getByRole("link", { name: /users/i })).toBeVisible();
    });

    test("should navigate to users page when clicking Users link", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      await page.getByRole("link", { name: /users/i }).click();

      await expect(page).toHaveURL("/users");
      await expect(
        page.getByRole("heading", { name: /users/i })
      ).toBeVisible();
    });

    // Only an admin user is currently seeded. If an agent user is added to
    // apps/server/prisma/seed.ts, add coverage here for:
    // - agent redirected to home when visiting /users
    // - "Users" link hidden from nav for agent
  });

  test.describe("Session Tampering & Expiry", () => {
    test.afterAll(async () => {
      await testDb.$disconnect();
    });

    test("should treat a tampered session cookie as unauthenticated", async ({
      page,
      context,
    }) => {
      await loginAsAdmin(page);

      const cookies = await context.cookies();
      const sessionCookie = cookies.find((c) => c.name.includes("session_token"));
      expect(sessionCookie).toBeDefined();

      // Flip the tail of the signed cookie value. better-auth signs the
      // cookie as `<token>.<signature>`, so corrupting it must fail
      // signature verification server-side — not be silently trusted.
      const tamperedValue =
        sessionCookie!.value.slice(0, -6) +
        (sessionCookie!.value.slice(-6) === "000000" ? "111111" : "000000");

      await context.addCookies([{ ...sessionCookie!, value: tamperedValue }]);

      await page.goto("/users");

      await expectLoginPage(page);
    });

    test("should redirect to login once the session has expired server-side", async ({
      page,
      context,
    }) => {
      await loginAsAdmin(page);

      const cookies = await context.cookies();
      const sessionCookie = cookies.find((c) => c.name.includes("session_token"));
      expect(sessionCookie).toBeDefined();

      // Force-expire only this test's own session row in the DB (identified
      // by the token embedded in its cookie), so this doesn't clobber any
      // other test's concurrently-running admin session.
      await expireSessionByToken(extractSessionToken(sessionCookie!.value));

      await page.reload();

      await expectLoginPage(page);
    });
  });

  test.describe("CORS Configuration", () => {
    test("should include CORS headers for the configured WEB_ORIGIN", async ({
      request,
    }) => {
      const res = await request.get(`${API_URL}/api/health`, {
        headers: { Origin: "http://localhost:5174" },
      });

      expect(res.ok()).toBe(true);
      expect(res.headers()["access-control-allow-origin"]).toBe(
        "http://localhost:5174"
      );
    });

    test("should never reflect an untrusted request origin back in Access-Control-Allow-Origin", async ({
      request,
    }) => {
      const res = await request.get(`${API_URL}/api/health`, {
        headers: { Origin: "http://evil.example.com" },
      });

      // `cors()` is configured with a static origin string (WEB_ORIGIN), so
      // it always answers with that one trusted origin regardless of what
      // Origin the caller sends — it never echoes the caller's own origin
      // back. That's what actually prevents a malicious site from
      // authorizing itself: a real browser compares this header against
      // its own true origin, not whatever the page claims.
      expect(res.headers()["access-control-allow-origin"]).toBe(
        "http://localhost:5174"
      );
      expect(res.headers()["access-control-allow-origin"]).not.toBe(
        "http://evil.example.com"
      );
    });
  });

  test.describe("URL Handling", () => {
    test("should redirect unknown routes to home for authenticated user", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      await page.goto("/unknown-route");

      await expectHomePage(page);
    });

    test("should redirect unknown routes to login for unauthenticated user", async ({
      page,
    }) => {
      await page.goto("/unknown-route");

      await expectLoginPage(page);
    });
  });

  test.describe("Navigation Bar", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test("should display correct user information", async ({ page }) => {
      // exact: true — the Home page heading ("Welcome to the dashboard,
      // Admin!") also contains the name as a substring, so a plain
      // substring match would violate strict mode by matching both it and
      // the nav bar's user-name span.
      await expect(
        page.getByText(TEST_USERS.admin.name, { exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /sign out/i })
      ).toBeVisible();
    });

    test("should display Help Desk branding", async ({ page }) => {
      await expect(page.getByText("Help Desk").first()).toBeVisible();
    });
  });
});
