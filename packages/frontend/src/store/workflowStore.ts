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
  DEFAULT_PIPELINE_ORDER,
} from "@obsidian-tasks/shared";

function createDefaultNodes(): Node[] {
  return DEFAULT_PIPELINE_ORDER.map((type, index) => ({
    id: type,
    type: "default",
    position: { x: 250, y: index * 120 },
    data: { label: NODE_TYPE_LABELS[type] },
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
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: createDefaultNodes(),
  edges: createDefaultEdges(),
  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },
  onConnect: (connection) => {
    set({ edges: addEdge(connection, get().edges) });
  },
}));
