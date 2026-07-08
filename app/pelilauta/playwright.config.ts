import { defineConfig } from "@playwright/test";
import { config as loadDotenv } from "dotenv";

// Load SECRET_* vars from .env.development so the auth fixture can read
// SECRET_e2e_seed_secret in the Playwright Node process.
loadDotenv({ path: "../../.env.development" });

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "pnpm dev:e2e",
    port: 4323,
    reuseExistingServer: false,
    timeout: 120000,
  },
  use: {
    baseURL: "http://localhost:4323",
  },
});
