import { prisma } from "../src/db";

const rows = await prisma.$queryRawUnsafe(
  `SELECT id, name, state, retrycount, retrylimit, createdon, startedon, completedon, output
   FROM pgboss.job
   WHERE name IN ('classify-ticket', 'auto-resolve-ticket', 'send-email')
   ORDER BY createdon DESC
   LIMIT 15`,
);

console.log(JSON.stringify(rows, null, 2));
process.exit(0);
