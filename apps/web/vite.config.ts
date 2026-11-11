import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiPort = Number(process.env.PORT ?? 3000);
const webPort = Number(process.env.WEB_PORT ?? 5173);
for (const port of [apiPort, webPort]) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT e WEB_PORT devem ser portas válidas.");
}
if (apiPort === webPort) throw new Error("PORT e WEB_PORT devem ser diferentes.");
const target = `http://127.0.0.1:${apiPort}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: webPort,
    strictPort: true,
    proxy: {
      "/api": target,
      "/socket.io": { target, ws: true },
    },
  },
});
