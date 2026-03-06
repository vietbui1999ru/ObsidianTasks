import type { WebSocketServer, WebSocket } from "ws";
import type { NodeStatusEvent } from "@obsidian-tasks/shared";

const clients = new Set<WebSocket>();

export function progressGateway(wss: WebSocketServer) {
  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
  });
}

export function broadcastStatus(event: NodeStatusEvent) {
  const data = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(data);
    }
  }
}
