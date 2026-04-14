import { resolve } from "node:path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [svelte({ hot: false })],
  envPrefix: ["PUBLIC_", "SECRET_"],
  envDir: resolve(__dirname, "../.."),
  resolve: {
    alias: {
      "@cyan": resolve(__dirname, "../cyan/src"),
    },
    conditions: ["browser"],
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "jsdom",
  },
});
