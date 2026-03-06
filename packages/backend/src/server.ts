import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { healthRouter } from "./api/routes/health.js";
import { vaultRouter } from "./api/routes/vault.js";
import { workflowRouter } from "./api/routes/workflow.js";
import { runRouter } from "./api/routes/run.js";
import { uploadRouter } from "./api/routes/upload.js";
import { errorHandler } from "./api/middleware/errorHandler.js";
import { progressGateway } from "./api/ws/progressGateway.js";

export function createApp() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws/progress" });

  app.use(cors());
  app.use(express.json({ limit: "12mb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/vault", vaultRouter);
  app.use("/api/workflow", workflowRouter);
  app.use("/api/run", runRouter);
  app.use("/api/upload", uploadRouter);

  app.use(errorHandler);

  progressGateway(wss);

  return { app, server, wss };
}
