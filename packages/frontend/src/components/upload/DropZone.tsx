import { useState, useCallback, useEffect, useRef } from "react";
import { Upload, FileText, CheckCircle, XCircle } from "lucide-react";
import {
  useFileUpload,
  readFileAsUploadedFile,
} from "../../hooks/useFileUpload.js";

export function DropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredFiles, setHoveredFiles] = useState<string[]>([]);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const dragCounter = useRef(0);
  const { upload, isUploading, error, lastResult } = useFileUpload();

  // Show toast on success or error
  useEffect(() => {
    if (lastResult) {
      setToast({
        message: `Uploaded ${lastResult.count} file${lastResult.count === 1 ? "" : "s"} successfully`,
        type: "success",
      });
    }
  }, [lastResult]);

  useEffect(() => {
    if (error) {
      setToast({ message: error, type: "error" });
    }
  }, [error]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (dragCounter.current === 1) {
      setIsDragging(true);
      const items = e.dataTransfer?.items;
      if (items) {
        const names: string[] = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === "file") {
            names.push(item.type || "file");
          }
        }
        setHoveredFiles(names);
      }
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
      setHoveredFiles([]);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);
      setHoveredFiles([]);

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const fileList = Array.from(files);
      const parsed = await Promise.all(fileList.map(readFileAsUploadedFile));
      const valid = parsed.filter(
        (f): f is NonNullable<typeof f> => f !== null,
      );

      if (valid.length === 0) {
        setToast({
          message: "No .md files found in the dropped items",
          type: "error",
        });
        return;
      }

      await upload(valid);
    },
    [upload],
  );

  // Attach window-level drag listeners
  useEffect(() => {
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return (
    <>
      {/* Full-screen drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-500/10 backdrop-blur-[2px] transition-opacity duration-200">
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-blue-400 bg-white/90 px-16 py-12 shadow-xl">
            <Upload className="w-12 h-12 text-blue-500" />
            <p className="text-lg font-semibold text-gray-700">
              Drop markdown files here
            </p>
            {hoveredFiles.length > 0 && (
              <p className="text-sm text-gray-500">
                {hoveredFiles.length} file{hoveredFiles.length === 1 ? "" : "s"}{" "}
                detected
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <FileText className="w-4 h-4" />
              <span>Only .md files will be uploaded</span>
            </div>
          </div>
        </div>
      )}

      {/* Uploading indicator */}
      {isUploading && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-white px-4 py-3 shadow-lg border border-gray-200">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-700">Uploading files...</span>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg border transition-opacity duration-200 ${
            toast.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
          <span className="text-sm">{toast.message}</span>
        </div>
      )}
    </>
  );
}
