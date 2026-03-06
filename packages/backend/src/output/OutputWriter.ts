import { writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import type { GenerationManifest } from "@obsidian-tasks/shared";

// ---------------------------------------------------------------------------
// Slugify helper
// ---------------------------------------------------------------------------

/**
 * Lowercase the input, replace spaces and non-alphanumeric characters with
 * underscores, collapse consecutive underscores, and trim leading/trailing
 * underscores.
 */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_|_$/g, "");
}

// ---------------------------------------------------------------------------
// Filename generation
// ---------------------------------------------------------------------------

const DEFAULT_CANDIDATE_NAME = "Viet Bui";

/**
 * Build a collision-free filename from the company, job title, and candidate
 * name.
 *
 * Pattern: `${company}_${jobTitle}_${candidateName}.docx`
 *
 * If `candidateName` is empty or not provided, it defaults to "Viet Bui".
 * If a file with the generated name already exists in `outputDir`, a numeric
 * suffix (_2, _3, ...) is appended until a free name is found.
 */
export async function generateFilename(
  company: string,
  jobTitle: string,
  candidateName: string | undefined,
  outputDir: string,
): Promise<string> {
  const name = candidateName?.trim() || DEFAULT_CANDIDATE_NAME;
  const base = `${slugify(company)}_${slugify(jobTitle)}_${slugify(name)}`;

  let candidate = `${base}.docx`;
  let counter = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await access(path.join(outputDir, candidate));
      // File exists — try next suffix
      counter += 1;
      candidate = `${base}_${counter}.docx`;
    } catch {
      // File does not exist — name is available
      return candidate;
    }
  }
}

// ---------------------------------------------------------------------------
// Write resume buffer
// ---------------------------------------------------------------------------

export interface WriteResumeParams {
  buffer: Buffer;
  outputDir: string;
  filename: string;
}

/**
 * Write a DOCX buffer to disk.
 *
 * Creates `outputDir` recursively if it does not already exist and returns the
 * absolute path of the written file.
 */
export async function writeResume(params: WriteResumeParams): Promise<string> {
  const { buffer, outputDir, filename } = params;

  await mkdir(outputDir, { recursive: true });

  const fullPath = path.join(outputDir, filename);
  await writeFile(fullPath, buffer);

  return fullPath;
}

// ---------------------------------------------------------------------------
// Write manifest
// ---------------------------------------------------------------------------

/**
 * Write a `manifest.json` file alongside the generated resumes so downstream
 * consumers can inspect the batch metadata.
 */
export async function writeManifest(
  manifest: GenerationManifest,
  outputDir: string,
): Promise<void> {
  await mkdir(outputDir, { recursive: true });

  const fullPath = path.join(outputDir, "manifest.json");
  await writeFile(fullPath, JSON.stringify(manifest, null, 2), "utf-8");
}
