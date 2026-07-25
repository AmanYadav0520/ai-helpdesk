import { render, screen } from "@testing-library/react";
import { TicketStatus } from "core/constants/ticket-status";
import { type Ticket } from "core/constants/ticket";
import { describe, expect, it } from "vitest";
import TicketDetail from "./TicketDetail";

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
  it("renders the subject, status, sender, and plain-text body", () => {
    render(<TicketDetail ticket={baseTicket} />);

    expect(screen.getByRole("heading", { name: "Cannot log in" })).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace <ada@example.com>")).toBeInTheDocument();
    expect(screen.getByText("I forgot my password.")).toBeInTheDocument();
  });

  it("renders sanitized bodyHtml and strips script tags", () => {
    render(
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
});
