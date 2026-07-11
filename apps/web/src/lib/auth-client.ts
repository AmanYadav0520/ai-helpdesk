import { createAuthClient } from "better-auth/react";

const API_ORIGIN = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export const authClient = createAuthClient({
  baseURL: `${API_ORIGIN}/api/auth`,
});

export const { useSession, signIn, signOut } = authClient;
