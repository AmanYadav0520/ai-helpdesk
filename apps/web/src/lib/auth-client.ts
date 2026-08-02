import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "../../../server/src/auth";

const API_ORIGIN = import.meta.env.VITE_API_URL;

export const authClient = createAuthClient({
  // Better Auth requires an absolute URL (or none, to fall back to same-origin) —
  // it rejects a relative string like "/api/auth" outright.
  baseURL: API_ORIGIN ? `${API_ORIGIN}/api/auth` : undefined,
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { useSession, signIn, signOut } = authClient;
