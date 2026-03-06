import { useState, useCallback } from "react";
import type { VaultData } from "@obsidian-tasks/shared";
import { scanVault } from "../api/client.js";

export function useVaultScan() {
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    try {
      const data = await scanVault();
      setVaultData(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to scan vault";
      setError(message);
    } finally {
      setIsScanning(false);
    }
  }, []);

  return { scan, vaultData, isScanning, error };
}
