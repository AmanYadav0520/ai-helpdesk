import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "../../../server/src/auth";

const API_ORIGIN = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export const authClient = createAuthClient({
  baseURL: `${API_ORIGIN}/api/auth`,
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { useSession, signIn, signOut } = authClient;
