import { TicketStatus } from "core/constants/ticket-status";
import { TicketCategory } from "core/constants/ticket-category";
import { Role } from "core/constants/role";
import { AI_AGENT_EMAIL } from "../src/lib/ai-agent";
import { prisma } from "../src/db";

interface IssueTemplate {
  subject: string;
  body: string;
  category: TicketCategory | null;
}

const TECHNICAL_ISSUES: IssueTemplate[] = [
  {
    subject: "Unable to reset my password",
    body: "I requested a password reset three times but the email never arrives. I've checked spam. Can someone reset it manually?",
    category: TicketCategory.technical_question,
  },
  {
    subject: "App crashes when opening the reports tab",
    body: "Every time I click on Reports the whole app freezes for a few seconds and then closes. Happens on both Chrome and Edge.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Two-factor authentication code never arrives via SMS",
    body: "I enabled 2FA last week and now I can't log in because the SMS code never shows up. I've tried resending it five times.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "API returns 500 error on POST /webhooks",
    body: "Our integration has been failing since yesterday. Every POST to /webhooks returns a 500 with no body. Nothing changed on our end.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "CSV export gets stuck at 0% and never completes",
    body: "I'm trying to export our contact list but the progress bar sits at 0% forever. Tried on two different browsers.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Slack integration keeps disconnecting",
    body: "Our Slack channel stops receiving notifications every few hours and I have to manually reconnect it. Very disruptive for the team.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Dashboard charts won't load in Firefox",
    body: "All the charts on the main dashboard just show a blank grey box in Firefox. Works fine in Chrome though.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Can't upload attachments larger than 10MB",
    body: "I'm trying to attach a design file that's about 15MB and it just fails silently with no error message.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "SSO login redirects to a blank white page",
    body: "After entering our company SSO credentials, we get redirected back to your app but the page is completely blank.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Webhook signature verification keeps failing",
    body: "We're computing the HMAC exactly as documented but every webhook we receive fails signature verification on our end.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Mobile app won't sync with desktop changes",
    body: "Changes I make on the desktop site don't show up on the mobile app until I force-quit and reopen it, sometimes not even then.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Getting 'Invalid API key' despite using the correct key",
    body: "I copy-pasted the API key directly from the settings page and I'm still getting an 'Invalid API key' error on every request.",
    category: TicketCategory.technical_question,
  },
];

const GENERAL_ISSUES: IssueTemplate[] = [
  {
    subject: "What's included in the Pro plan?",
    body: "Trying to decide between Basic and Pro. Could you send over a feature comparison, specifically around API access?",
    category: TicketCategory.general_question,
  },
  {
    subject: "How do I add a new team member?",
    body: "I don't see an 'invite' button anywhere in settings. Where do I go to add a colleague to our workspace?",
    category: TicketCategory.general_question,
  },
  {
    subject: "Is there a mobile app for iOS?",
    body: "We mostly work from our phones. Is there a native iOS app, or is the mobile site the only option right now?",
    category: TicketCategory.general_question,
  },
  {
    subject: "Can I change my billing cycle from monthly to annual?",
    body: "We'd like to switch to annual billing to get the discount. How do I do that without losing my current usage history?",
    category: TicketCategory.general_question,
  },
  {
    subject: "How do I export all of my data?",
    body: "We might be moving to a different tool and want to make sure we can get a full export of everything first.",
    category: TicketCategory.general_question,
  },
  {
    subject: "Do you offer a student or nonprofit discount?",
    body: "We're a small nonprofit and the standard pricing is a bit out of reach. Do you have any discount programs?",
    category: TicketCategory.general_question,
  },
  {
    subject: "What is your data retention policy?",
    body: "Our legal team is asking how long you retain customer data after an account is closed. Could you point me to documentation on this?",
    category: TicketCategory.general_question,
  },
  {
    subject: "How do I set up email forwarding rules?",
    body: "We want incoming support emails to also forward to our internal Zendesk. Is that possible from your side?",
    category: TicketCategory.general_question,
  },
  {
    subject: "Can multiple people share one account login?",
    body: "Is it against your terms of service for three of us to log into the same account, or do we each need a seat?",
    category: TicketCategory.general_question,
  },
  {
    subject: "Where can I find the API documentation?",
    body: "I searched the help center but couldn't find developer docs anywhere. Is there a public API reference?",
    category: TicketCategory.general_question,
  },
  {
    subject: "How many seats are included in the Team plan?",
    body: "The pricing page mentions the Team plan but doesn't say how many seats come with it by default.",
    category: TicketCategory.general_question,
  },
  {
    subject: "Can I get an invoice instead of a receipt?",
    body: "Our finance department needs a proper invoice with our company details on it, not just the receipt email.",
    category: TicketCategory.general_question,
  },
];

const REFUND_ISSUES: IssueTemplate[] = [
  {
    subject: "Requesting a refund for an accidental annual upgrade",
    body: "I meant to click 'monthly' but got charged for the full year. Could this be reversed and switched back to monthly?",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Charged twice for the same month",
    body: "My card statement shows two identical charges from you on the same day. Please refund the duplicate.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Want a refund, I never actually used the service",
    body: "I signed up during a free trial promo but forgot to cancel and got charged. I never logged in even once.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Refund request due to duplicate subscription",
    body: "It looks like I have two active subscriptions under the same email. I only need one, please refund the other.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Cancelled last month but was still charged",
    body: "I cancelled my subscription on the 3rd but got billed again on the 15th. Can you refund this and confirm cancellation?",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Refund for downtime during last week's outage",
    body: "Your service was down for almost two full days last week which cost us real business. Requesting a partial refund for that period.",
    category: TicketCategory.refund_request,
  },
];

const UNTRIAGED_ISSUES: IssueTemplate[] = [
  {
    subject: "Question about my account",
    body: "Hi, I have a question about my account but I'm not sure who to ask. Can someone get back to me?",
    category: null,
  },
  {
    subject: "Need help ASAP",
    body: "This is urgent, please call me back as soon as you can. I'll explain over the phone.",
    category: null,
  },
  {
    subject: "Following up on my previous email",
    body: "Just following up, haven't heard back yet. Any update?",
    category: null,
  },
  {
    subject: "Quick question",
    body: "Hey, quick question for you when you get a chance. Let me know the best way to reach you.",
    category: null,
  },
];

const ISSUES: IssueTemplate[] = [
  ...TECHNICAL_ISSUES,
  ...GENERAL_ISSUES,
  ...REFUND_ISSUES,
  ...UNTRIAGED_ISSUES,
];

const FIRST_NAMES = [
  "Olivia",
  "Liam",
  "Emma",
  "Noah",
  "Ava",
  "Ethan",
  "Sophia",
  "Mason",
  "Isabella",
  "Lucas",
];

const LAST_NAMES = [
  "Nguyen",
  "Garcia",
  "Smith",
  "Patel",
  "Kim",
  "Rossi",
  "Muller",
  "Dubois",
  "Johansson",
  "Okafor",
];

const DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "icloud.com",
  "protonmail.com",
  "acmecorp.com",
  "globexcorp.com",
  "initech.io",
  "umbrella.co",
  "starkindustries.com",
];

function buildCustomers() {
  const customers: { senderName: string; senderEmail: string }[] = [];
  for (const first of FIRST_NAMES) {
    for (const last of LAST_NAMES) {
      const domain = DOMAINS[customers.length % DOMAINS.length];
      customers.push({
        senderName: `${first} ${last}`,
        senderEmail: `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`,
      });
    }
  }
  return customers;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickStatus(ageDays: number): TicketStatus {
  if (ageDays < 3) return TicketStatus.open;

  const r = Math.random();
  if (ageDays > 45) {
    if (r < 0.6) return TicketStatus.closed;
    if (r < 0.9) return TicketStatus.resolved;
    return TicketStatus.open;
  }

  if (r < 0.45) return TicketStatus.open;
  if (r < 0.8) return TicketStatus.resolved;
  return TicketStatus.closed;
}

async function main() {
  const agents = await prisma.user.findMany({
    where: { role: Role.agent, deletedAt: null, email: { not: AI_AGENT_EMAIL } },
    select: { id: true },
  });

  if (agents.length === 0) {
    console.log("No agent users found — all seeded tickets will be unassigned.");
  }

  const customers = buildCustomers();
  const now = Date.now();

  const tickets = customers.map((customer, i) => {
    const issue = ISSUES[i % ISSUES.length];
    const ageDays = randomInt(0, 90);
    const createdAt = new Date(now - ageDays * 24 * 60 * 60 * 1000);
    const status = pickStatus(ageDays);

    const updatedAt =
      status === TicketStatus.open
        ? createdAt
        : new Date(
            Math.min(now, createdAt.getTime() + randomInt(1, Math.max(ageDays, 1)) * 24 * 60 * 60 * 1000),
          );

    const assignChance = status === TicketStatus.open ? 0.4 : 0.8;
    const assignedToId =
      agents.length > 0 && Math.random() < assignChance
        ? agents[randomInt(0, agents.length - 1)].id
        : null;

    return {
      subject: issue.subject,
      body: issue.body,
      category: issue.category,
      status,
      senderName: customer.senderName,
      senderEmail: customer.senderEmail,
      assignedToId,
      createdAt,
      updatedAt,
    };
  });

  await prisma.ticket.createMany({ data: tickets });

  console.log(`Created ${tickets.length} tickets.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
