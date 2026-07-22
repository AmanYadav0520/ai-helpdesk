import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { type Ticket } from "core/constants/ticket";
import ErrorAlert from "@/components/ErrorAlert";
import BackLink from "@/components/BackLink";
import TicketDetailSkeleton from "@/components/TicketDetailSkeleton";
import TicketDetail from "@/components/TicketDetail";
import UpdateTicket from "@/components/UpdateTicket";
import ReplyThread from "@/components/ReplyThread";
import ReplyForm from "@/components/ReplyForm";
import { api } from "../lib/api";
import { isAxiosError } from "axios";

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();

  const {
    data: ticket,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const { data } = await api.get<Ticket>(`/api/tickets/${id}`);
      return data;
    },
  });

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-6">
      <BackLink to="/tickets">Back to tickets</BackLink>

      {isLoading && <TicketDetailSkeleton />}

      {error && (
        <ErrorAlert
          message={
            isAxiosError(error) && error.response?.status === 404
              ? "Ticket not found"
              : "Failed to load ticket"
          }
        />
      )}

      {ticket && (
        <div className="grid grid-cols-[1fr_auto] gap-6">
          <div className="space-y-6">
            <TicketDetail ticket={ticket} />

            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Replies</h2>
              <ReplyThread ticket={ticket} />
            </div>

            <div className="space-y-3 pb-16">
              <h2 className="text-lg font-semibold">Add a Reply</h2>
              <ReplyForm ticket={ticket} />
            </div>
          </div>

          <UpdateTicket ticket={ticket} />
        </div>
      )}
    </div>
  );
}
