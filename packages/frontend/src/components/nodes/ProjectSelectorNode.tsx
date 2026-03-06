import { type NodeProps } from "@xyflow/react";
import { LayoutGrid } from "lucide-react";
import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  NodeType,
  type NodeStatus,
} from "@obsidian-tasks/shared";
import { BaseNode } from "./BaseNode.js";

interface ProjectSelectorNodeData {
  enabled: boolean;
  status: NodeStatus;
}

export function ProjectSelectorNode({ data }: NodeProps) {
  const d = data as unknown as ProjectSelectorNodeData;

  return (
    <BaseNode
      data={{
        label: NODE_TYPE_LABELS[NodeType.PROJECT_SELECTOR],
        color: NODE_TYPE_COLORS[NodeType.PROJECT_SELECTOR],
        icon: <LayoutGrid />,
        enabled: d.enabled,
        status: d.status,
      }}
    />
  );
}
