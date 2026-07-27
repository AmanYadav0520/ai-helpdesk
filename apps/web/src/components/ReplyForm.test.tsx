import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketStatus } from "core/constants/ticket-status";
import { type Ticket } from "core/constants/ticket";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "../test/render-with-query";
import { api } from "../lib/api";
import ReplyForm from "./ReplyForm";

vi.mock("../lib/api", () => ({
  api: { post: vi.fn() },
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

describe("ReplyForm", () => {
  afterEach(() => {
    vi.mocked(api.post).mockReset();
  });

  it("shows a validation error and does not submit when the body is empty", async () => {
    const user = userEvent.setup();
    renderWithQuery(<ReplyForm ticket={ticket} />);

    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    expect(await screen.findByText("Reply body is required")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("posts the reply and clears the textbox on success", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });

    const user = userEvent.setup();
    renderWithQuery(<ReplyForm ticket={ticket} />);

    const textbox = screen.getByRole("textbox");
    await user.type(textbox, "Thanks for reaching out.");
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/replies", {
        ticketId: 1,
        body: "Thanks for reaching out.",
      });
    });

    await waitFor(() => {
      expect(textbox).toHaveValue("");
    });
  });

  it("shows the server error message when the request fails", async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: "Ticket is closed" } },
    });

    const user = userEvent.setup();
    renderWithQuery(<ReplyForm ticket={ticket} />);

    await user.type(screen.getByRole("textbox"), "Thanks for reaching out.");
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    expect(await screen.findByText("Ticket is closed")).toBeInTheDocument();
  });

  it("replaces the draft with the polished text on success", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { body: "Thank you for reaching out." } });

    const user = userEvent.setup();
    renderWithQuery(<ReplyForm ticket={ticket} />);

    const textbox = screen.getByRole("textbox");
    await user.type(textbox, "thx for msg");
    await user.click(screen.getByRole("button", { name: "Polish" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/replies/polish", { body: "thx for msg" });
    });

    await waitFor(() => {
      expect(textbox).toHaveValue("Thank you for reaching out.");
    });
  });

  it("shows the server error message when polishing fails", async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: "Failed to polish reply." } },
    });

    const user = userEvent.setup();
    renderWithQuery(<ReplyForm ticket={ticket} />);

    await user.type(screen.getByRole("textbox"), "thx for msg");
    await user.click(screen.getByRole("button", { name: "Polish" }));

    expect(await screen.findByText("Failed to polish reply.")).toBeInTheDocument();
  });

  it("does not call the API when polishing an empty draft", async () => {
    const user = userEvent.setup();
    renderWithQuery(<ReplyForm ticket={ticket} />);

    await user.click(screen.getByRole("button", { name: "Polish" }));

    expect(api.post).not.toHaveBeenCalled();
  });
});
