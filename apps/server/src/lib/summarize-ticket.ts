interface TranscriptTicket {
  subject: string;
  senderName: string;
  body: string;
}

interface TranscriptReply {
  senderType: string;
  body: string;
}

export function buildSummarizePrompt(ticket: TranscriptTicket, replies: TranscriptReply[]): string {
  const transcript = [
    `${ticket.senderName}: ${ticket.body}`,
    ...replies.map((reply) => `${reply.senderType === "agent" ? "Agent" : ticket.senderName}: ${reply.body}`),
  ].join("\n\n");

  return `Summarize the following help desk ticket and its conversation history for an agent picking up the case. Cover the customer's issue, key details, and the current state of the conversation. Reply with only the summary text — no preamble.\n\nSubject: ${ticket.subject}\n\n${transcript}`;
}
