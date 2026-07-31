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

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted-foreground">
        <div>
          <span className="font-medium text-foreground">From:</span> {ticket.senderName} (
          {ticket.senderEmail})
        </div>
        <div>
          <span className="font-medium text-foreground">Created:</span>{" "}
          {new Date(ticket.createdAt).toLocaleString()}
        </div>
        <div>
          <span className="font-medium text-foreground">Updated:</span>{" "}
          {new Date(ticket.updatedAt).toLocaleString()}
        </div>
      </div>

      <Card>
        <CardContent>
          {ticket.bodyHtml ? (
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ticket.bodyHtml) }} />
          ) : (
            <p className="whitespace-pre-line leading-relaxed">{ticket.body}</p>
          )}
        </CardContent>
      </Card>

      <Button variant="outline" onClick={onSummarize} disabled={isSummarizing} className="gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        {isSummarizing ? "Summarizing..." : summary ? "Regenerate Summary" : "Summarize"}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {summary && (
        <Card className="border-chart-3/25 bg-chart-3/5">
          <CardContent>
            <div className="flex items-start gap-2.5">
              <div className="h-6 w-6 rounded-md bg-chart-3/15 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-3.5 w-3.5 text-chart-3" />
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed">{summary}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
