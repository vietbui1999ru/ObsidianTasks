import { Router } from "express";
import { saveToFile, loadFromFile } from "../../workflow/WorkflowSerializer.js";
import { WorkflowGraphSchema } from "@obsidian-tasks/shared";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// routes/ → api/ → src/ → backend/ → packages/ → root
const WORKFLOW_PATH = path.resolve(__dirname, "../../../../..", "workflow.json");

export const workflowRouter = Router();

workflowRouter.get("/", async (_req, res, next) => {
  try {
    const graph = await loadFromFile(WORKFLOW_PATH);
    res.json(graph);
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      res.json({ nodes: [], edges: [] });
      return;
    }
    next(error);
  }
});

workflowRouter.post("/", async (req, res, next) => {
  try {
    const graph = WorkflowGraphSchema.parse(req.body);
    await saveToFile(graph, WORKFLOW_PATH);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
