import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "../test/render-with-query";
import { api } from "../lib/api";
import { CreateUserDialog } from "./CreateUserDialog";

vi.mock("../lib/api", () => ({
  api: { post: vi.fn() },
}));

function renderDialog() {
  return renderWithQuery(<CreateUserDialog />);
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "New User" }));
  return within(screen.getByRole("dialog"));
}

describe("CreateUserDialog", () => {
  afterEach(() => {
    vi.mocked(api.post).mockReset();
  });

  it("opens the dialog when the New User button is clicked", async () => {
    const user = userEvent.setup();
    renderDialog();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "New User" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes the dialog when clicking outside of it", async () => {
    const user = userEvent.setup();
    renderDialog();
    await openDialog(user);

    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    if (!overlay) throw new Error("dialog overlay not found");
    await user.click(overlay);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("closes the dialog when the Escape key is pressed", async () => {
    const user = userEvent.setup();
    renderDialog();
    await openDialog(user);

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("shows validation errors for a short name and password", async () => {
    const user = userEvent.setup();
    renderDialog();
    const dialog = await openDialog(user);

    await user.type(dialog.getByLabelText("Name"), "Al");
    await user.type(dialog.getByLabelText("Email"), "al@example.com");
    await user.type(dialog.getByLabelText("Password"), "short");
    await user.click(dialog.getByRole("button", { name: "Create" }));

    expect(
      await dialog.findByText("Name must be at least 3 characters"),
    ).toBeInTheDocument();
    expect(
      dialog.getByText("Password must be at least 8 characters"),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("creates the user and closes the dialog on success", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        user: {
          id: "1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          role: "agent",
          createdAt: "2026-01-15T00:00:00.000Z",
        },
      },
    });

    const user = userEvent.setup();
    renderDialog();
    const dialog = await openDialog(user);

    await user.type(dialog.getByLabelText("Name"), "Ada Lovelace");
    await user.type(dialog.getByLabelText("Email"), "ada@example.com");
    await user.type(dialog.getByLabelText("Password"), "password123");
    await user.click(dialog.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/users", {
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "password123",
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("shows the server error and keeps the dialog open on failure", async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: "Email already exists" } },
    });

    const user = userEvent.setup();
    renderDialog();
    const dialog = await openDialog(user);

    await user.type(dialog.getByLabelText("Name"), "Ada Lovelace");
    await user.type(dialog.getByLabelText("Email"), "ada@example.com");
    await user.type(dialog.getByLabelText("Password"), "password123");
    await user.click(dialog.getByRole("button", { name: "Create" }));

    expect(await dialog.findByText("Email already exists")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
