import { resolve } from "node:path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [svelte({ hot: false })],
  envPrefix: ["PUBLIC_", "SECRET_"],
  envDir: resolve(__dirname, "../.."),
  resolve: {
    conditions: ["browser"],
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "jsdom",
    passWithNoTests: true,
  },
});
