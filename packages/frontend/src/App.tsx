import { useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkflowStore } from "./store/workflowStore.js";
import { nodeTypes } from "./components/nodes/index.js";
import { CanvasToolbar } from "./components/canvas/CanvasToolbar.js";
import { VaultPreviewPanel } from "./components/panels/VaultPreviewPanel.js";
import { NodeConfigPanel } from "./components/panels/NodeConfigPanel.js";
import { RunLogPanel } from "./components/panels/RunLogPanel.js";
import { DropZone } from "./components/upload/DropZone.js";

export function App() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectedNodeId,
    setSelectedNodeId,
  } = useWorkflowStore();

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  return (
    <div className="flex flex-col w-full h-full">
      <DropZone />
      <CanvasToolbar />
      <div className="flex flex-1 overflow-hidden">
        <VaultPreviewPanel />
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
        <NodeConfigPanel
          nodeId={selectedNodeId}
          onClose={() => setSelectedNodeId(null)}
        />
      </div>
      <RunLogPanel />
    </div>
  );
}
