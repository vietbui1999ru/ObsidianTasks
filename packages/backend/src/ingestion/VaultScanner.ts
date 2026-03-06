import { readFile } from "node:fs/promises";
import { glob } from "glob";

/** Raw file entry returned by the vault scanner. */
export interface ScannedFile {
  filePath: string;
  content: string;
}

/**
 * Hidden directory prefixes that should be excluded from vault scans.
 * Obsidian stores configuration, trash, and plugin data in dotdirs
 * that are not user-authored markdown.
 */
const HIDDEN_DIR_PATTERN = "**/.*/";

/**
 * Recursively scans a vault directory for markdown files, skipping hidden
 * directories like `.obsidian`, `.trash`, `.git`, etc.
 *
 * @param vaultPath - Absolute path to the Obsidian vault root.
 * @returns Array of `{ filePath, content }` for every `.md` file found.
 */
export async function scanVault(vaultPath: string): Promise<ScannedFile[]> {
  if (!vaultPath) {
    throw new Error("scanVault requires a non-empty vault path");
  }

  const paths = await glob("**/*.md", {
    cwd: vaultPath,
    absolute: true,
    ignore: [HIDDEN_DIR_PATTERN],
    nodir: true,
  });

  // Read files in parallel; skip any that fail (e.g. permission issues).
  const results = await Promise.allSettled(
    paths.map(async (filePath) => {
      const content = await readFile(filePath, "utf-8");
      return { filePath, content } satisfies ScannedFile;
    }),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<ScannedFile> => r.status === "fulfilled",
    )
    .map((r) => r.value);
}
