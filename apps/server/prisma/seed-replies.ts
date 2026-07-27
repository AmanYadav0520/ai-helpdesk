import { Role } from "core/constants/role";
import { SenderType } from "core/constants/sender-type";
import { prisma } from "../src/db";

const TICKET_ID = 110;
const REPLY_COUNT = 20;
const MIN_LINES = 10;

const AGENT_DETAIL_LINES = [
  "I checked our server logs from the last 24 hours and didn't see any related error codes on our side.",
  "Our engineering team pushed a fix earlier today that specifically targets this kind of issue, so it's worth trying again.",
  "Could you confirm which browser and version you're using so I can rule out anything client-specific?",
  "In the meantime, clearing your browser cache and cookies has resolved this for a few other customers this week.",
  "I've also flagged your account internally so the next tier of support can take a closer look if this keeps happening.",
  "Just to set expectations, a permanent fix from engineering is currently scheduled for the next release cycle.",
  "I tested the exact steps you described on my end and wasn't able to reproduce the issue, which suggests something environment-specific.",
  "Would you be able to try this from a different network, like your phone's hotspot, just to isolate whether it's connection-related?",
  "I've attached a short screen recording showing the expected behavior on our side for comparison.",
  "Our status page currently shows all systems operational, so this doesn't appear to be a wider outage.",
  "I went ahead and reset the relevant settings on your account as a precaution.",
  "If you're comfortable sharing a screenshot of the exact error message, that would help us narrow things down faster.",
  "I've escalated this ticket internally with high priority given how long it's been open.",
  "One more thing worth checking — do you have any browser extensions installed that might interfere with the page?",
  "I want to make sure we get this fully resolved rather than just patched over, so I appreciate your patience.",
  "I'll keep monitoring this ticket closely and will follow up as soon as I hear back from engineering.",
  "Based on the timestamps you shared, this lines up with a brief incident we already resolved last week.",
  "I've also double-checked your account permissions and everything looks correctly configured on our end.",
  "Let's schedule a quick call if this isn't resolved by tomorrow so we can troubleshoot together in real time.",
  "Thanks again for the detailed information — it's genuinely helpful in tracking this down.",
];

const CUSTOMER_DETAIL_LINES = [
  "I tried again this morning and unfortunately I'm still seeing the exact same problem.",
  "It's happening consistently, not just once, so I don't think it's a fluke on my end.",
  "I double-checked and I'm on the latest version of the app, so that's not the issue.",
  "This is starting to affect my team since we rely on this feature daily.",
  "I already cleared my cache and cookies like you suggested, but no change.",
  "Here's a description of the error message I'm getting, in case that helps.",
  "I tested it on my phone as well and got the same result there too.",
  "Is there any workaround I can use in the meantime while this gets sorted out?",
  "I appreciate you looking into this so quickly, it really does help.",
  "Just to clarify, this only started happening after the update earlier this week.",
  "I tried a different browser and the issue still shows up in the same way.",
  "Do you have a rough estimate of when this might be fixed?",
  "I've noted the exact timestamps of when this happened, in case the logs help.",
  "My colleague is seeing the exact same thing on their account as well.",
  "I restarted my device and tried again, but the problem is still there.",
  "Thanks for the update, I'll keep an eye out and let you know if anything changes.",
  "This is a bit urgent on our end since it's blocking a deadline this week.",
  "I don't have any unusual extensions installed, just the standard browser setup.",
  "Let me know if there's anything else you need from me to help speed this up.",
  "Really appreciate the quick responses, it's been a smooth support experience so far.",
];

function circularSlice<T>(pool: T[], start: number, count: number): T[] {
  return Array.from({ length: count }, (_, i) => pool[(start + i) % pool.length]);
}

function buildAgentBody(turnIndex: number, subject: string, customerFirstName: string, agentName: string) {
  const details = circularSlice(AGENT_DETAIL_LINES, turnIndex * 3, 6);
  const body = [
    `Hi ${customerFirstName},`,
    "",
    `Thanks for following up on "${subject}" — here's where things stand on our end.`,
    "",
    ...details,
    "",
    "Please let me know if anything above doesn't match what you're seeing.",
    "",
    "Best,",
    agentName,
  ].join("\n");

  return body;
}

function buildCustomerBody(turnIndex: number, subject: string, senderName: string) {
  const details = circularSlice(CUSTOMER_DETAIL_LINES, turnIndex * 3, 6);
  const body = [
    "Hi,",
    "",
    `Thanks for the update on "${subject}".`,
    "",
    ...details,
    "",
    "Let me know what you need from me next.",
    "",
    senderName,
  ].join("\n");

  return body;
}

async function main() {
  const ticket = await prisma.ticket.findUnique({ where: { id: TICKET_ID } });
  if (!ticket) {
    throw new Error(`Ticket ${TICKET_ID} not found — seed some tickets first (bun run seed:tickets).`);
  }

  const assignedAgent =
    ticket.assignedToId && (await prisma.user.findFirst({ where: { id: ticket.assignedToId, deletedAt: null } }));

  const agent =
    assignedAgent ||
    (await prisma.user.findFirst({ where: { role: Role.agent, deletedAt: null } })) ||
    (await prisma.user.findFirst({ where: { role: Role.admin, deletedAt: null } }));

  if (!agent) {
    throw new Error("No active users found to author agent replies — seed a user first (bun run seed).");
  }

  const customerFirstName = ticket.senderName.trim().split(/\s+/)[0] ?? ticket.senderName;

  const replies = Array.from({ length: REPLY_COUNT }, (_, i) => {
    const isAgentTurn = i % 2 === 0;
    const turnIndex = Math.floor(i / 2);
    const body = isAgentTurn
      ? buildAgentBody(turnIndex, ticket.subject, customerFirstName, agent.name)
      : buildCustomerBody(turnIndex, ticket.subject, ticket.senderName);

    if (body.split("\n").length < MIN_LINES) {
      throw new Error(`Generated reply ${i} has fewer than ${MIN_LINES} lines.`);
    }

    return {
      body,
      senderType: isAgentTurn ? SenderType.agent : SenderType.customer,
      ticketId: ticket.id,
      userId: isAgentTurn ? agent.id : null,
      createdAt: new Date(ticket.createdAt.getTime() + (i + 1) * 3 * 60 * 60 * 1000),
    };
  });

  await prisma.reply.createMany({ data: replies });

  console.log(`Created ${replies.length} replies for ticket ${ticket.id} ("${ticket.subject}").`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
