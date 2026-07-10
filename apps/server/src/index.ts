import cors from "cors";
import express from "express";
import { prisma } from "./db";

const app = express();
const port = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000" }));
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

app.listen(port, () => {
  console.log(`🚀 API server running at http://localhost:${port}`);
});
