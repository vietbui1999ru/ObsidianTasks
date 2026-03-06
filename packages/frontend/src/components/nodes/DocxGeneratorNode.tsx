import { type NodeProps } from "@xyflow/react";
import { FileOutput } from "lucide-react";
import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  NodeType,
  type NodeStatus,
} from "@obsidian-tasks/shared";
import { BaseNode } from "./BaseNode.js";

interface DocxGeneratorNodeData {
  enabled: boolean;
  status: NodeStatus;
}

export function DocxGeneratorNode({ data }: NodeProps) {
  const d = data as unknown as DocxGeneratorNodeData;

  return (
    <BaseNode
      data={{
        label: NODE_TYPE_LABELS[NodeType.DOCX_GENERATOR],
        color: NODE_TYPE_COLORS[NodeType.DOCX_GENERATOR],
        icon: <FileOutput />,
        enabled: d.enabled,
        status: d.status,
      }}
    />
  );
}
