import { Router } from "express";
import { Role } from "core/constants/role";
import { prisma } from "../db";
import { requireAuth } from "../require-auth";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { role: Role.agent, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  res.json({ agents });
});

export default router;
