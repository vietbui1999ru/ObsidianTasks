import { type NodeProps } from "@xyflow/react";
import { User } from "lucide-react";
import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  NodeType,
  type NodeStatus,
} from "@obsidian-tasks/shared";
import { BaseNode } from "./BaseNode.js";

interface ProfileNodeData {
  enabled: boolean;
  status: NodeStatus;
}

export function ProfileNode({ data }: NodeProps) {
  const d = data as unknown as ProfileNodeData;

  return (
    <BaseNode
      data={{
        label: NODE_TYPE_LABELS[NodeType.PROFILE],
        color: NODE_TYPE_COLORS[NodeType.PROFILE],
        icon: <User />,
        enabled: d.enabled,
        status: d.status,
      }}
    />
  );
}
