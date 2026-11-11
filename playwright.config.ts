import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  use: {
    actionTimeout: 10_000,
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start -w @catch/server",
    url: "http://127.0.0.1:3100/api/health",
    env: { PORT: "3100" },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
