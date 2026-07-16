import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Role } from "core/constants/role";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "../test/render-with-query";
import { api } from "../lib/api";
import { UsersPage } from "./UsersPage";

vi.mock("../lib/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

function renderUsers() {
  return renderWithQuery(<UsersPage />);
}

describe("UsersPage", () => {
  afterEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.put).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it("opens the dialog in create mode with empty fields when New User is clicked", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { users: [] } });

    const user = userEvent.setup();
    renderUsers();
    await user.click(screen.getByRole("button", { name: "New User" }));

    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("Create user")).toBeInTheDocument();
    expect(dialog.getByLabelText("Name")).toHaveValue("");
    expect(dialog.getByLabelText("Email")).toHaveValue("");
  });

  it("opens the dialog in edit mode pre-filled with the row's user when its edit button is clicked", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        users: [
          {
            id: "1",
            name: "Ada Lovelace",
            email: "ada@example.com",
            role: Role.agent,
            createdAt: "2026-01-15T00:00:00.000Z",
          },
        ],
      },
    });

    const user = userEvent.setup();
    renderUsers();

    await user.click(await screen.findByRole("button", { name: "Edit Ada Lovelace" }));

    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("Edit user")).toBeInTheDocument();
    expect(dialog.getByLabelText("Name")).toHaveValue("Ada Lovelace");
    expect(dialog.getByLabelText("Email")).toHaveValue("ada@example.com");
  });

  it("closes the dialog when the Escape key is pressed", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { users: [] } });

    const user = userEvent.setup();
    renderUsers();
    await user.click(screen.getByRole("button", { name: "New User" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("opens a confirmation dialog with the row's name when its delete button is clicked", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        users: [
          {
            id: "1",
            name: "Ada Lovelace",
            email: "ada@example.com",
            role: Role.agent,
            createdAt: "2026-01-15T00:00:00.000Z",
          },
        ],
      },
    });

    const user = userEvent.setup();
    renderUsers();

    await user.click(await screen.findByRole("button", { name: "Delete Ada Lovelace" }));

    const dialog = within(screen.getByRole("alertdialog"));
    expect(dialog.getByText(/Are you sure you want to delete Ada Lovelace/)).toBeInTheDocument();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("does not call api.delete when the confirmation dialog is cancelled", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        users: [
          {
            id: "1",
            name: "Ada Lovelace",
            email: "ada@example.com",
            role: Role.agent,
            createdAt: "2026-01-15T00:00:00.000Z",
          },
        ],
      },
    });

    const user = userEvent.setup();
    renderUsers();

    await user.click(await screen.findByRole("button", { name: "Delete Ada Lovelace" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("calls api.delete and refreshes the list when the deletion is confirmed", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        users: [
          {
            id: "1",
            name: "Ada Lovelace",
            email: "ada@example.com",
            role: Role.agent,
            createdAt: "2026-01-15T00:00:00.000Z",
          },
        ],
      },
    });
    vi.mocked(api.delete).mockResolvedValue({ data: { message: "User deleted" } });

    const user = userEvent.setup();
    renderUsers();

    await user.click(await screen.findByRole("button", { name: "Delete Ada Lovelace" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/api/users/1");
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });
});
