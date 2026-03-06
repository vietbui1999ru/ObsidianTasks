import { useRef } from "react";
import { FolderSearch, AlertTriangle, Loader2, Upload } from "lucide-react";
import { useVaultScan } from "../../hooks/useVaultScan.js";
import {
  useFileUpload,
  readFileAsUploadedFile,
} from "../../hooks/useFileUpload.js";

export function VaultPreviewPanel() {
  const { scan, vaultData, isScanning, error } = useVaultScan();
  const { upload, isUploading } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    const parsed = await Promise.all(fileList.map(readFileAsUploadedFile));
    const valid = parsed.filter(
      (f): f is NonNullable<typeof f> => f !== null,
    );
    if (valid.length > 0) {
      await upload(valid);
    }
    // Reset so the same files can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Collapsed state when no data is loaded
  if (!vaultData && !isScanning && !error) {
    return (
      <div className="w-12 h-full bg-white border-r border-gray-200 flex flex-col items-center pt-4 gap-3">
        <button
          onClick={scan}
          className="p-2 rounded hover:bg-gray-100 text-gray-500"
          aria-label="Scan Vault"
          title="Scan Vault"
        >
          <FolderSearch className="w-5 h-5" />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="p-2 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-50"
          aria-label="Upload Files"
          title="Upload .md Files"
        >
          <Upload className="w-5 h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    );
  }

  return (
    <div className="w-72 h-full bg-white border-r border-gray-200 flex flex-col shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800">Vault Preview</h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
            title="Upload .md Files"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            Upload
          </button>
          <button
            onClick={scan}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            {isScanning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FolderSearch className="w-3.5 h-3.5" />
            )}
            {isScanning ? "Scanning..." : "Scan Vault"}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Loading */}
      {isScanning && !vaultData && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3">
          <p className="text-xs text-red-600 bg-red-50 rounded p-2">
            {error}
          </p>
        </div>
      )}

      {/* Vault summary */}
      {vaultData && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 space-y-3">
            {/* Profile */}
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Profile
              </h3>
              <p className="text-sm font-medium text-gray-800">
                {vaultData.profile.name}
              </p>
              {vaultData.profile.email && (
                <p className="text-xs text-gray-500">
                  {vaultData.profile.email}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Skills" count={vaultData.skills.length} />
              <StatCard label="Projects" count={vaultData.projects.length} />
              <StatCard
                label="Experience"
                count={vaultData.experiences.length}
              />
            </div>

            {/* Education count */}
            {vaultData.education.length > 0 && (
              <div className="text-xs text-gray-500">
                {vaultData.education.length} education{" "}
                {vaultData.education.length === 1 ? "entry" : "entries"}
              </div>
            )}

            {/* Warnings */}
            {vaultData.warnings.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Warnings
                </h3>
                <ul className="space-y-1">
                  {vaultData.warnings.map((warning, i) => (
                    <li
                      key={i}
                      className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1"
                    >
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded bg-gray-50 px-2 py-1.5 text-center">
      <p className="text-lg font-semibold text-gray-800">{count}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">
        {label}
      </p>
    </div>
  );
}
