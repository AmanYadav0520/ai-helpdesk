import { randomUUID } from "crypto";
import { hashPassword } from "better-auth/crypto";
import { Role } from "../src/generated/prisma/enums";
import { AI_AGENT_EMAIL } from "../src/lib/ai-agent";
import { prisma } from "../src/db";

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin";

  if (!password) {
    throw new Error("ADMIN_PASSWORD environment variable is required to seed the admin user");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists (id=${existing.id}), skipping.`);
    return;
  }

  const hash = await hashPassword(password);
  const userId = randomUUID();
  const now = new Date();

  await prisma.user.create({
    data: {
      id: userId,
      name,
      email,
      emailVerified: true,
      role: Role.admin,
      createdAt: now,
      updatedAt: now,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          password: hash,
          createdAt: now,
          updatedAt: now,
        },
      },
    },
  });

  console.log(`Created admin user ${email}`);
}

async function seedAiAgent() {
  const existing = await prisma.user.findUnique({ where: { email: AI_AGENT_EMAIL } });
  if (existing) {
    console.log(`Ai agent already exists (${AI_AGENT_EMAIL}), skipping.`);
    return;
  }

  const now = new Date();

  await prisma.user.create({
    data: {
      id: randomUUID(),
      name: "Ai",
      email: AI_AGENT_EMAIL,
      emailVerified: true,
      role: Role.agent,
      createdAt: now,
      updatedAt: now,
    },
  });

  console.log(`Created Ai agent (${AI_AGENT_EMAIL})`);
}

main()
  .then(seedAiAgent)
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
