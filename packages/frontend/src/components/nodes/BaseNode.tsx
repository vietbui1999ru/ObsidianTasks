import { Handle, Position } from "@xyflow/react";
import { type NodeStatus } from "@obsidian-tasks/shared";
import type { ReactNode } from "react";

export interface BaseNodeData {
  label: string;
  color: string;
  icon: ReactNode;
  enabled: boolean;
  status: NodeStatus;
}

interface BaseNodeProps {
  data: BaseNodeData;
  children?: ReactNode;
}

const statusStyles: Record<NodeStatus, string> = {
  idle: "bg-gray-400",
  running: "bg-blue-500 animate-pulse",
  done: "bg-green-500",
  error: "bg-red-500",
  skipped: "bg-gray-300",
};

export function BaseNode({ data, children }: BaseNodeProps) {
  const { label, color, icon, enabled, status } = data;

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />

      <div
        className={`min-w-[200px] rounded-lg bg-white shadow-md border border-gray-200 overflow-hidden transition-opacity ${
          enabled ? "opacity-100" : "opacity-50"
        }`}
        style={{ borderLeftWidth: "4px", borderLeftColor: color }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${statusStyles[status]}`}
          />
          <span className="text-gray-600 shrink-0 [&>svg]:w-4 [&>svg]:h-4">
            {icon}
          </span>
          <span className="text-sm font-medium text-gray-800 truncate">
            {label}
          </span>
          <label className="ml-auto flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              readOnly
              className="sr-only peer"
            />
            <div className="w-8 h-4 rounded-full bg-gray-300 peer-checked:bg-blue-500 relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
          </label>
        </div>

        {/* Optional node-specific content */}
        {children && (
          <div className="px-3 pb-2 text-xs text-gray-500">{children}</div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />
    </div>
  );
}
