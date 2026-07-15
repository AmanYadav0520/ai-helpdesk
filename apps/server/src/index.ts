import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { prisma } from "./db";
import usersRouter from "./routes/users";

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

app.use("/api/users", usersRouter);

app.listen(port, () => {
  console.log(`🚀 API server running at http://localhost:${port}`);
});
