import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketStatus } from "core/constants/ticket-status";
import { TicketCategory } from "core/constants/ticket-category";
import { type Ticket } from "core/constants/ticket";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "../test/render-with-query";
import { api } from "../lib/api";
import UpdateTicket from "./UpdateTicket";

vi.mock("../lib/api", () => ({
  api: { get: vi.fn(), patch: vi.fn() },
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
  createdAt: "2026-01-15T00:00:00.000Z",
  updatedAt: "2026-01-15T00:00:00.000Z",
};

describe("UpdateTicket", () => {
  afterEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.patch).mockReset();
  });

  it("shows the ticket's current status, category, and assignee", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { agents: [] } });

    renderWithQuery(<UpdateTicket ticket={baseTicket} />);

    expect(await screen.findByRole("combobox", { name: "Status" })).toHaveTextContent("Open");
    expect(screen.getByRole("combobox", { name: "Category" })).toHaveTextContent("None");
    expect(screen.getByRole("combobox", { name: "Assigned To" })).toHaveTextContent("Unassigned");
  });

  it("PATCHes the new status when a different option is selected", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { agents: [] } });
    vi.mocked(api.patch).mockResolvedValue({
      data: { ...baseTicket, status: TicketStatus.resolved },
    });

    const user = userEvent.setup();
    renderWithQuery(<UpdateTicket ticket={baseTicket} />);

    await user.click(await screen.findByRole("combobox", { name: "Status" }));
    await user.click(await screen.findByRole("option", { name: "Resolved" }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/api/tickets/1", { status: TicketStatus.resolved });
    });
  });

  it("PATCHes null when category is cleared back to None", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { agents: [] } });
    vi.mocked(api.patch).mockResolvedValue({ data: { ...baseTicket, category: null } });

    const user = userEvent.setup();
    renderWithQuery(
      <UpdateTicket ticket={{ ...baseTicket, category: TicketCategory.general_question }} />,
    );

    await user.click(await screen.findByRole("combobox", { name: "Category" }));
    await user.click(await screen.findByRole("option", { name: "None" }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/api/tickets/1", { category: null });
    });
  });

  it("PATCHes the selected agent's id when an assignee is chosen", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { agents: [{ id: "agent-1", name: "Grace Hopper" }] },
    });
    vi.mocked(api.patch).mockResolvedValue({
      data: { ...baseTicket, assignedTo: { id: "agent-1", name: "Grace Hopper" } },
    });

    const user = userEvent.setup();
    renderWithQuery(<UpdateTicket ticket={baseTicket} />);

    await user.click(await screen.findByRole("combobox", { name: "Assigned To" }));
    await user.click(await screen.findByRole("option", { name: "Grace Hopper" }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/api/tickets/1", { assignedToId: "agent-1" });
    });
  });
});
