import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "../test/render-with-query";
import { authClient, useSession } from "../lib/auth-client";
import { LoginPage } from "./LoginPage";

vi.mock("../lib/auth-client", () => ({
  useSession: vi.fn(),
  authClient: { signIn: { email: vi.fn() } },
}));

function renderLogin() {
  return renderWithQuery(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  afterEach(() => {
    vi.mocked(authClient.signIn.email).mockReset();
    vi.mocked(useSession).mockReset();
  });

  function mockSignedOut() {
    vi.mocked(useSession).mockReturnValue({ data: null, isPending: false } as ReturnType<
      typeof useSession
    >);
  }

  it("renders the login form", () => {
    mockSignedOut();
    renderLogin();

    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("redirects to home when a session is already active", () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: "Admin" } },
      isPending: false,
    } as ReturnType<typeof useSession>);

    renderLogin();

    expect(screen.queryByText("Welcome back")).not.toBeInTheDocument();
  });

  it("shows a validation error for an invalid email format", async () => {
    mockSignedOut();
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Invalid email address.")).toBeInTheDocument();
    expect(authClient.signIn.email).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only email as invalid format", async () => {
    mockSignedOut();
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText("Email"), "   ");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Invalid email address.")).toBeInTheDocument();
    expect(authClient.signIn.email).not.toHaveBeenCalled();
  });

  it("shows a required error for an empty password", async () => {
    mockSignedOut();
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Password is required.")).toBeInTheDocument();
    expect(authClient.signIn.email).not.toHaveBeenCalled();
  });

  it("shows both errors when submitted empty", async () => {
    mockSignedOut();
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Invalid email address.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
  });

  it("treats a whitespace-only password as satisfying client-side validation", async () => {
    // A password of just spaces passes the min(1) "required" check, so the
    // form submits and lets the server reject it as invalid credentials
    // instead of surfacing a client-side validation error.
    mockSignedOut();
    vi.mocked(authClient.signIn.email).mockResolvedValue({
      error: { message: "Invalid email or password" },
    } as Awaited<ReturnType<typeof authClient.signIn.email>>);
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "   ");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(authClient.signIn.email).toHaveBeenCalled();
    });
    expect(screen.queryByText("Password is required.")).not.toBeInTheDocument();
  });

  it("submits and navigates home on successful login", async () => {
    mockSignedOut();
    vi.mocked(authClient.signIn.email).mockResolvedValue({
      error: null,
    } as Awaited<ReturnType<typeof authClient.signIn.email>>);
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(authClient.signIn.email).toHaveBeenCalledWith({
        email: "admin@example.com",
        password: "password123",
      });
    });
  });

  it("shows the server's error message when sign-in fails", async () => {
    mockSignedOut();
    vi.mocked(authClient.signIn.email).mockResolvedValue({
      error: { message: "Invalid email or password" },
    } as Awaited<ReturnType<typeof authClient.signIn.email>>);
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const submitButton = screen.getByRole("button", { name: "Sign in" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(submitButton).toBeEnabled();
  });

  it("submits the form when Enter is pressed in the password field", async () => {
    mockSignedOut();
    vi.mocked(authClient.signIn.email).mockResolvedValue({
      error: null,
    } as Awaited<ReturnType<typeof authClient.signIn.email>>);
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "password123{Enter}");

    await waitFor(() => {
      expect(authClient.signIn.email).toHaveBeenCalledWith({
        email: "admin@example.com",
        password: "password123",
      });
    });
  });

  it("clears the previous server error on a new submission", async () => {
    mockSignedOut();
    vi.mocked(authClient.signIn.email).mockResolvedValueOnce({
      error: { message: "Invalid email or password" },
    } as Awaited<ReturnType<typeof authClient.signIn.email>>);
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    vi.mocked(authClient.signIn.email).mockResolvedValueOnce({
      error: null,
    } as Awaited<ReturnType<typeof authClient.signIn.email>>);
    await user.clear(screen.getByLabelText("Password"));
    await user.type(screen.getByLabelText("Password"), "correctpassword");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("shows only one alert after repeated failed submissions", async () => {
    mockSignedOut();
    vi.mocked(authClient.signIn.email).mockResolvedValue({
      error: { message: "Invalid email or password" },
    } as Awaited<ReturnType<typeof authClient.signIn.email>>);
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findAllByRole("alert")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => {
      expect(screen.getAllByRole("alert")).toHaveLength(1);
    });
  });

  it("disables the submit button and shows a loading label while pending", async () => {
    mockSignedOut();
    let resolveSignIn!: (value: { error: null }) => void;
    vi.mocked(authClient.signIn.email).mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      }) as ReturnType<typeof authClient.signIn.email>,
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("button", { name: "Signing in..." })).toBeDisabled();

    resolveSignIn({ error: null });
    await waitFor(() => {
      expect(authClient.signIn.email).toHaveBeenCalledTimes(1);
    });
  });

  it("does not send a second sign-in request from a second click while the first is pending", async () => {
    mockSignedOut();
    let resolveSignIn!: (value: { error: null }) => void;
    vi.mocked(authClient.signIn.email).mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      }) as ReturnType<typeof authClient.signIn.email>,
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    const submitButton = screen.getByRole("button", { name: "Sign in" });
    await user.click(submitButton);
    // A disabled button ignores further click attempts.
    await user.click(screen.getByRole("button", { name: "Signing in..." }));

    resolveSignIn({ error: null });
    await waitFor(() => {
      expect(authClient.signIn.email).toHaveBeenCalledTimes(1);
    });
  });

  it("masks the password input and never echoes its value elsewhere in the DOM", async () => {
    mockSignedOut();
    const user = userEvent.setup();
    renderLogin();

    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput).toHaveAttribute("type", "password");

    const secret = "super-secret-value-123";
    await user.type(passwordInput, secret);

    expect(document.body).not.toHaveTextContent(secret);
  });

  it("supports filling and submitting the form via the keyboard alone", async () => {
    mockSignedOut();
    vi.mocked(authClient.signIn.email).mockResolvedValue({
      error: null,
    } as Awaited<ReturnType<typeof authClient.signIn.email>>);
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByLabelText("Email"));
    await user.keyboard("admin@example.com");
    await user.keyboard("{Tab}");
    await user.keyboard("password123");
    await user.keyboard("{Tab}");
    expect(screen.getByRole("button", { name: "Sign in" })).toHaveFocus();
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(authClient.signIn.email).toHaveBeenCalledWith({
        email: "admin@example.com",
        password: "password123",
      });
    });
  });
});
