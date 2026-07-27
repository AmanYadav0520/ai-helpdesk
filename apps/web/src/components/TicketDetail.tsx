import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { isAxiosError } from "axios";
import { Sparkles } from "lucide-react";
import { type Ticket } from "core/constants/ticket";
import StatusBadge from "@/components/StatusBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "../lib/api";

export default function TicketDetail({ ticket }: { ticket: Ticket }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync: summarizeAsync, isPending: isSummarizing } = useMutation({
    mutationFn: () => api.post<{ summary: string }>(`/api/tickets/${ticket.id}/summarize`),
  });

  const onSummarize = async () => {
    setError(null);

    try {
      const { data } = await summarizeAsync();
      setSummary(data.summary);
    } catch (err) {
      const message = isAxiosError<{ error?: string }>(err)
        ? (err.response?.data.error ?? "Failed to summarize ticket.")
        : "Failed to summarize ticket.";
      setError(message);
    }
  };

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

      <Button variant="outline" onClick={onSummarize} disabled={isSummarizing}>
        <Sparkles />
        {isSummarizing ? "Summarizing..." : summary ? "Regenerate Summary" : "Summarize"}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {summary && (
        <Card>
          <CardContent>
            <p className="whitespace-pre-line text-sm">{summary}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
