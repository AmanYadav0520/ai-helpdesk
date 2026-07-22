import { Router } from "express";
import multer from "multer";
import Parse from "@sendgrid/inbound-mail-parser";
import { inboundEmailSchema } from "core/schemas/tickets";
import { requireWebhookSecret } from "../require-webhook-secret";
import { validate } from "../lib/validate";
import { parseFromField, stripSubjectPrefixes } from "../lib/parse-inbound-email";
import { prisma } from "../db";

const upload = multer();

const router = Router();

router.post("/inbound-email", requireWebhookSecret, upload.any(), async (req, res) => {
  const parser = new Parse(
    { keys: ["to", "from", "subject", "text", "html"] },
    { body: req.body, files: (req.files as Express.Multer.File[]) || [] },
  );
  const parsed = parser.keyValues();
  const { email, name } = parseFromField(parsed.from || "");

  const data = validate(
    inboundEmailSchema,
    {
      from: email,
      fromName: name,
      subject: parsed.subject || "",
      body: parsed.text || "",
      bodyHtml: parsed.html || undefined,
    },
    res,
  );
  if (!data) return;

  const normalizedSubject = stripSubjectPrefixes(data.subject);

  const existingTicket = await prisma.ticket.findFirst({
    where: {
      senderEmail: data.from,
      status: { notIn: ["resolved", "closed"] },
      subject: { equals: normalizedSubject, mode: "insensitive" },
    },
  });

  if (existingTicket) {
    await prisma.reply.create({
      data: {
        body: data.body,
        bodyHtml: data.bodyHtml ?? null,
        senderType: "customer",
        ticketId: existingTicket.id,
        userId: null,
      },
    });
    res.status(200).json({ ticket: existingTicket });
    return;
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject: normalizedSubject,
      body: data.body,
      bodyHtml: data.bodyHtml ?? null,
      senderName: data.fromName,
      senderEmail: data.from,
      assignedToId: null,
    },
  });

  res.status(201).json({ ticket });
});

export default router;
