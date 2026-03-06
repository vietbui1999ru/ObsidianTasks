import { NodeType, NodeStatus } from "./workflow.js";

export interface SkillInput {
  skillName: string;
  context: Record<string, unknown>;
}

export interface SkillResult {
  skillName: string;
  success: boolean;
  data: unknown;
  tokenUsage?: { input: number; output: number };
  error?: string;
}

export interface MemoryEntry {
  key: string;
  value: unknown;
  hash: string;
  createdAt: number;
  expiresAt: number;
}

export interface AgentState {
  currentNode: NodeType | null;
  nodeStatuses: Map<string, NodeStatus>;
  memory: Map<string, MemoryEntry>;
  errors: Array<{ nodeId: string; error: string }>;
}
