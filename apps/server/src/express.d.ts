INSERT INTO account (
    id,
    accountId,
    providerId,
    userId,
    accessToken,
    refreshToken,
    idToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    scope,
    password,
    createdAt,
    updatedAt
  )
VALUES (
    'id:text',
    'accountId:text',
    'providerId:text',
    'userId:text',
    'accessToken:text',
    'refreshToken:text',
    'idToken:text',
    'accessTokenExpiresAt:timestamp without time zone',
    'refreshTokenExpiresAt:timestamp without time zone',
    'scope:text',
    'password:text',
    'createdAt:timestamp without time zone',
    'updatedAt:timestamp without time zone'
  );import type { auth } from "./auth";

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
