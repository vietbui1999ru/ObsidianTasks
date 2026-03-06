import { z } from "zod";

export enum NodeType {
  INGESTION = "ingestion",
  JD_PARSER = "jd_parser",
  PROFILE = "profile",
  PROJECT_SELECTOR = "project_selector",
  RESUME_COMPOSER = "resume_composer",
  ATS_OPTIMIZER = "ats_optimizer",
  OUTPUT_VALIDATOR = "output_validator",
  DOCX_GENERATOR = "docx_generator",
}

export enum NodeStatus {
  IDLE = "idle",
  RUNNING = "running",
  DONE = "done",
  ERROR = "error",
  SKIPPED = "skipped",
}

export interface WorkflowNodeData {
  label: string;
  type: NodeType;
  enabled: boolean;
  params: Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface NodeStatusEvent {
  nodeId: string;
  status: NodeStatus;
  progress: number;
  message?: string;
  timestamp: number;
}

export const WorkflowGraphSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    type: z.nativeEnum(NodeType),
    position: z.object({ x: z.number(), y: z.number() }),
    data: z.object({
      label: z.string(),
      type: z.nativeEnum(NodeType),
      enabled: z.boolean(),
      params: z.record(z.unknown()),
    }),
  })),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().optional(),
    targetHandle: z.string().optional(),
  })),
});
