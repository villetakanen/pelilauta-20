import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "pnpm preview",
    port: 4322,
    reuseExistingServer: false,
  },
  use: {
    baseURL: "http://localhost:4322",
  },
});
