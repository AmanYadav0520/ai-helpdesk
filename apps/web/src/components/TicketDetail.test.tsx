import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketStatus } from "core/constants/ticket-status";
import { type Ticket } from "core/constants/ticket";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "../test/render-with-query";
import { api } from "../lib/api";
import TicketDetail from "./TicketDetail";

vi.mock("../lib/api", () => ({
  api: { post: vi.fn() },
}));

const baseTicket: Ticket = {
  id: 1,
  subject: "Cannot log in",
  body: "I forgot my password.",
  bodyHtml: null,
  status: TicketStatus.open,
  category: null,
  senderName: "Ada Lovelace",
  senderEmail: "ada@example.com",
  assignedTo: null,
  createdAt: "2026-01-15T09:00:00.000Z",
  updatedAt: "2026-01-16T09:00:00.000Z",
};

describe("TicketDetail", () => {
  afterEach(() => {
    vi.mocked(api.post).mockReset();
  });

  it("renders the subject, status, sender, and plain-text body", () => {
    renderWithQuery(<TicketDetail ticket={baseTicket} />);

    expect(screen.getByRole("heading", { name: "Cannot log in" })).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace <ada@example.com>")).toBeInTheDocument();
    expect(screen.getByText("I forgot my password.")).toBeInTheDocument();
  });

  it("renders sanitized bodyHtml and strips script tags", () => {
    renderWithQuery(
      <TicketDetail
        ticket={{
          ...baseTicket,
          bodyHtml: "<p>Hello <strong>there</strong></p><script>alert(1)</script>",
        }}
      />,
    );

    expect(screen.getByText(/Hello/)).toBeInTheDocument();
    expect(screen.getByText("there")).toBeInTheDocument();
    expect(document.querySelector("script")).not.toBeInTheDocument();
  });

  it("fetches and displays a summary when Summarize is clicked", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { summary: "Customer forgot their password." } });

    const user = userEvent.setup();
    renderWithQuery(<TicketDetail ticket={baseTicket} />);

    await user.click(screen.getByRole("button", { name: "Summarize" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/tickets/1/summarize");
    });

    expect(await screen.findByText("Customer forgot their password.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Regenerate Summary" })).toBeInTheDocument();
  });

  it("regenerates the summary on each click", async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { summary: "First summary." } })
      .mockResolvedValueOnce({ data: { summary: "Second summary." } });

    const user = userEvent.setup();
    renderWithQuery(<TicketDetail ticket={baseTicket} />);

    await user.click(screen.getByRole("button", { name: "Summarize" }));
    expect(await screen.findByText("First summary.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Regenerate Summary" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText("Second summary.")).toBeInTheDocument();
    expect(screen.queryByText("First summary.")).not.toBeInTheDocument();
  });

  it("shows the server error message when summarizing fails", async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: "Failed to summarize ticket." } },
    });

    const user = userEvent.setup();
    renderWithQuery(<TicketDetail ticket={baseTicket} />);

    await user.click(screen.getByRole("button", { name: "Summarize" }));

    expect(await screen.findByText("Failed to summarize ticket.")).toBeInTheDocument();
  });
});
