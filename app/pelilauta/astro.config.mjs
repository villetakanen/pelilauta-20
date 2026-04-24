import path from "node:path";
import netlify from "@astrojs/netlify";
import svelte from "@astrojs/svelte";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [svelte()],
  output: "server",
  adapter: netlify({ edgeMiddleware: false }),
  vite: {
    envPrefix: ["PUBLIC_"],
    resolve: {
      alias: {
        "@cyan": path.resolve(import.meta.dirname, "../../packages/cyan/src"),
        "@shell": path.resolve(import.meta.dirname, "../../packages/shell/src"),
      },
    },
  },
});
