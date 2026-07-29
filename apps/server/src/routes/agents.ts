import { Router } from "express";
import { Role } from "core/constants/role";
import { AI_AGENT_EMAIL } from "../lib/ai-agent";
import { prisma } from "../db";
import { requireAuth } from "../require-auth";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { role: Role.agent, deletedAt: null, email: { not: AI_AGENT_EMAIL } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  res.json({ agents });
});

export default router;
