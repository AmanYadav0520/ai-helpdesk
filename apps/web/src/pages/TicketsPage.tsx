import { useState } from "react";
import { type TicketStatus } from "core/constants/ticket-status";
import { type TicketCategory } from "core/constants/ticket-category";
import { TicketsFilters } from "./TicketsFilters";
import { TicketsTable } from "./TicketsTable";

export interface TicketFilters {
  status?: TicketStatus;
  category?: TicketCategory;
  search?: string;
}

export function TicketsPage() {
  const [filters, setFilters] = useState<TicketFilters>({});

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
      </div>

      <TicketsFilters filters={filters} onChange={setFilters} />
      <TicketsTable filters={filters} />
    </div>
  );
}
