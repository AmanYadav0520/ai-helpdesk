import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketStatus } from "core/constants/ticket-status";
import { TicketCategory } from "core/constants/ticket-category";
import { describe, expect, it, vi } from "vitest";
import { TicketsFilters } from "./TicketsFilters";
import type { TicketFilters as TicketFiltersState } from "./TicketsPage";

function renderFilters(filters: TicketFiltersState = {}) {
  const onChange = vi.fn();
  render(<TicketsFilters filters={filters} onChange={onChange} />);
  return onChange;
}

describe("TicketsFilters", () => {
  it("reflects the current search value", () => {
    renderFilters({ search: "billing" });

    expect(screen.getByPlaceholderText("Search tickets...")).toHaveValue("billing");
  });

  it("calls onChange with the new search term, preserving other filters", () => {
    const onChange = renderFilters({ status: TicketStatus.open });

    fireEvent.change(screen.getByPlaceholderText("Search tickets..."), {
      target: { value: "refund" },
    });

    expect(onChange).toHaveBeenCalledWith({ status: TicketStatus.open, search: "refund" });
  });

  it("clears search to undefined when the input is emptied", () => {
    const onChange = renderFilters({ search: "refund" });

    fireEvent.change(screen.getByPlaceholderText("Search tickets..."), {
      target: { value: "" },
    });

    expect(onChange).toHaveBeenCalledWith({ search: undefined });
  });

  it("calls onChange with the selected status, preserving other filters", async () => {
    const user = userEvent.setup();
    const onChange = renderFilters({ search: "refund" });

    const [statusTrigger] = screen.getAllByRole("combobox");
    await user.click(statusTrigger);
    await user.click(await screen.findByRole("option", { name: "Resolved" }));

    expect(onChange).toHaveBeenCalledWith({ search: "refund", status: TicketStatus.resolved });
  });

  it("clears status to undefined when 'All statuses' is selected", async () => {
    const user = userEvent.setup();
    const onChange = renderFilters({ status: TicketStatus.open });

    const [statusTrigger] = screen.getAllByRole("combobox");
    await user.click(statusTrigger);
    await user.click(await screen.findByRole("option", { name: "All statuses" }));

    expect(onChange).toHaveBeenCalledWith({ status: undefined });
  });

  it("calls onChange with the selected category, preserving other filters", async () => {
    const user = userEvent.setup();
    const onChange = renderFilters({ search: "refund" });

    const [, categoryTrigger] = screen.getAllByRole("combobox");
    await user.click(categoryTrigger);
    await user.click(await screen.findByRole("option", { name: "Refund" }));

    expect(onChange).toHaveBeenCalledWith({
      search: "refund",
      category: TicketCategory.refund_request,
    });
  });

  it("clears category to undefined when 'All categories' is selected", async () => {
    const user = userEvent.setup();
    const onChange = renderFilters({ category: TicketCategory.technical_question });

    const [, categoryTrigger] = screen.getAllByRole("combobox");
    await user.click(categoryTrigger);
    await user.click(await screen.findByRole("option", { name: "All categories" }));

    expect(onChange).toHaveBeenCalledWith({ category: undefined });
  });
});
