import { NodeType } from "../types/workflow.js";

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  [NodeType.INGESTION]: "Vault Ingestion",
  [NodeType.JD_PARSER]: "JD Parser",
  [NodeType.PROFILE]: "Profile Understanding",
  [NodeType.PROJECT_SELECTOR]: "Project Selector",
  [NodeType.RESUME_COMPOSER]: "Resume Composer",
  [NodeType.ATS_OPTIMIZER]: "ATS Optimizer",
  [NodeType.OUTPUT_VALIDATOR]: "Output Validator",
  [NodeType.DOCX_GENERATOR]: "DOCX Generator",
};

export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  [NodeType.INGESTION]: "#3b82f6",
  [NodeType.JD_PARSER]: "#8b5cf6",
  [NodeType.PROFILE]: "#06b6d4",
  [NodeType.PROJECT_SELECTOR]: "#10b981",
  [NodeType.RESUME_COMPOSER]: "#f59e0b",
  [NodeType.ATS_OPTIMIZER]: "#ef4444",
  [NodeType.OUTPUT_VALIDATOR]: "#6366f1",
  [NodeType.DOCX_GENERATOR]: "#ec4899",
};

export const DEFAULT_PIPELINE_ORDER: NodeType[] = [
  NodeType.INGESTION,
  NodeType.JD_PARSER,
  NodeType.PROFILE,
  NodeType.PROJECT_SELECTOR,
  NodeType.RESUME_COMPOSER,
  NodeType.ATS_OPTIMIZER,
  NodeType.OUTPUT_VALIDATOR,
  NodeType.DOCX_GENERATOR,
];
