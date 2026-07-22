import { Router } from "express";
import { createReplySchema } from "core/schemas/replies";
import { prisma } from "../db";
import { validate } from "../lib/validate";
import { requireAuth } from "../require-auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const ticketId = Number(req.query.ticketId);
  if (!Number.isInteger(ticketId)) {
    res.status(400).json({ error: "ticketId is required" });
    return;
  }

  const replies = await prisma.reply.findMany({
    where: { ticketId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  res.json({ replies });
});

router.post("/", requireAuth, async (req, res) => {
  const data = validate(createReplySchema, req.body, res);
  if (!data) return;

  const ticket = await prisma.ticket.findUnique({ where: { id: data.ticketId } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const reply = await prisma.reply.create({
    data: {
      body: data.body,
      senderType: "agent",
      ticketId: data.ticketId,
      userId: req.user!.id,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  res.status(201).json(reply);
});

export default router;
