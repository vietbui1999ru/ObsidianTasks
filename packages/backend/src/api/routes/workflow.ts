import { Router } from "express";

export const workflowRouter = Router();

workflowRouter.get("/", async (_req, res, next) => {
  try {
    // TODO: Read workflow.json from disk via WorkflowSerializer
    res.json({ nodes: [], edges: [] });
  } catch (error) {
    next(error);
  }
});

workflowRouter.post("/", async (req, res, next) => {
  try {
    // TODO: Save workflow graph via WorkflowSerializer
    res.json({ message: "Workflow save not yet implemented" });
  } catch (error) {
    next(error);
  }
});
