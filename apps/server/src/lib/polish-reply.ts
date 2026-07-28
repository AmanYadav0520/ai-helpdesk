export function getCustomerFirstName(senderName: string): string {
  const trimmed = senderName.trim();
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function buildPolishPrompt(body: string, customerFirstName: string): string {
  return (
    "Rewrite the following help desk agent reply to be clearer, more professional, and customer-friendly, while preserving its meaning and intent. " +
    `Address the customer by their first name ("${customerFirstName}") near the start of the reply. ` +
    "Format the response clearly, with line breaks between paragraphs and bullet points or numbered lists when listing steps or multiple items. " +
    "Reply with only the rewritten text — no preamble, no quotes, no signature or sign-off.\n\n" +
    body
  );
}

export function signReply(text: string): string {
  return `${text.trim()}\n\n— Helpdesk Support`;
}
