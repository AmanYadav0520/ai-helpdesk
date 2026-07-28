import { describe, expect, it } from "bun:test";
import { buildPolishPrompt, getCustomerFirstName, signReply } from "./polish-reply";

describe("getCustomerFirstName", () => {
  it("returns the first word of a full name", () => {
    expect(getCustomerFirstName("Ada Lovelace")).toBe("Ada");
  });

  it("returns the whole name when there is only one word", () => {
    expect(getCustomerFirstName("Ada")).toBe("Ada");
  });

  it("ignores leading/trailing whitespace and repeated spaces", () => {
    expect(getCustomerFirstName("  Ada   Lovelace  ")).toBe("Ada");
  });
});

describe("buildPolishPrompt", () => {
  it("includes the customer's first name and the draft body", () => {
    const prompt = buildPolishPrompt("thx for msg", "Ada");

    expect(prompt).toContain("Ada");
    expect(prompt).toContain("thx for msg");
  });

  it("instructs the model not to add its own signature", () => {
    const prompt = buildPolishPrompt("thx for msg", "Ada");

    expect(prompt).toContain("no signature or sign-off");
  });
});

describe("signReply", () => {
  it("appends the Helpdesk Support sign-off on a new line", () => {
    expect(signReply("Thank you for reaching out.")).toBe(
      "Thank you for reaching out.\n\n— Helpdesk Support",
    );
  });

  it("trims the polished text before signing", () => {
    expect(signReply("  Thank you.  ")).toBe("Thank you.\n\n— Helpdesk Support");
  });
});
