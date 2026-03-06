import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { NodeType, DEFAULT_PIPELINE_ORDER, NODE_TYPE_LABELS } from "@obsidian-tasks/shared";
import { setupPipeline } from "../../pipeline/setup.js";
import { writeManifest } from "../../output/OutputWriter.js";
import { env } from "../../config/env.js";
import type { GenerationManifest } from "@obsidian-tasks/shared";

export const runRouter = Router();

// Build a default linear workflow graph
function buildDefaultGraph() {
  const nodes = DEFAULT_PIPELINE_ORDER.map((type, index) => ({
    id: type,
    type,
    position: { x: 0, y: index * 100 },
    data: { label: NODE_TYPE_LABELS[type], type, enabled: true, params: {} },
  }));
  const edges = DEFAULT_PIPELINE_ORDER.slice(0, -1).map((type, i) => ({
    id: `${type}-${DEFAULT_PIPELINE_ORDER[i + 1]}`,
    source: type,
    target: DEFAULT_PIPELINE_ORDER[i + 1],
  }));
  return { nodes, edges };
}

runRouter.post("/", async (req, res, next) => {
  try {
    const { jobDescriptions } = req.body as { jobDescriptions: string[] };
    if (!jobDescriptions?.length) {
      res.status(400).json({ error: "jobDescriptions array is required" });
      return;
    }

    const batchId = uuidv4();
    const manifest: GenerationManifest = {
      batchId,
      startedAt: Date.now(),
      resumes: [],
    };

    // Respond immediately with the batch ID
    res.json({ batchId, count: jobDescriptions.length, status: "started" });

    // Process each JD using Promise.allSettled (one failure doesn't stop others)
    const engine = setupPipeline();
    const graph = buildDefaultGraph();

    const results = await Promise.allSettled(
      jobDescriptions.map(async (rawJd) => {
        const output = await engine.execute(graph, { rawJobDescription: rawJd });
        return output;
      }),
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled") {
        manifest.resumes.push({
          filename: (result.value.filename as string) ?? `job_${i + 1}`,
          status: "success",
        });
      } else {
        manifest.resumes.push({
          filename: `job_${i + 1}_failed`,
          status: "failed",
          error: result.reason?.message ?? String(result.reason),
        });
      }
    }

    manifest.completedAt = Date.now();
    await writeManifest(manifest, env.OUTPUT_PATH);
    console.log(`Batch ${batchId} complete: ${manifest.resumes.filter(r => r.status === "success").length}/${jobDescriptions.length} succeeded`);
  } catch (error) {
    next(error);
  }
});
