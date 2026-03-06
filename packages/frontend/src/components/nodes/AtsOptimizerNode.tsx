import { type NodeProps } from "@xyflow/react";
import { Target } from "lucide-react";
import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  NodeType,
  type NodeStatus,
} from "@obsidian-tasks/shared";
import { BaseNode } from "./BaseNode.js";

interface AtsOptimizerNodeData {
  enabled: boolean;
  status: NodeStatus;
}

export function AtsOptimizerNode({ data }: NodeProps) {
  const d = data as unknown as AtsOptimizerNodeData;

  return (
    <BaseNode
      data={{
        label: NODE_TYPE_LABELS[NodeType.ATS_OPTIMIZER],
        color: NODE_TYPE_COLORS[NodeType.ATS_OPTIMIZER],
        icon: <Target />,
        enabled: d.enabled,
        status: d.status,
      }}
    />
  );
}
