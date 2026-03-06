import type { NodeType } from "@obsidian-tasks/shared";

/**
 * A function that executes a single workflow node.
 * Receives accumulated input from upstream nodes plus the node's own params,
 * and returns output that will be merged into the accumulated state.
 */
export type NodeExecutor = (
  input: Record<string, unknown>,
  params: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

/**
 * Registry that maps each NodeType to its executor function.
 * Consumers register executors at startup; the WorkflowEngine
 * looks them up at execution time.
 */
export class NodeRegistry {
  private executors = new Map<NodeType, NodeExecutor>();

  /** Register an executor for a given node type. Overwrites any previous registration. */
  register(type: NodeType, executor: NodeExecutor): void {
    this.executors.set(type, executor);
  }

  /** Retrieve the executor for a node type, or undefined if none is registered. */
  get(type: NodeType): NodeExecutor | undefined {
    return this.executors.get(type);
  }

  /** Check whether an executor has been registered for the given type. */
  has(type: NodeType): boolean {
    return this.executors.has(type);
  }
}

/** Default singleton instance shared across the application. */
export const nodeRegistry = new NodeRegistry();
