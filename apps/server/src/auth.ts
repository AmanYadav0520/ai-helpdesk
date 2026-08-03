import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { Role } from "core/constants/role";
import { prisma } from "./db";

const webOrigin = process.env.WEB_ORIGIN;
if (!webOrigin) {
  throw new Error("WEB_ORIGIN environment variable is required");
}

// The web app (Vercel) and this API (Railway) are on unrelated domains, not
// same-site subdomains, so the session cookie must be SameSite=None to be
// sent on the frontend's cross-site requests — the SameSite=Lax default is
// dropped by the browser on those, which otherwise makes the session appear
// to vanish immediately after a successful login.
const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  trustedOrigins: [webOrigin],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  advanced: isProduction
    ? {
        defaultCookieAttributes: {
          sameSite: "none",
          secure: true,
          partitioned: true,
        },
      }
    : undefined,
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
