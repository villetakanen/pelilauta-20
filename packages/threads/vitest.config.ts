import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Astro-style env prefixes — mirror of packages/firebase's config so real
  // Firestore smokes (once Stage 2 accessors land) resolve the same env tree
  // as `astro dev`. Env files live at the repo root.
  envPrefix: ["PUBLIC_", "SECRET_"],
  envDir: resolve(__dirname, "../.."),
  test: {
    include: ["src/**/*.test.ts"],
  },
});
