export enum TicketStatus {
  new = "new",
  processing = "processing",
  open = "open",
  resolved = "resolved",
  closed = "closed",
}

export const statusLabel: Record<TicketStatus, string> = {
  [TicketStatus.new]: "New",
  [TicketStatus.processing]: "Processing",
  [TicketStatus.open]: "Open",
  [TicketStatus.resolved]: "Resolved",
  [TicketStatus.closed]: "Closed",
};

export const statusVariant: Record<TicketStatus, "default" | "secondary" | "outline"> = {
  [TicketStatus.new]: "outline",
  [TicketStatus.processing]: "outline",
  [TicketStatus.open]: "default",
  [TicketStatus.resolved]: "secondary",
  [TicketStatus.closed]: "outline",
};

// `new`/`processing` are internal states while AI attempts auto-resolution on arrival —
// agents never filter or manually set a ticket to them, so UI status pickers and the
// status filter/update schemas use this subset instead of Object.values(TicketStatus).
export const agentTicketStatuses = [
  TicketStatus.open,
  TicketStatus.resolved,
  TicketStatus.closed,
] as const;
