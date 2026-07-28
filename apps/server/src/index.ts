import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { prisma } from "./db";
import usersRouter from "./routes/users";
import ticketsRouter from "./routes/tickets";
import agentsRouter from "./routes/agents";
import repliesRouter from "./routes/replies";
import webhooksRouter from "./routes/webhooks";
import { startQueue, stopQueue } from "./lib/queue";

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
app.use("/api/tickets", ticketsRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/replies", repliesRouter);
app.use("/api/webhooks", webhooksRouter);

async function boot() {
  await startQueue();

  const server = app.listen(port, () => {
    console.log(`🚀 API server running at http://localhost:${port}`);
  });

  const shutdown = async () => {
    console.log("Shutting down...");
    server.close();
    await stopQueue();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

boot().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
