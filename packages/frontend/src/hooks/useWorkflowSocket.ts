import { useState, useEffect, useRef, useCallback } from "react";
import type { NodeStatusEvent } from "@obsidian-tasks/shared";

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

export function useWorkflowSocket() {
  const [lastEvent, setLastEvent] = useState<NodeStatusEvent | null>(null);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const unmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/progress`);
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      setConnected(true);
      retriesRef.current = 0;
    });

    ws.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data) as NodeStatusEvent;
        setLastEvent(data);
      } catch {
        // Ignore unparseable messages
      }
    });

    ws.addEventListener("close", () => {
      setConnected(false);
      wsRef.current = null;

      if (unmountedRef.current) return;
      if (retriesRef.current >= MAX_RETRIES) return;

      const delay = BASE_DELAY_MS * Math.pow(2, retriesRef.current);
      retriesRef.current += 1;
      setTimeout(connect, delay);
    });

    ws.addEventListener("error", () => {
      // The close event will fire after error, which handles reconnection
      ws.close();
    });
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  return { lastEvent, connected };
}
