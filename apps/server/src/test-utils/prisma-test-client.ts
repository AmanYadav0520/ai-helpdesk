import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Creates a standalone Prisma client for direct database manipulation from
 * E2E tests (e.g. forcing a session row to expire). This is test-only
 * infrastructure — the running app always uses `src/db.ts` instead.
 */
export function createTestDbClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}
