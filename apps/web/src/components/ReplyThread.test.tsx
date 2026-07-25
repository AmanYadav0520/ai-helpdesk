import { screen, waitFor } from "@testing-library/react";
import { TicketStatus } from "core/constants/ticket-status";
import { SenderType } from "core/constants/sender-type";
import { type Ticket } from "core/constants/ticket";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "../test/render-with-query";
import { api } from "../lib/api";
import ReplyThread from "./ReplyThread";

vi.mock("../lib/api", () => ({
  api: { get: vi.fn() },
}));

const ticket: Ticket = {
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

describe("ReplyThread", () => {
  afterEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("shows 'No replies yet.' when there are none", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { replies: [] } });

    renderWithQuery(<ReplyThread ticket={ticket} />);

    expect(await screen.findByText("No replies yet.")).toBeInTheDocument();
  });

  it("renders a customer reply attributed to the ticket's sender", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        replies: [
          {
            id: 1,
            body: "Still broken.",
            bodyHtml: null,
            senderType: SenderType.customer,
            user: null,
            createdAt: "2026-01-15T10:00:00.000Z",
          },
        ],
      },
    });

    renderWithQuery(<ReplyThread ticket={ticket} />);

    expect(await screen.findByText("Still broken.")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("renders an agent reply attributed to the replying user", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        replies: [
          {
            id: 2,
            body: "Please try resetting your password.",
            bodyHtml: null,
            senderType: SenderType.agent,
            user: { id: "u1", name: "Grace Hopper" },
            createdAt: "2026-01-15T11:00:00.000Z",
          },
        ],
      },
    });

    renderWithQuery(<ReplyThread ticket={ticket} />);

    expect(await screen.findByText("Please try resetting your password.")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });

  it("shows an error alert when the request fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("network error"));

    renderWithQuery(<ReplyThread ticket={ticket} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load replies")).toBeInTheDocument();
    });
  });
});
