import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { Role } from "core/constants/role";
import { prisma } from "./db";

const webOrigin = process.env.WEB_ORIGIN;
if (!webOrigin) {
  throw new Error("WEB_ORIGIN environment variable is required");
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  trustedOrigins: [webOrigin],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  // Better Auth's own sign-in flow has no notion of our custom deletedAt
  // (soft-delete) field, so without this hook a soft-deleted user's still-valid
  // password lets them sign in and get a brand-new session — requireAuth
  // (apps/server/src/require-auth.ts) only rejects it on the *next* API call,
  // leaving them briefly signed in with a broken app instead of bounced at
  // login. Block session creation at the source instead.
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({ where: { id: session.userId } });
          if (user?.deletedAt) {
            throw new APIError("FORBIDDEN", {
              message: "This account has been deactivated.",
            });
          }
        },
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: ["admin", "agent"],
        required: false,
        defaultValue: Role.agent,
        input: false,
      },
      deletedAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
});
