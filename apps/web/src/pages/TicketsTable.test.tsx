import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { TicketStatus } from "core/constants/ticket-status";
import { TicketCategory } from "core/constants/ticket-category";
import { type Ticket } from "core/constants/ticket";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "../test/render-with-query";
import { api } from "../lib/api";
import { TicketsTable } from "./TicketsTable";
import type { TicketFilters } from "./TicketsPage";

vi.mock("../lib/api", () => ({
  api: { get: vi.fn() },
}));

function renderTable(filters: TicketFilters = {}) {
  return renderWithQuery(
    <MemoryRouter>
      <TicketsTable filters={filters} />
    </MemoryRouter>,
  );
}

const baseTicket: Ticket = {
  id: 1,
  subject: "Cannot log in",
  body: "I forgot my password.",
  bodyHtml: null,
  status: TicketStatus.open,
  category: TicketCategory.technical_question,
  senderName: "Ada Lovelace",
  senderEmail: "ada@example.com",
  assignedTo: null,
  createdAt: "2026-01-15T00:00:00.000Z",
  updatedAt: "2026-01-15T00:00:00.000Z",
};

describe("TicketsTable", () => {
  afterEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("shows skeleton rows while the request is pending", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    const { container } = renderTable();

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it("renders tickets once the request resolves, linking the subject to its detail page", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { tickets: [baseTicket], total: 1, page: 1, pageSize: 10 },
    });

    renderTable();

    const link = await screen.findByRole("link", { name: "Cannot log in" });
    expect(link).toHaveAttribute("href", "/tickets/1");
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Technical")).toBeInTheDocument();
  });

  it("shows an em dash for tickets with no category", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        tickets: [{ ...baseTicket, category: null }],
        total: 1,
        page: 1,
        pageSize: 10,
      },
    });

    renderTable();

    await screen.findByRole("link", { name: "Cannot log in" });
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows an error alert when the request fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("network error"));

    renderTable();

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch tickets")).toBeInTheDocument();
    });
  });

  it("shows the total count once loaded", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { tickets: [baseTicket], total: 1, page: 1, pageSize: 10 },
    });

    renderTable();

    expect(await screen.findByText("Showing 1–1 of 1 tickets")).toBeInTheDocument();
  });

  it("sorts by createdAt descending on initial load", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { tickets: [baseTicket], total: 1, page: 1, pageSize: 10 },
    });

    renderTable();

    await screen.findByRole("link", { name: "Cannot log in" });
    expect(api.get).toHaveBeenCalledWith(
      "/api/tickets",
      expect.objectContaining({
        params: expect.objectContaining({ sortBy: "createdAt", sortOrder: "desc" }),
      }),
    );
  });

  it("sorts ascending then descending when a column header is clicked twice", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { tickets: [baseTicket], total: 1, page: 1, pageSize: 10 },
    });

    const user = userEvent.setup();
    renderTable();

    await screen.findByRole("link", { name: "Cannot log in" });

    await user.click(screen.getByRole("button", { name: /subject/i }));
    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        "/api/tickets",
        expect.objectContaining({
          params: expect.objectContaining({ sortBy: "subject", sortOrder: "asc" }),
        }),
      );
    });

    await user.click(screen.getByRole("button", { name: /subject/i }));
    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        "/api/tickets",
        expect.objectContaining({
          params: expect.objectContaining({ sortBy: "subject", sortOrder: "desc" }),
        }),
      );
    });
  });

  it("resets to page 1 when sorting changes", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { tickets: [baseTicket], total: 25, page: 1, pageSize: 10 },
    });

    const user = userEvent.setup();
    renderTable();

    await screen.findByRole("link", { name: "Cannot log in" });

    await user.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        "/api/tickets",
        expect.objectContaining({ params: expect.objectContaining({ page: 2 }) }),
      );
    });

    await user.click(screen.getByRole("button", { name: /subject/i }));
    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        "/api/tickets",
        expect.objectContaining({
          params: expect.objectContaining({ sortBy: "subject", sortOrder: "asc", page: 1 }),
        }),
      );
    });
  });

  it("sends the status, category, and search filters as query params", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { tickets: [baseTicket], total: 1, page: 1, pageSize: 10 },
    });

    renderTable({
      status: TicketStatus.open,
      category: TicketCategory.technical_question,
      search: "billing",
    });

    await screen.findByRole("link", { name: "Cannot log in" });
    expect(api.get).toHaveBeenCalledWith(
      "/api/tickets",
      expect.objectContaining({
        params: expect.objectContaining({
          status: TicketStatus.open,
          category: TicketCategory.technical_question,
          search: "billing",
        }),
      }),
    );
  });

  it("resets to page 1 when filters change", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { tickets: [baseTicket], total: 25, page: 1, pageSize: 10 },
    });

    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TicketsTable filters={{}} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByRole("link", { name: "Cannot log in" });

    await user.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        "/api/tickets",
        expect.objectContaining({ params: expect.objectContaining({ page: 2 }) }),
      );
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TicketsTable filters={{ status: TicketStatus.open }} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        "/api/tickets",
        expect.objectContaining({
          params: expect.objectContaining({ status: TicketStatus.open, page: 1 }),
        }),
      );
    });
  });
});
