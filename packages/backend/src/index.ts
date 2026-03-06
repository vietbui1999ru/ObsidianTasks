import { env } from "./config/env.js";
import { createApp } from "./server.js";

const { server } = createApp();

server.listen(env.PORT, () => {
  console.log(`Backend running on http://localhost:${env.PORT}`);
  console.log(`WebSocket at ws://localhost:${env.PORT}/ws/progress`);
});
