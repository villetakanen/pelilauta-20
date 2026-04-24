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
    // Keep firebase-admin + its transitive deps out of the SSR bundle.
    // firebase-admin pulls in @grpc/grpc-js (CommonJS) which relies on
    // __dirname at runtime to locate native proto files. Bundling it into
    // an ESM chunk produces __dirname=undefined and crashes the first
    // Firestore call on Netlify Functions. Keeping it external means
    // Node resolves it via require() from node_modules at runtime.
    ssr: {
      external: [
        "firebase-admin",
        "firebase-admin/app",
        "firebase-admin/auth",
        "firebase-admin/firestore",
      ],
    },
  },
});
