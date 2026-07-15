import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "../test/render-with-query";
import { api } from "../lib/api";
import { UsersTable } from "./UsersTable";

vi.mock("../lib/api", () => ({
  api: { get: vi.fn() },
}));

function renderTable() {
  return renderWithQuery(<UsersTable />);
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
            role: "admin",
            createdAt: "2026-01-15T00:00:00.000Z",
          },
          {
            id: "2",
            name: "Grace Hopper",
            email: "grace@example.com",
            role: "agent",
            createdAt: "2026-02-01T00:00:00.000Z",
          },
        ],
      },
    });

    renderTable();

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();

    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("grace@example.com")).toBeInTheDocument();
    expect(screen.getByText("agent")).toBeInTheDocument();

    expect(screen.queryByText("Failed to load users.")).not.toBeInTheDocument();
  });

  it("shows an error alert when the request fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("network error"));

    renderTable();

    await waitFor(() => {
      expect(screen.getByText("Failed to load users.")).toBeInTheDocument();
    });
  });
});
