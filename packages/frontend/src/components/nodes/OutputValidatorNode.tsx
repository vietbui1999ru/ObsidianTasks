import { type NodeProps } from "@xyflow/react";
import { CheckCircle } from "lucide-react";
import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  NodeType,
  type NodeStatus,
} from "@obsidian-tasks/shared";
import { BaseNode } from "./BaseNode.js";

interface OutputValidatorNodeData {
  enabled: boolean;
  status: NodeStatus;
}

export function OutputValidatorNode({ data }: NodeProps) {
  const d = data as unknown as OutputValidatorNodeData;

  return (
    <BaseNode
      data={{
        label: NODE_TYPE_LABELS[NodeType.OUTPUT_VALIDATOR],
        color: NODE_TYPE_COLORS[NodeType.OUTPUT_VALIDATOR],
        icon: <CheckCircle />,
        enabled: d.enabled,
        status: d.status,
      }}
    />
  );
}
