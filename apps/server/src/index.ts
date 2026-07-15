import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { prisma } from "./db";
import { requireAdmin } from "./require-admin";
import { requireAuth } from "./require-auth";

const app = express();
const port = process.env.PORT ?? 3001;

app.use(
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  }),
);

// Must be mounted before express.json() — Better Auth parses the raw body itself.
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/api/hello", (_req, res) => {
  res.json({ message: "Hello, world!", method: "GET" });
});

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(503).json({ status: "error", db: "disconnected" });
  }
});

app.get("/api/users", requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ users });
});

app.listen(port, () => {
  console.log(`🚀 API server running at http://localhost:${port}`);
});
