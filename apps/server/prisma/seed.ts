import { randomUUID } from "crypto";
import { hashPassword } from "better-auth/crypto";
import { Role } from "../src/generated/prisma/enums";
import { prisma } from "../src/db";

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD ?? "changeme123";
  const name = process.env.ADMIN_NAME ?? "Admin";

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

  console.log(`Created admin user ${email} / ${password}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
