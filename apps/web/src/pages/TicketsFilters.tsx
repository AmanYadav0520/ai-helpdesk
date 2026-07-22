import { Search } from "lucide-react";
import { TicketStatus, statusLabel } from "core/constants/ticket-status";
import { TicketCategory, categoryLabel } from "core/constants/ticket-category";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TicketFilters as TicketFiltersState } from "./TicketsPage";

const ALL = "__all__";

type TicketsFiltersProps = {
  filters: TicketFiltersState;
  onChange: (filters: TicketFiltersState) => void;
};

export function TicketsFilters({ filters, onChange }: TicketsFiltersProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tickets..."
          className="pl-8"
          value={filters.search ?? ""}
          onChange={(e) =>
            onChange({ ...filters, search: e.target.value || undefined })
          }
        />
      </div>

      <Select
        value={filters.status ?? ALL}
        onValueChange={(value) =>
          onChange({ ...filters, status: value === ALL ? undefined : (value as TicketStatus) })
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {Object.values(TicketStatus).map((status) => (
            <SelectItem key={status} value={status}>
              {statusLabel[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.category ?? ALL}
        onValueChange={(value) =>
          onChange({ ...filters, category: value === ALL ? undefined : (value as TicketCategory) })
        }
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All categories</SelectItem>
          {Object.values(TicketCategory).map((category) => (
            <SelectItem key={category} value={category}>
              {categoryLabel[category]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
