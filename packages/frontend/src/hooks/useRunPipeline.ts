import { useState, useCallback } from "react";
import { startRun } from "../api/client.js";

export function useRunPipeline() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (jobDescriptions: string[]) => {
    setIsRunning(true);
    setError(null);
    try {
      await startRun(jobDescriptions);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start run";
      setError(message);
    } finally {
      setIsRunning(false);
    }
  }, []);

  return { run, isRunning, error };
}
