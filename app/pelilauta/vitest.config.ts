import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@cyan": path.resolve(import.meta.dirname, "../../packages/cyan/src"),
      "@shell": path.resolve(import.meta.dirname, "../../packages/shell/src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
