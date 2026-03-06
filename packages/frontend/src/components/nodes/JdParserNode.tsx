import { type NodeProps } from "@xyflow/react";
import { FileSearch } from "lucide-react";
import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  NodeType,
  type NodeStatus,
} from "@obsidian-tasks/shared";
import { BaseNode } from "./BaseNode.js";

interface JdParserNodeData {
  enabled: boolean;
  status: NodeStatus;
  params: Record<string, unknown>;
}

export function JdParserNode({ data }: NodeProps) {
  const d = data as unknown as JdParserNodeData;
  const jdCount = (d.params?.jdCount as number) ?? 0;

  return (
    <BaseNode
      data={{
        label: NODE_TYPE_LABELS[NodeType.JD_PARSER],
        color: NODE_TYPE_COLORS[NodeType.JD_PARSER],
        icon: <FileSearch />,
        enabled: d.enabled,
        status: d.status,
      }}
    >
      {jdCount > 0 && <p>{jdCount} JD(s) loaded</p>}
    </BaseNode>
  );
}
