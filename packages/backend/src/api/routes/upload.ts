import { Router } from "express";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env.js";
import { parseFrontmatter } from "../../ingestion/FrontmatterParser.js";

export const uploadRouter = Router();

// --- Types ---

interface UploadFileEntry {
  name: string;
  path: string;
  content: string;
}

interface UploadRequest {
  files: UploadFileEntry[];
  type?: "jd" | "profile" | "auto";
}

interface UploadResponse {
  uploaded: number;
  jdCount: number;
  profileCount: number;
  files: string[];
}

// --- Constants ---

const MAX_TOTAL_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILE_COUNT = 100;
const SAFE_FILENAME_RE = /^[a-zA-Z0-9\-_. ]+$/;

// --- Helpers ---

/** Returns true when the content looks like a job-description markdown file. */
function isJobDescription(content: string): boolean {
  const { frontmatter } = parseFrontmatter(content);
  if (!frontmatter || typeof frontmatter !== "object") return false;

  const hasTitle = typeof frontmatter.title === "string" && frontmatter.title.length > 0;
  const hasJdSignal =
    "Company" in frontmatter ||
    "source" in frontmatter ||
    "description" in frontmatter;

  return hasTitle && hasJdSignal;
}

/** Validate that every segment of a relative path is safe. */
function isPathSafe(filePath: string): boolean {
  if (filePath.startsWith("/")) return false;
  const segments = filePath.split(/[/\\]/);
  return segments.every(
    (seg) => seg !== ".." && SAFE_FILENAME_RE.test(seg) && seg.length > 0,
  );
}

/** Validate the incoming request body, returning an error string or null. */
function validateBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return "Request body must be a JSON object.";

  const { files, type } = body as Record<string, unknown>;

  if (!Array.isArray(files)) return "'files' must be an array.";
  if (files.length === 0) return "'files' must not be empty.";
  if (files.length > MAX_FILE_COUNT) return `Too many files. Maximum is ${MAX_FILE_COUNT}.`;

  if (type !== undefined && type !== "jd" && type !== "profile" && type !== "auto") {
    return "'type' must be one of: 'jd', 'profile', 'auto'.";
  }

  let totalBytes = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i] as Record<string, unknown>;
    if (!file || typeof file !== "object") return `files[${i}] must be an object.`;

    if (typeof file.name !== "string" || file.name.length === 0) {
      return `files[${i}].name must be a non-empty string.`;
    }
    if (typeof file.path !== "string" || file.path.length === 0) {
      return `files[${i}].path must be a non-empty string.`;
    }
    if (typeof file.content !== "string") {
      return `files[${i}].content must be a string.`;
    }

    if (!isPathSafe(file.path as string)) {
      return `files[${i}].path contains unsafe characters or path traversal.`;
    }

    totalBytes += Buffer.byteLength(file.content as string, "utf-8");
  }

  if (totalBytes > MAX_TOTAL_BYTES) {
    return `Total content size exceeds 10 MB limit.`;
  }

  return null;
}

// --- Route ---

uploadRouter.post("/", async (req, res, next) => {
  try {
    const validationError = validateBody(req.body);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const { files, type = "auto" } = req.body as UploadRequest;

    let jdCount = 0;
    let profileCount = 0;
    const writtenPaths: string[] = [];

    for (const file of files) {
      // Determine destination directory
      let destDir: string;

      if (type === "jd") {
        destDir = env.VAULT_PATH;
        jdCount++;
      } else if (type === "profile") {
        destDir = env.PROFILE_PATH;
        profileCount++;
      } else {
        // auto-detect
        if (isJobDescription(file.content)) {
          destDir = env.VAULT_PATH;
          jdCount++;
        } else {
          destDir = env.PROFILE_PATH;
          profileCount++;
        }
      }

      const fullPath = path.join(destDir, file.path);

      // Double-check resolved path stays inside the destination directory
      const resolved = path.resolve(fullPath);
      const resolvedDir = path.resolve(destDir);
      if (!resolved.startsWith(resolvedDir + path.sep) && resolved !== resolvedDir) {
        res.status(400).json({ error: `Resolved path escapes destination directory: ${file.path}` });
        return;
      }

      // Ensure parent directory exists
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, file.content, "utf-8");

      writtenPaths.push(file.path);
    }

    const response: UploadResponse = {
      uploaded: writtenPaths.length,
      jdCount,
      profileCount,
      files: writtenPaths,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});
