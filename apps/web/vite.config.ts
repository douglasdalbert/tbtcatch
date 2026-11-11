import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { loadAppConfig } from "../../scripts/env";

const { port: apiPort, webPort } = loadAppConfig();
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
