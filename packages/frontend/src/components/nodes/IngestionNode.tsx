import { type NodeProps } from "@xyflow/react";
import { FolderOpen } from "lucide-react";
import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  NodeType,
  type NodeStatus,
} from "@obsidian-tasks/shared";
import { BaseNode } from "./BaseNode.js";

interface IngestionNodeData {
  enabled: boolean;
  status: NodeStatus;
  params: Record<string, unknown>;
}

export function IngestionNode({ data }: NodeProps) {
  const d = data as unknown as IngestionNodeData;
  const vaultPath = (d.params?.vaultPath as string) ?? "";

  return (
    <BaseNode
      data={{
        label: NODE_TYPE_LABELS[NodeType.INGESTION],
        color: NODE_TYPE_COLORS[NodeType.INGESTION],
        icon: <FolderOpen />,
        enabled: d.enabled,
        status: d.status,
      }}
    >
      {vaultPath && <p className="truncate">Vault: {vaultPath}</p>}
    </BaseNode>
  );
}
