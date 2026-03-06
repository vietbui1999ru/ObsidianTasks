import { create } from "zustand";
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import {
  NODE_TYPE_LABELS,
  NODE_TYPE_COLORS,
  DEFAULT_PIPELINE_ORDER,
} from "@obsidian-tasks/shared";

function createDefaultNodes(): Node[] {
  return DEFAULT_PIPELINE_ORDER.map((type, index) => ({
    id: type,
    type: type, // use NodeType value so React Flow picks the custom component
    position: { x: 250, y: index * 150 },
    data: {
      label: NODE_TYPE_LABELS[type],
      type: type,
      color: NODE_TYPE_COLORS[type],
      enabled: true,
      status: "idle" as const,
      params: {},
    },
  }));
}

function createDefaultEdges(): Edge[] {
  return DEFAULT_PIPELINE_ORDER.slice(0, -1).map((type, index) => ({
    id: `${type}-${DEFAULT_PIPELINE_ORDER[index + 1]}`,
    source: type,
    target: DEFAULT_PIPELINE_ORDER[index + 1],
    animated: true,
  }));
}

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setSelectedNodeId: (id: string | null) => void;
  updateNodeData: (nodeId: string, data: Partial<Record<string, unknown>>) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: createDefaultNodes(),
  edges: createDefaultEdges(),
  selectedNodeId: null,
  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },
  onConnect: (connection) => {
    set({ edges: addEdge(connection, get().edges) });
  },
  setSelectedNodeId: (id) => {
    set({ selectedNodeId: id });
  },
  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id !== nodeId) return n;
        return { ...n, data: { ...n.data, ...data } };
      }),
    });
  },
}));
