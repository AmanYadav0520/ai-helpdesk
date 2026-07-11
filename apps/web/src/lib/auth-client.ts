import { createAuthClient } from "better-auth/react";

const API_ORIGIN = process.env.BUN_PUBLIC_API_URL ?? "http://localhost:3001";

export const authClient = createAuthClient({
  baseURL: `${API_ORIGIN}/api/auth`,
});

export const { useSession, signIn, signOut } = authClient;
