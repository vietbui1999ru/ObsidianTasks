import { NodeType } from "@obsidian-tasks/shared";
import { nodeRegistry } from "../workflow/NodeRegistry.js";
import { WorkflowEngine } from "../workflow/WorkflowEngine.js";
import { ClaudeClient } from "../llm/ClaudeClient.js";
import { normalizeVault } from "../ingestion/index.js";
import { JobDescriptionParser } from "../skills/JobDescriptionParser.js";
import { ProfileUnderstanding } from "../skills/ProfileUnderstanding.js";
import { ProjectSelector } from "../skills/ProjectSelector.js";
import { ResumeComposer } from "../skills/ResumeComposer.js";
import { AtsOptimizer } from "../skills/AtsOptimizer.js";
import { OutputValidator } from "../skills/OutputValidator.js";
import { generateDocx } from "../output/DocxGenerator.js";
import { loadStyleConfig } from "../output/TemplateLoader.js";
import { generateFilename, writeResume } from "../output/OutputWriter.js";
import { broadcastStatus } from "../api/ws/progressGateway.js";
import { env } from "../config/env.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve to monorepo root: pipeline/ → src/ → backend/ → packages/ → root
const ROOT = path.resolve(__dirname, "../../../..");

let initialized = false;

export function setupPipeline(): WorkflowEngine {
  if (!initialized) {
    const claude = new ClaudeClient({ apiKey: env.ANTHROPIC_API_KEY });

    // Skill instances
    const jdParser = new JobDescriptionParser(claude);
    const profileUnderstanding = new ProfileUnderstanding(claude);
    const projectSelector = new ProjectSelector(claude);
    const resumeComposer = new ResumeComposer(claude);
    const atsOptimizer = new AtsOptimizer(claude);
    const outputValidator = new OutputValidator(null as any);

    // Register executors — each wraps a skill's .run() and returns its data
    // INGESTION scans the PROFILE_PATH for your resume data (skills, experience, projects)
    nodeRegistry.register(NodeType.INGESTION, async (input, _params) => {
      const vaultData = await normalizeVault(env.PROFILE_PATH);
      return { vaultData };
    });

    nodeRegistry.register(NodeType.JD_PARSER, async (input, _params) => {
      const result = await jdParser.run({ rawJobDescription: input.rawJobDescription }, {});
      if (!result.success) throw new Error(result.error ?? "JD parsing failed");
      return (result.data as Record<string, unknown>);
    });

    nodeRegistry.register(NodeType.PROFILE, async (input, _params) => {
      const result = await profileUnderstanding.run(
        { vaultData: input.vaultData, parsedJd: input.parsedJd },
        {},
      );
      if (!result.success) throw new Error(result.error ?? "Profile understanding failed");
      return (result.data as Record<string, unknown>);
    });

    nodeRegistry.register(NodeType.PROJECT_SELECTOR, async (input, _params) => {
      const result = await projectSelector.run(
        { vaultData: input.vaultData, parsedJd: input.parsedJd, profileAnalysis: input.profileAnalysis },
        {},
      );
      if (!result.success) throw new Error(result.error ?? "Project selection failed");
      return (result.data as Record<string, unknown>);
    });

    nodeRegistry.register(NodeType.RESUME_COMPOSER, async (input, _params) => {
      const result = await resumeComposer.run(
        { vaultData: input.vaultData, parsedJd: input.parsedJd, profileAnalysis: input.profileAnalysis, selectedProjects: input.selectedProjects },
        {},
      );
      if (!result.success) throw new Error(result.error ?? "Resume composition failed");
      return (result.data as Record<string, unknown>);
    });

    nodeRegistry.register(NodeType.ATS_OPTIMIZER, async (input, _params) => {
      const result = await atsOptimizer.run(
        { markdownResume: input.markdownResume, parsedJd: input.parsedJd },
        {},
      );
      if (!result.success) throw new Error(result.error ?? "ATS optimization failed");
      return (result.data as Record<string, unknown>);
    });

    nodeRegistry.register(NodeType.OUTPUT_VALIDATOR, async (input, _params) => {
      const result = await outputValidator.run(
        { optimizedResume: input.optimizedResume, vaultData: input.vaultData },
        {},
      );
      if (!result.success) throw new Error(result.error ?? "Output validation failed");
      return (result.data as Record<string, unknown>);
    });

    nodeRegistry.register(NodeType.DOCX_GENERATOR, async (input, _params) => {
      const styleConfig = await loadStyleConfig(
        path.resolve(ROOT, "templates/style-config.json"),
      );
      const resume = (input.optimizedResume ?? input.markdownResume) as string;
      const company = (input.company ?? "unknown") as string;
      const jobTitle = (input.jobTitle ?? "unknown") as string;
      const candidateName = ((input.vaultData as any)?.profile?.name ?? "Viet Bui") as string;

      const buffer = await generateDocx(resume, styleConfig);
      const filename = await generateFilename(company, jobTitle, candidateName, env.OUTPUT_PATH);
      const outputPath = await writeResume({ buffer, outputDir: env.OUTPUT_PATH, filename });

      return { outputPath, filename };
    });

    initialized = true;
  }

  return new WorkflowEngine({
    registry: nodeRegistry,
    onStatus: broadcastStatus,
  });
}
