import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Role } from "core/constants/role";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "../test/render-with-query";
import { api } from "../lib/api";
import { UsersTable } from "./UsersTable";

vi.mock("../lib/api", () => ({
  api: { get: vi.fn() },
}));

function renderTable(onEdit = vi.fn(), onDelete = vi.fn()) {
  return renderWithQuery(<UsersTable onEdit={onEdit} onDelete={onDelete} />);
}

describe("UsersTable", () => {
  afterEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("shows skeleton rows while the request is pending", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    const { container } = renderTable();

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it("renders users once the request resolves", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        users: [
          {
            id: "1",
            name: "Ada Lovelace",
            email: "ada@example.com",
            role: Role.admin,
            createdAt: "2026-01-15T00:00:00.000Z",
          },
          {
            id: "2",
            name: "Grace Hopper",
            email: "grace@example.com",
            role: Role.agent,
            createdAt: "2026-02-01T00:00:00.000Z",
          },
        ],
      },
    });

    renderTable();

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText(Role.admin)).toBeInTheDocument();

    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("grace@example.com")).toBeInTheDocument();
    expect(screen.getByText(Role.agent)).toBeInTheDocument();

    expect(screen.queryByText("Failed to load users.")).not.toBeInTheDocument();
  });

  it("calls onEdit with the row's user when its edit button is clicked", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        users: [
          {
            id: "1",
            name: "Ada Lovelace",
            email: "ada@example.com",
            role: Role.admin,
            createdAt: "2026-01-15T00:00:00.000Z",
          },
        ],
      },
    });

    const onEdit = vi.fn();
    const user = userEvent.setup();
    renderTable(onEdit);

    await user.click(await screen.findByRole("button", { name: "Edit Ada Lovelace" }));

    expect(onEdit).toHaveBeenCalledWith({
      id: "1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      role: Role.admin,
      createdAt: "2026-01-15T00:00:00.000Z",
    });
  });

  it("shows an error alert when the request fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("network error"));

    renderTable();

    await waitFor(() => {
      expect(screen.getByText("Failed to load users.")).toBeInTheDocument();
    });
  });

  it("hides the delete button for the admin row but shows it for agent rows", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        users: [
          {
            id: "1",
            name: "Ada Lovelace",
            email: "ada@example.com",
            role: Role.admin,
            createdAt: "2026-01-15T00:00:00.000Z",
          },
          {
            id: "2",
            name: "Grace Hopper",
            email: "grace@example.com",
            role: Role.agent,
            createdAt: "2026-02-01T00:00:00.000Z",
          },
        ],
      },
    });

    renderTable();

    await screen.findByText("Ada Lovelace");

    expect(screen.queryByRole("button", { name: "Delete Ada Lovelace" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Grace Hopper" })).toBeInTheDocument();
  });

  it("calls onDelete with the row's user when its delete button is clicked", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        users: [
          {
            id: "2",
            name: "Grace Hopper",
            email: "grace@example.com",
            role: Role.agent,
            createdAt: "2026-02-01T00:00:00.000Z",
          },
        ],
      },
    });

    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderTable(vi.fn(), onDelete);

    await user.click(await screen.findByRole("button", { name: "Delete Grace Hopper" }));

    expect(onDelete).toHaveBeenCalledWith({
      id: "2",
      name: "Grace Hopper",
      email: "grace@example.com",
      role: Role.agent,
      createdAt: "2026-02-01T00:00:00.000Z",
    });
  });
});
