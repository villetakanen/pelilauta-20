import path from "node:path";
import mdx from "@astrojs/mdx";
import svelte from "@astrojs/svelte";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [svelte(), mdx()],
  vite: {
    resolve: {
      alias: {
        "@cyan": path.resolve(import.meta.dirname, "../../packages/cyan/src"),
        "@pelilauta/icons": path.resolve(
          import.meta.dirname,
          "../../packages/pelilauta-icons/src/index.ts",
        ),
        "@myrrys/proprietary": path.resolve(
          import.meta.dirname,
          "../../packages/myrrys-proprietary/index.ts",
        ),
      },
    },
  },
});
