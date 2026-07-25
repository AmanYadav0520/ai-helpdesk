import path from "node:path";
import dotenv from "dotenv";
import { createTestDbClient } from "../../apps/server/src/test-utils/prisma-test-client";

// The Playwright test process doesn't inherit apps/server's .env.test the
// way the webServer child processes do, so load it explicitly here.
dotenv.config({ path: path.resolve(__dirname, "../../apps/server/.env.test") });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set — expected it to come from apps/server/.env.test"
  );
}

if (!process.env.BETTER_AUTH_URL) {
  throw new Error(
    "BETTER_AUTH_URL is not set — expected it to come from apps/server/.env.test"
  );
}

/** Direct DB access to the test database, for scenarios not reachable via the app's HTTP API. */
export const testDb = createTestDbClient(process.env.DATABASE_URL);

/**
 * apps/server's own base URL (e.g. http://localhost:3002 in the test env),
 * reused from BETTER_AUTH_URL rather than a separate env var — it's already
 * the server's origin, Better-Auth-specific naming aside. Needed because
 * apps/server isn't reachable through apps/web's baseURL — there's no
 * dev-server proxy in this stack (plain cross-origin fetch, see CLAUDE.md).
 */
export const API_URL = process.env.BETTER_AUTH_URL;

/**
 * better-auth signs the session cookie as `<token>.<signature>`; the
 * database's `session.token` column stores only the `<token>` part.
 * Verified against a live sign-in: the cookie's segment before the first
 * "." is an exact match for the DB row's token column.
 */
export function extractSessionToken(cookieValue: string): string {
  return cookieValue.split(".")[0];
}

/** Forces one specific session (identified by its cookie's token) to be expired. */
export async function expireSessionByToken(token: string) {
  await testDb.session.update({
    where: { token },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  });
}
