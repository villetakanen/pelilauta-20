// Dev-only E2E fixture endpoint. Issues a real session cookie via the same
// admin SDK path as /api/auth/session so Playwright tests can plant an
// authenticated session without going through a real OAuth flow.
// Triple-layer defense ensures this route is inert in production.
// See specs/pelilauta/session/spec.md §Test-only seed route.

import { createSessionCookie, getAuth } from "@pelilauta/firebase/server";
import type { APIRoute } from "astro";

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export const POST: APIRoute = async ({ request, cookies }) => {
  // Layer 1: dev-only build guard — production builds return 404 immediately.
  if (!import.meta.env.DEV) return new Response(null, { status: 404 });

  // Layer 2: env var presence — missing secret means dev maintainer forgot to
  // configure the route; fail closed rather than open.
  const expectedSecret = import.meta.env.SECRET_e2e_seed_secret;
  if (!expectedSecret) return new Response("Seed route not configured", { status: 500 });

  // Layer 3: header match — caller must prove knowledge of the secret.
  const providedSecret = request.headers.get("x-e2e-seed-secret");
  if (providedSecret !== expectedSecret) return new Response(null, { status: 401 });

  let uid: unknown;
  let claims: unknown;
  try {
    const body = await request.json();
    uid = body.uid;
    claims = body.claims;
  } catch (e) {
    console.debug("[api/test/seed-session] POST - invalid JSON", e);
    return new Response("Invalid JSON", { status: 400 });
  }

  if (typeof uid !== "string" || !uid) {
    return new Response("Missing uid", { status: 400 });
  }

  // Step 1: mint a custom token via admin SDK.
  const adminAuth = getAuth();
  let customToken: string;
  try {
    customToken = await adminAuth.createCustomToken(
      uid,
      typeof claims === "object" && claims !== null ? (claims as Record<string, unknown>) : {},
    );
  } catch (e) {
    console.error("[api/test/seed-session] createCustomToken failed", e);
    return new Response("Custom token creation failed", { status: 500 });
  }

  // Step 2: exchange custom token → ID token via Firebase Auth REST API.
  const apiKey = import.meta.env.PUBLIC_apiKey;
  const exchangeRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  if (!exchangeRes.ok) {
    const errBody = await exchangeRes.text();
    console.error("[api/test/seed-session] custom-token exchange failed", errBody);
    return new Response("Custom token exchange failed", { status: 502 });
  }
  const { idToken } = await exchangeRes.json();

  // Step 3: create session cookie via admin SDK — same function the production
  // route uses. Cookie attrs must exactly match /api/auth/session.ts.
  const sessionCookie = await createSessionCookie(idToken, { expiresIn: FIVE_DAYS_MS });

  cookies.set("session", sessionCookie, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: FIVE_DAYS_MS / 1000,
  });

  return new Response(JSON.stringify({ uid }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
