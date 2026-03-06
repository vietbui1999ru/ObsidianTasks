import { readFile, writeFile } from "node:fs/promises";
import yaml from "js-yaml";
import {
  type WorkflowGraph,
  WorkflowGraphSchema,
} from "@obsidian-tasks/shared";

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

/** Serialize a WorkflowGraph to a pretty-printed JSON string. */
export function serializeToJson(graph: WorkflowGraph): string {
  return JSON.stringify(graph, null, 2);
}

/**
 * Parse a JSON string into a validated WorkflowGraph.
 * Throws a ZodError if the payload does not match the schema.
 */
export function deserializeFromJson(json: string): WorkflowGraph {
  const raw: unknown = JSON.parse(json);
  return WorkflowGraphSchema.parse(raw);
}

/** Write a WorkflowGraph to a file as pretty-printed JSON. */
export async function saveToFile(
  graph: WorkflowGraph,
  filePath: string,
): Promise<void> {
  const json = serializeToJson(graph);
  await writeFile(filePath, json, "utf-8");
}

/**
 * Read a JSON file from disk and return a validated WorkflowGraph.
 * Throws if the file does not exist or contains invalid data.
 */
export async function loadFromFile(filePath: string): Promise<WorkflowGraph> {
  const contents = await readFile(filePath, "utf-8");
  return deserializeFromJson(contents);
}

// ---------------------------------------------------------------------------
// YAML (optional convenience helpers)
// ---------------------------------------------------------------------------

/** Serialize a WorkflowGraph to a YAML string. */
export function serializeToYaml(graph: WorkflowGraph): string {
  return yaml.dump(graph, { indent: 2, lineWidth: 120 });
}

/**
 * Parse a YAML string into a validated WorkflowGraph.
 * Throws a ZodError if the payload does not match the schema.
 */
export function deserializeFromYaml(yamlStr: string): WorkflowGraph {
  const raw: unknown = yaml.load(yamlStr);
  return WorkflowGraphSchema.parse(raw);
}
