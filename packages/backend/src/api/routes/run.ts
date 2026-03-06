import { Router } from "express";

export const runRouter = Router();

runRouter.post("/", async (req, res, next) => {
  try {
    // TODO: Start batch run via WorkflowEngine
    const { jobDescriptions } = req.body as { jobDescriptions: string[] };
    if (!jobDescriptions?.length) {
      res.status(400).json({ error: "jobDescriptions array is required" });
      return;
    }
    res.json({ message: "Batch run not yet implemented", count: jobDescriptions.length });
  } catch (error) {
    next(error);
  }
});
