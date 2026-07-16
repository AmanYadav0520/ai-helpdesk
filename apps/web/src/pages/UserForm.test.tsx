import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Role } from "core/constants/role";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "../test/render-with-query";
import { api } from "../lib/api";
import { UserForm } from "./UserForm";

vi.mock("../lib/api", () => ({
  api: { post: vi.fn(), put: vi.fn() },
}));

function renderForm(props: Partial<React.ComponentProps<typeof UserForm>> = {}) {
  const onSuccess = props.onSuccess ?? vi.fn();
  renderWithQuery(<UserForm user={props.user} onSuccess={onSuccess} />);
  return { onSuccess };
}

describe("UserForm", () => {
  afterEach(() => {
    vi.mocked(api.post).mockReset();
    vi.mocked(api.put).mockReset();
  });

  it("shows validation errors for a short name and password", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Name"), "Al");
    await user.type(screen.getByLabelText("Email"), "al@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(
      await screen.findByText("Name must be at least 3 characters"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Password must be at least 8 characters"),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("creates the user and calls onSuccess", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        user: {
          id: "1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          role: Role.agent,
          createdAt: "2026-01-15T00:00:00.000Z",
        },
      },
    });

    const user = userEvent.setup();
    const { onSuccess } = renderForm();

    await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/users", {
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "password123",
      });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("shows the server error and does not call onSuccess on failure", async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: "Email already exists" } },
    });

    const user = userEvent.setup();
    const { onSuccess } = renderForm();

    await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Email already exists")).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("pre-fills name/email and leaves password blank when editing", () => {
    renderForm({
      user: { id: "1", name: "Ada Lovelace", email: "ada@example.com" },
    });

    expect(screen.getByLabelText("Name")).toHaveValue("Ada Lovelace");
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });

  it("submits a PUT with the new password when one is provided", async () => {
    vi.mocked(api.put).mockResolvedValue({
      data: {
        user: {
          id: "1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          role: Role.agent,
          createdAt: "2026-01-15T00:00:00.000Z",
        },
      },
    });

    const user = userEvent.setup();
    const { onSuccess } = renderForm({
      user: { id: "1", name: "Ada Lovelace", email: "ada@example.com" },
    });

    await user.type(screen.getByLabelText("Password"), "newpassword123");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith("/api/users/1", {
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "newpassword123",
      });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("submits a PUT with an empty password when left blank, leaving it unchanged", async () => {
    vi.mocked(api.put).mockResolvedValue({
      data: {
        user: {
          id: "1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          role: Role.agent,
          createdAt: "2026-01-15T00:00:00.000Z",
        },
      },
    });

    const user = userEvent.setup();
    renderForm({
      user: { id: "1", name: "Ada Lovelace", email: "ada@example.com" },
    });

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith("/api/users/1", {
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "",
      });
    });
  });
});
