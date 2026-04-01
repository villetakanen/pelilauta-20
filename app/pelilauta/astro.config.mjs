import path from "node:path";
import svelte from "@astrojs/svelte";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [svelte()],
  vite: {
    resolve: {
      alias: {
        "@cyan": path.resolve(import.meta.dirname, "../../packages/cyan/src"),
        "@shell": path.resolve(import.meta.dirname, "../../packages/shell/src"),
      },
    },
  },
});
