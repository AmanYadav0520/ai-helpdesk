import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { Router } from "express";
import { Role } from "core/constants/role";
import { agentTicketStatuses } from "core/constants/ticket-status";
import { ticketListQuerySchema, updateTicketSchema } from "core/schemas/tickets";
import { prisma } from "../db";
import { buildSummarizePrompt } from "../lib/summarize-ticket";
import { validate } from "../lib/validate";
import { requireAuth } from "../require-auth";

const router = Router();

interface TicketStats {
  total: number;
  open: number;
  aiResolved: number;
  aiResolvedPercent: number;
  avgResolutionMs: number | null;
  dailyVolume: { date: string; count: number }[];
}

router.get("/stats", requireAuth, async (req, res) => {
  const [row] = await prisma.$queryRaw<{ stats: TicketStats }[]>`SELECT get_ticket_stats() AS stats`;
  res.json(row!.stats);
});

router.get("/", requireAuth, async (req, res) => {
  const query = validate(ticketListQuerySchema, req.query, res);
  if (!query) return;

  const { sortBy, sortOrder, status, category, search, page, pageSize } = query;

  const where = {
    status: status ?? { in: agentTicketStatuses },
    ...(category && { category }),
    ...(search && {
      OR: [
        { subject: { contains: search, mode: "insensitive" as const } },
        { senderName: { contains: search, mode: "insensitive" as const } },
        { senderEmail: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { assignedTo: { select: { id: true, name: true } } },
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({ tickets, total, page, pageSize });
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  res.json(ticket);
});

router.post("/:id/summarize", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const replies = await prisma.reply.findMany({
    where: { ticketId: id },
    orderBy: { createdAt: "asc" },
  });

  const { text } = await generateText({
    model: openai("gpt-5-nano"),
    prompt: buildSummarizePrompt(ticket, replies),
  });

  res.json({ summary: text });
});

router.patch("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const data = validate(updateTicketSchema, req.body, res);
  if (!data) return;

  if (data.assignedToId) {
    const agent = await prisma.user.findUnique({ where: { id: data.assignedToId } });
    if (!agent || agent.role !== Role.agent || agent.deletedAt) {
      res.status(400).json({ error: "Invalid assignee" });
      return;
    }
  }

  const ticket = await prisma.ticket.update({
    where: { id },
    data,
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  res.json(ticket);
});

export default router;
