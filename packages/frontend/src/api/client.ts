import type { VaultData, WorkflowGraph } from "@obsidian-tasks/shared";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, init);
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch {
      // Use default message if body is not JSON
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function scanVault(): Promise<VaultData> {
  return request<VaultData>("/vault/scan", { method: "POST" });
}

export async function getWorkflow(): Promise<WorkflowGraph> {
  return request<WorkflowGraph>("/workflow");
}

export async function saveWorkflow(graph: WorkflowGraph): Promise<void> {
  await request<void>("/workflow", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(graph),
  });
}

export async function startRun(
  jobDescriptions: string[],
): Promise<{ batchId: string }> {
  return request<{ batchId: string }>("/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobDescriptions }),
  });
}

export async function getHealth(): Promise<{
  status: string;
  timestamp: number;
}> {
  return request<{ status: string; timestamp: number }>("/health");
}

export interface UploadedFile {
  name: string;
  path: string;
  content: string;
}

export async function uploadFiles(
  files: UploadedFile[],
): Promise<{ count: number; type: string }> {
  return request<{ count: number; type: string }>("/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files }),
  });
}
