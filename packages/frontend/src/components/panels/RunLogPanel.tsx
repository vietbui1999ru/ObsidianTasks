import { useState, useEffect, useRef } from "react";
import { Play, ChevronUp, ChevronDown } from "lucide-react";
import type { NodeStatusEvent } from "@obsidian-tasks/shared";
import { useWorkflowSocket } from "../../hooks/useWorkflowSocket.js";
import { useRunPipeline } from "../../hooks/useRunPipeline.js";

const STATUS_COLORS: Record<string, string> = {
  idle: "text-gray-500",
  running: "text-blue-600",
  done: "text-green-600",
  error: "text-red-600",
  skipped: "text-gray-400",
};

export function RunLogPanel() {
  const { lastEvent, connected } = useWorkflowSocket();
  const { run, isRunning, error: runError } = useRunPipeline();

  const [events, setEvents] = useState<NodeStatusEvent[]>([]);
  const [jobText, setJobText] = useState("");
  const [expanded, setExpanded] = useState(true);

  const listRef = useRef<HTMLDivElement>(null);

  // Accumulate events as they arrive
  useEffect(() => {
    if (lastEvent) {
      setEvents((prev) => [...prev, lastEvent]);
    }
  }, [lastEvent]);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [events]);

  async function handleStartRun() {
    const descriptions = jobText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (descriptions.length === 0) return;

    await run(descriptions);
  }

  return (
    <div
      className={`bg-white border-t border-gray-200 flex flex-col shadow-lg transition-all ${
        expanded ? "h-72" : "h-10"
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-800">Run Log</h2>
          <span
            className={`inline-block w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-400"}`}
            title={connected ? "WebSocket connected" : "WebSocket disconnected"}
          />
        </div>
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="flex flex-1 overflow-hidden">
          {/* Event list */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto px-4 py-2 space-y-1 text-xs font-mono"
          >
            {events.length === 0 && (
              <p className="text-gray-400 text-xs">
                No events yet. Start a run to see progress.
              </p>
            )}
            {events.map((evt, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-gray-400 shrink-0">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-gray-600 shrink-0 w-32 truncate">
                  {evt.nodeId}
                </span>
                <span
                  className={`shrink-0 font-semibold uppercase w-16 ${STATUS_COLORS[evt.status] ?? "text-gray-500"}`}
                >
                  {evt.status}
                </span>
                {evt.message && (
                  <span className="text-gray-500 truncate">{evt.message}</span>
                )}
              </div>
            ))}
          </div>

          {/* Run controls */}
          <div className="w-64 border-l border-gray-200 flex flex-col p-3 gap-2 shrink-0">
            <label className="text-xs font-medium text-gray-500">
              Job Descriptions (one per line)
            </label>
            <textarea
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              placeholder={"Senior React Engineer at...\nBackend Go Developer..."}
              className="flex-1 w-full rounded border border-gray-300 bg-gray-50 p-2 text-xs text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={isRunning}
            />
            {runError && (
              <p className="text-xs text-red-500">{runError}</p>
            )}
            <button
              onClick={handleStartRun}
              disabled={isRunning || jobText.trim().length === 0}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              {isRunning ? "Running..." : "Start Run"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
