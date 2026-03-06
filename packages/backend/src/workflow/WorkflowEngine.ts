import {
  NodeStatus,
  type WorkflowGraph,
  type WorkflowNode,
  type NodeStatusEvent,
} from "@obsidian-tasks/shared";
import type { NodeRegistry } from "./NodeRegistry.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowEngineOptions {
  /** Registry that maps NodeType -> executor function. */
  registry: NodeRegistry;
  /** Optional callback invoked whenever a node's status changes. */
  onStatus?: (event: NodeStatusEvent) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a forward-adjacency list and compute in-degrees from graph edges. */
function buildAdjacency(graph: WorkflowGraph): {
  adjacency: Map<string, string[]>;
  inDegree: Map<string, number>;
} {
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialise every node so isolated nodes are included.
  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of graph.edges) {
    const neighbours = adjacency.get(edge.source);
    if (neighbours) {
      neighbours.push(edge.target);
    }
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  return { adjacency, inDegree };
}

/**
 * Kahn's algorithm — returns nodes in a valid topological order.
 * Throws a descriptive error when the graph contains a cycle.
 */
function topologicalSort(graph: WorkflowGraph): WorkflowNode[] {
  const { adjacency, inDegree } = buildAdjacency(graph);
  const nodeMap = new Map<string, WorkflowNode>(
    graph.nodes.map((n) => [n.id, n]),
  );

  // Seed the queue with all zero-in-degree nodes.
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
    }
  }

  const sorted: WorkflowNode[] = [];

  while (queue.length > 0) {
    // Shift gives a stable, breadth-first ordering.
    const current = queue.shift()!;
    const node = nodeMap.get(current);
    if (node) {
      sorted.push(node);
    }

    for (const neighbour of adjacency.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbour) ?? 1) - 1;
      inDegree.set(neighbour, newDegree);
      if (newDegree === 0) {
        queue.push(neighbour);
      }
    }
  }

  if (sorted.length !== graph.nodes.length) {
    // Identify the nodes that are part of the cycle for a useful message.
    const sortedIds = new Set(sorted.map((n) => n.id));
    const cycleNodeIds = graph.nodes
      .filter((n) => !sortedIds.has(n.id))
      .map((n) => `${n.id} (${n.data.label})`);

    throw new Error(
      `Workflow graph contains a cycle. The following nodes are involved: ${cycleNodeIds.join(", ")}`,
    );
  }

  return sorted;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class WorkflowEngine {
  private registry: NodeRegistry;
  private onStatus?: (event: NodeStatusEvent) => void;

  constructor(options: WorkflowEngineOptions) {
    this.registry = options.registry;
    this.onStatus = options.onStatus;
  }

  /**
   * Execute every enabled node in the graph in topological order.
   *
   * 1. Build adjacency list from edges.
   * 2. Compute in-degrees.
   * 3. Kahn's algorithm for topological sort (throws on cycles).
   * 4. Run nodes sequentially, merging outputs into a shared accumulator.
   * 5. Return the final accumulated output.
   */
  async execute(
    graph: WorkflowGraph,
    initialInput: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const sorted = topologicalSort(graph);
    const totalNodes = sorted.length;

    // Accumulated state — downstream nodes see all upstream outputs.
    let accumulated: Record<string, unknown> = { ...initialInput };

    for (let i = 0; i < sorted.length; i++) {
      const node = sorted[i];

      // ---- Skip disabled nodes ----
      if (node.data.enabled === false) {
        this.emit({
          nodeId: node.id,
          status: NodeStatus.SKIPPED,
          progress: Math.round(((i + 1) / totalNodes) * 100),
          message: `Node "${node.data.label}" is disabled — skipped`,
          timestamp: Date.now(),
        });
        continue;
      }

      // ---- Emit RUNNING ----
      this.emit({
        nodeId: node.id,
        status: NodeStatus.RUNNING,
        progress: Math.round((i / totalNodes) * 100),
        message: `Executing "${node.data.label}"`,
        timestamp: Date.now(),
      });

      // ---- Look up executor ----
      const executor = this.registry.get(node.data.type);
      if (!executor) {
        const errorMsg = `No executor registered for node type "${node.data.type}"`;
        this.emit({
          nodeId: node.id,
          status: NodeStatus.ERROR,
          progress: Math.round(((i + 1) / totalNodes) * 100),
          message: errorMsg,
          timestamp: Date.now(),
        });
        throw new Error(errorMsg);
      }

      // ---- Execute ----
      try {
        const output = await executor(accumulated, node.data.params);
        accumulated = { ...accumulated, ...output };

        this.emit({
          nodeId: node.id,
          status: NodeStatus.DONE,
          progress: Math.round(((i + 1) / totalNodes) * 100),
          message: `"${node.data.label}" completed`,
          timestamp: Date.now(),
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err);

        this.emit({
          nodeId: node.id,
          status: NodeStatus.ERROR,
          progress: Math.round(((i + 1) / totalNodes) * 100),
          message: `"${node.data.label}" failed: ${message}`,
          timestamp: Date.now(),
        });

        throw err;
      }
    }

    return accumulated;
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private emit(event: NodeStatusEvent): void {
    this.onStatus?.(event);
  }
}
