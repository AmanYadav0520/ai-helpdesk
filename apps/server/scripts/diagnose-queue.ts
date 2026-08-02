import { prisma } from "../src/db";

const rows = await prisma.$queryRawUnsafe(
  `SELECT * FROM pgboss.job WHERE name IN ('classify-ticket', 'auto-resolve-ticket', 'send-email') LIMIT 15`,
);

console.log(JSON.stringify(rows, null, 2));
process.exit(0);
