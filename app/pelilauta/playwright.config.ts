import { defineConfig } from "@playwright/test";
import { config as loadDotenv } from "dotenv";

// Load SECRET_* vars from .env.development so the auth fixture can read
// SECRET_e2e_seed_secret in the Playwright Node process.
loadDotenv({ path: "../../.env.development" });

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
