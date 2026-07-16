import { randomUUID } from "crypto";
import { Router } from "express";
import { hashPassword } from "better-auth/crypto";
import { Role } from "core/constants/role";
import { createUserSchema, updateUserSchema } from "core/schemas/users";
import { prisma } from "../db";
import { validate } from "../lib/validate";
import { requireAdmin } from "../require-admin";
import { requireAuth } from "../require-auth";

const router = Router();

router.get("/", requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ users });
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const data = validate(createUserSchema, req.body, res);
  if (!data) return;

  const { name, email, password } = data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already exists" });
    return;
  }

  const hashedPassword = await hashPassword(password);
  const userId = randomUUID();
  const now = new Date();

  const user = await prisma.user.create({
    data: {
      id: userId,
      name,
      email,
      role: Role.agent,
      createdAt: now,
      updatedAt: now,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          password: hashedPassword,
          createdAt: now,
          updatedAt: now,
        },
      },
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  res.status(201).json({ user });
});

router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id as string;

  const data = validate(updateUserSchema, req.body, res);
  if (!data) return;

  const { name, email, password } = data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== id) {
    res.status(409).json({ error: "Email already exists" });
    return;
  }

  const now = new Date();

  await prisma.user.update({
    where: { id },
    data: { name, email, updatedAt: now },
  });

  if (password) {
    const hashedPassword = await hashPassword(password);
    await prisma.account.updateMany({
      where: { userId: id, providerId: "credential" },
      data: { password: hashedPassword, updatedAt: now },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  res.json({ user });
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id as string;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.role === Role.admin) {
    res.status(403).json({ error: "Admin users cannot be deleted" });
    return;
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await prisma.session.deleteMany({ where: { userId: id } });

  res.json({ message: "User deleted" });
});

export default router;
