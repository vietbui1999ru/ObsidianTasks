import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { useWorkflowStore } from "../../store/workflowStore.js";

interface NodeConfigPanelProps {
  nodeId: string | null;
  onClose: () => void;
}

export function NodeConfigPanel({ nodeId, onClose }: NodeConfigPanelProps) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const [paramsText, setParamsText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  const node = nodeId ? nodes.find((n) => n.id === nodeId) : null;

  useEffect(() => {
    if (node?.data.params) {
      setParamsText(JSON.stringify(node.data.params, null, 2));
      setParseError(null);
    } else if (node) {
      setParamsText("{}");
      setParseError(null);
    }
  }, [node]);

  if (!nodeId || !node) return null;

  const label = (node.data.label as string) ?? nodeId;
  const nodeType = (node.data.type as string) ?? "unknown";
  const enabled = (node.data.enabled as boolean) ?? true;

  function handleSave() {
    try {
      const parsed = JSON.parse(paramsText) as Record<string, unknown>;
      setParseError(null);

      // Update the node's data.params in the store via onNodesChange
      const { nodes: currentNodes } = useWorkflowStore.getState();
      const updated = currentNodes.map((n) => {
        if (n.id !== nodeId) return n;
        return {
          ...n,
          data: { ...n.data, params: parsed },
        };
      });
      useWorkflowStore.setState({ nodes: updated });
    } catch {
      setParseError("Invalid JSON");
    }
  }

  return (
    <div className="w-80 h-full bg-white border-l border-gray-200 flex flex-col shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800 truncate">
          Node Config
        </h2>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Node info */}
      <div className="px-4 py-3 space-y-2 border-b border-gray-100">
        <div>
          <span className="text-xs text-gray-500">Label</span>
          <p className="text-sm font-medium text-gray-800">{label}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500">Type</span>
          <p className="text-sm text-gray-700 font-mono">{nodeType}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Enabled</span>
          <span
            className={`inline-block w-2 h-2 rounded-full ${enabled ? "bg-green-500" : "bg-gray-400"}`}
          />
          <span className="text-xs text-gray-600">
            {enabled ? "Yes" : "No"}
          </span>
        </div>
      </div>

      {/* Params editor */}
      <div className="flex-1 flex flex-col px-4 py-3 gap-2 overflow-hidden">
        <label className="text-xs font-medium text-gray-500">
          Parameters (JSON)
        </label>
        <textarea
          value={paramsText}
          onChange={(e) => {
            setParamsText(e.target.value);
            setParseError(null);
          }}
          className="flex-1 w-full rounded border border-gray-300 bg-gray-50 p-2 text-xs font-mono text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          spellCheck={false}
        />
        {parseError && (
          <p className="text-xs text-red-500">{parseError}</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200">
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          Save
        </button>
      </div>
    </div>
  );
}
