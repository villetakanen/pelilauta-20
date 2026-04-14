import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "pnpm dev",
    port: 4321,
    reuseExistingServer: false,
    timeout: 120000,
  },
  use: {
    baseURL: "http://localhost:4321",
  },
});
