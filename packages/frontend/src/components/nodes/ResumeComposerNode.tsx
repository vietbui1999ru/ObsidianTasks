import { type NodeProps } from "@xyflow/react";
import { FileText } from "lucide-react";
import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  NodeType,
  type NodeStatus,
} from "@obsidian-tasks/shared";
import { BaseNode } from "./BaseNode.js";

interface ResumeComposerNodeData {
  enabled: boolean;
  status: NodeStatus;
}

export function ResumeComposerNode({ data }: NodeProps) {
  const d = data as unknown as ResumeComposerNodeData;

  return (
    <BaseNode
      data={{
        label: NODE_TYPE_LABELS[NodeType.RESUME_COMPOSER],
        color: NODE_TYPE_COLORS[NodeType.RESUME_COMPOSER],
        icon: <FileText />,
        enabled: d.enabled,
        status: d.status,
      }}
    />
  );
}
