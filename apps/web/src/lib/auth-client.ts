import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "../../../server/src/auth";

const API_ORIGIN = import.meta.env.VITE_API_URL;

export const authClient = createAuthClient({
  // Absolute origin for local dev (frontend :3000, backend :3001 — no dev proxy
  // between them). Left undefined in production (VITE_API_URL is unset there),
  // so Better Auth falls back to window.location.origin — the API is same-origin
  // in production via the Vercel rewrite proxy (apps/web/vercel.json).
  baseURL: API_ORIGIN || undefined,
  // Always explicit: when baseURL falls back to window.location.origin above,
  // Better Auth's own basePath default ("/api/auth") only applies when baseURL
  // resolution itself returns nothing — it doesn't, since window.location.origin
  // is a defined value — so the "/api/auth" suffix silently never got appended
  // and every request 404'd into the SPA route instead of hitting the API.
  basePath: "/api/auth",
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { useSession, signIn, signOut } = authClient;
