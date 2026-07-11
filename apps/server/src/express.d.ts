import type { auth } from "./auth";

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

declare global {
  namespace Express {
    interface Request {
      // Only populated on routes behind requireAuth — undefined everywhere else.
      user?: Session["user"];
      session?: Session["session"];
    }
  }
}
