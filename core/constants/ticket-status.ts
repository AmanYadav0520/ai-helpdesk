export enum TicketStatus {
  open = "open",
  resolved = "resolved",
  closed = "closed",
}

export const statusLabel: Record<TicketStatus, string> = {
  [TicketStatus.open]: "Open",
  [TicketStatus.resolved]: "Resolved",
  [TicketStatus.closed]: "Closed",
};

export const statusVariant: Record<TicketStatus, "default" | "secondary" | "outline"> = {
  [TicketStatus.open]: "default",
  [TicketStatus.resolved]: "secondary",
  [TicketStatus.closed]: "outline",
};
