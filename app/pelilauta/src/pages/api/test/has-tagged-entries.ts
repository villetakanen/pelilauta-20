// Dev-only E2E fixture endpoint. Exposes hasTaggedEntries via HTTP so Playwright
// tests can verify the helper against real Firestore data without going through
// a production route.
// Triple-layer defense ensures this route is inert in production.
// See specs/pelilauta/tags/spec.md §Test-only API endpoint.

import { hasTaggedEntries } from "@pelilauta/tags/server";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
  // Layer 1: dev-only build guard — production builds return 404 immediately.
  if (!import.meta.env.DEV) return new Response(null, { status: 404 });

  // Layer 2: env var presence — missing secret means dev maintainer forgot to
  // configure the route; fail closed rather than open.
  const expectedSecret = import.meta.env.SECRET_e2e_seed_secret;
  if (!expectedSecret) return new Response("Test route not configured", { status: 500 });

  // Layer 3: header match — caller must prove knowledge of the secret.
  if (request.headers.get("x-e2e-seed-secret") !== expectedSecret) {
    return new Response(null, { status: 401 });
  }

  // Param validation.
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) return new Response("Missing slug", { status: 400 });

  const result = await hasTaggedEntries(slug);

  return new Response(JSON.stringify({ result }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
