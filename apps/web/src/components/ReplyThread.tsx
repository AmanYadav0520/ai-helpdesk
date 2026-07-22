import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { Bot, User } from "lucide-react";
import { type Ticket } from "core/constants/ticket";
import { type SenderType } from "core/constants/sender-type";
import ErrorAlert from "@/components/ErrorAlert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../lib/api";

interface Reply {
  id: number;
  body: string;
  bodyHtml: string | null;
  senderType: SenderType;
  user: { id: string; name: string } | null;
  createdAt: string;
}

export default function ReplyThread({ ticket }: { ticket: Ticket }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["replies", ticket.id],
    queryFn: async () => {
      const { data } = await api.get<{ replies: Reply[] }>("/api/replies", {
        params: { ticketId: ticket.id },
      });
      return data.replies;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message="Failed to load replies" />;
  }

  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">No replies yet.</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((reply) => (
        <Card key={reply.id}>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {reply.senderType === "agent" ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              <span className="font-medium text-foreground">
                {reply.senderType === "agent" ? (reply.user?.name ?? "Agent") : ticket.senderName}
              </span>
              <span>{new Date(reply.createdAt).toLocaleString()}</span>
            </div>
            {reply.bodyHtml ? (
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reply.bodyHtml) }} />
            ) : (
              <p className="whitespace-pre-line text-sm">{reply.body}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
