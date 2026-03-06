import { useState } from "react";
import { FolderSearch, Save, Play, X, Loader2 } from "lucide-react";
import { type WorkflowGraph, NodeType } from "@obsidian-tasks/shared";
import { useWorkflowStore } from "../../store/workflowStore.js";
import { saveWorkflow } from "../../api/client.js";
import { useVaultScan } from "../../hooks/useVaultScan.js";
import { useRunPipeline } from "../../hooks/useRunPipeline.js";
import { useWorkflowSocket } from "../../hooks/useWorkflowSocket.js";

export function CanvasToolbar() {
  const { connected } = useWorkflowSocket();
  const { scan, isScanning } = useVaultScan();
  const { run, isRunning } = useRunPipeline();

  const [isSaving, setIsSaving] = useState(false);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [jobText, setJobText] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setFeedback(null);
    try {
      const { nodes, edges } = useWorkflowStore.getState();
      const graph: WorkflowGraph = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: (n.data.type as string ?? n.id) as NodeType,
          position: n.position,
          data: {
            label: (n.data.label as string) ?? n.id,
            type: (n.data.type as string ?? n.id) as NodeType,
            enabled: (n.data.enabled as boolean) ?? true,
            params: (n.data.params as Record<string, unknown>) ?? {},
          },
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
          ...(e.targetHandle ? { targetHandle: e.targetHandle } : {}),
        })),
      };
      await saveWorkflow(graph);
      setFeedback({ type: "success", message: "Workflow saved" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save workflow";
      setFeedback({ type: "error", message });
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  }

  async function handleRun() {
    const descriptions = jobText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (descriptions.length === 0) return;

    await run(descriptions);
    setShowRunDialog(false);
    setJobText("");
  }

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
        {/* Connection indicator */}
        <div className="flex items-center gap-1.5 mr-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${connected ? "bg-green-500" : "bg-red-400"}`}
          />
          <span className="text-xs text-gray-500">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>

        <div className="w-px h-5 bg-gray-200" />

        {/* Scan Vault */}
        <button
          onClick={scan}
          disabled={isScanning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          {isScanning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FolderSearch className="w-4 h-4" />
          )}
          Scan Vault
        </button>

        {/* Save Workflow */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Workflow
        </button>

        {/* Run Pipeline */}
        <button
          onClick={() => setShowRunDialog(true)}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {isRunning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          Run Pipeline
        </button>

        {/* Feedback message */}
        {feedback && (
          <span
            className={`ml-2 text-xs font-medium ${feedback.type === "success" ? "text-green-600" : "text-red-600"}`}
          >
            {feedback.message}
          </span>
        )}
      </div>

      {/* Run dialog overlay */}
      {showRunDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 flex flex-col">
            {/* Dialog header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-800">
                Run Pipeline
              </h3>
              <button
                onClick={() => setShowRunDialog(false)}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dialog body */}
            <div className="px-5 py-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Job Descriptions
              </label>
              <p className="text-xs text-gray-500">
                Paste one job description per line.
              </p>
              <textarea
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                placeholder={
                  "Senior React Engineer at Acme Corp...\nBackend Go Developer at Startup..."
                }
                rows={8}
                className="w-full rounded border border-gray-300 bg-gray-50 p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Dialog footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowRunDialog(false)}
                className="px-4 py-2 rounded text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRun}
                disabled={isRunning || jobText.trim().length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isRunning ? "Running..." : "Start"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
