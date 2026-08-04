import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "./test/render-with-query";

// Integration test against the REAL Better Auth client (not the module-level
// mock used by LoginPage.test.tsx) — only the network boundary (global fetch)
// is faked, simulating the real API: sign-in sets a "cookie" flag in memory,
// get-session reflects it. This exercises the real nanostore session-atom
// wiring between authClient.signIn.email() and useSession(), which the
// mocked LoginPage.test.tsx structurally cannot reach.
//
// auth-client.ts captures `fetch` as its customFetchImpl at module-import
// time, so the stub must be installed and modules reset+re-imported
// dynamically per test — a static top-level import would capture the real
// fetch before any stub could apply.
describe("login -> protected route redirect (real auth client)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("reaches the dashboard after a successful sign-in without bouncing back to /login", async () => {
    let sessionActive = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        const path = url.toString();
        if (path.endsWith("/sign-in/email") && init?.method === "POST") {
          sessionActive = true;
          return new Response(
            JSON.stringify({
              redirect: false,
              token: "fake-token",
              user: { id: "1", name: "Admin", email: "admin@example.com", role: "admin" },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (path.endsWith("/get-session")) {
          if (!sessionActive) {
            return new Response("null", {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(
            JSON.stringify({
              session: { id: "s1", userId: "1" },
              user: { id: "1", name: "Admin", email: "admin@example.com", role: "admin" },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const { LoginPage } = await import("./pages/LoginPage");
    const { ProtectedRoute } = await import("./components/ProtectedRoute");

    const user = userEvent.setup();
    renderWithQuery(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Dashboard content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(
      () => {
        expect(screen.getByText("Dashboard content")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    expect(screen.queryByText("Welcome back")).not.toBeInTheDocument();
  });
});
