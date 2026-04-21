import path from "node:path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  resolve: {
    alias: {
      "@cyan": path.resolve(import.meta.dirname, "../../packages/cyan/src"),
      "@shell": path.resolve(import.meta.dirname, "../../packages/shell/src"),
      "astro:middleware": path.resolve(import.meta.dirname, "./src/test/astro-middleware-stub.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
