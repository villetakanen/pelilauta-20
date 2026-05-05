import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  envPrefix: ["PUBLIC_", "SECRET_"],
  envDir: resolve(__dirname, "../.."),
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
