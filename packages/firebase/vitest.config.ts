import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Astro-style env prefixes so `import.meta.env.PUBLIC_*` / `SECRET_*` resolve
  // under vitest the same way they do under `astro dev`. Env files live at the
  // repo root so all workspace packages share one source of truth.
  envPrefix: ["PUBLIC_", "SECRET_"],
  envDir: resolve(__dirname, "../.."),
  test: {
    include: ["src/**/*.test.ts"],
  },
});
