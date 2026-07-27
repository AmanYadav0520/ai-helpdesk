import { describe, expect, it } from "bun:test";
import { buildSummarizePrompt } from "./summarize-ticket";

const ticket = {
  subject: "Cannot log in",
  senderName: "Ada Lovelace",
  body: "I forgot my password.",
};

describe("buildSummarizePrompt", () => {
  it("includes the subject and the customer's opening message", () => {
    const prompt = buildSummarizePrompt(ticket, []);

    expect(prompt).toContain("Cannot log in");
    expect(prompt).toContain("Ada Lovelace: I forgot my password.");
  });

  it("labels agent replies as Agent and customer replies by sender name", () => {
    const prompt = buildSummarizePrompt(ticket, [
      { senderType: "agent", body: "Have you tried resetting it?" },
      { senderType: "customer", body: "Yes, that worked." },
    ]);

    expect(prompt).toContain("Agent: Have you tried resetting it?");
    expect(prompt).toContain("Ada Lovelace: Yes, that worked.");
  });

  it("instructs the model to reply with only the summary", () => {
    const prompt = buildSummarizePrompt(ticket, []);

    expect(prompt).toContain("no preamble");
  });
});
