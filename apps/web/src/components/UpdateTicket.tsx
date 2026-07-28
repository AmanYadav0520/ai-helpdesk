import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Ticket } from "core/constants/ticket";
import { statusLabel, agentTicketStatuses } from "core/constants/ticket-status";
import { TicketCategory, categoryLabel } from "core/constants/ticket-category";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "../lib/api";

interface Agent {
  id: string;
  name: string;
}

export default function UpdateTicket({ ticket }: { ticket: Ticket }) {
  const queryClient = useQueryClient();

  const { data: agentsData } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data } = await api.get<{ agents: Agent[] }>("/api/agents");
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch(`/api/tickets/${ticket.id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", String(ticket.id)] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  return (
    <Card className="w-56 h-fit">
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Status
          </span>
          <Select
            value={ticket.status}
            onValueChange={(value) => updateMutation.mutate({ status: value })}
          >
            <SelectTrigger size="sm" className="w-full" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {agentTicketStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Category
          </span>
          <Select
            value={ticket.category ?? "none"}
            onValueChange={(value) =>
              updateMutation.mutate({ category: value === "none" ? null : value })
            }
          >
            <SelectTrigger size="sm" className="w-full" aria-label="Category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {Object.values(TicketCategory).map((c) => (
                <SelectItem key={c} value={c}>
                  {categoryLabel[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Assigned To
          </span>
          <Select
            value={ticket.assignedTo?.id ?? "unassigned"}
            onValueChange={(value) =>
              updateMutation.mutate({ assignedToId: value === "unassigned" ? null : value })
            }
          >
            <SelectTrigger size="sm" className="w-full" aria-label="Assigned To">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {agentsData?.agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
