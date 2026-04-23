import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "pnpm dev",
    port: 4321,
    // Reuse a running dev server locally (so devs can keep `pnpm dev` open
    // alongside `pnpm test:e2e`); CI always starts a fresh one.
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  use: {
    baseURL: "http://localhost:4321",
  },
});
