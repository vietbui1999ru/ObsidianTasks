import { useState, useCallback } from "react";
import { uploadFiles, type UploadedFile } from "../api/client.js";

export interface UseFileUploadReturn {
  upload: (files: UploadedFile[]) => Promise<void>;
  isUploading: boolean;
  error: string | null;
  lastResult: { count: number; type: string } | null;
}

export function useFileUpload(): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    count: number;
    type: string;
  } | null>(null);

  const upload = useCallback(async (files: UploadedFile[]) => {
    if (files.length === 0) return;
    setIsUploading(true);
    setError(null);
    setLastResult(null);
    try {
      const result = await uploadFiles(files);
      setLastResult(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to upload files";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { upload, isUploading, error, lastResult };
}

/**
 * Read a File object using FileReader and return an UploadedFile.
 * Only accepts .md files; rejects others silently.
 */
export function readFileAsUploadedFile(
  file: File,
): Promise<UploadedFile | null> {
  return new Promise((resolve) => {
    if (!file.name.endsWith(".md")) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        path: file.webkitRelativePath || file.name,
        content: reader.result as string,
      });
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}
