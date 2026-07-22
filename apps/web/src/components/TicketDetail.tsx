import DOMPurify from "dompurify";
import { type Ticket } from "core/constants/ticket";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";

export default function TicketDetail({ ticket }: { ticket: Ticket }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{ticket.subject}</h1>
        <StatusBadge status={ticket.status} />
      </div>

      <div className="text-sm text-muted-foreground space-y-0.5">
        <div>
          {ticket.senderName} &lt;{ticket.senderEmail}&gt;
        </div>
        <div>Created {new Date(ticket.createdAt).toLocaleString()}</div>
        <div>Updated {new Date(ticket.updatedAt).toLocaleString()}</div>
      </div>

      <Card>
        <CardContent>
          {ticket.bodyHtml ? (
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ticket.bodyHtml) }} />
          ) : (
            <p className="whitespace-pre-line">{ticket.body}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
