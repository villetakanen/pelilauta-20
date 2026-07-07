// Session recovery endpoint. When the client Firebase SDK has lost its local
// user but the server session cookie is still valid, AuthHandler POSTs here
// to obtain a custom token and re-signs the client in — instead of tearing
// the session down. See specs/pelilauta/session/state-machine.md.

import { getAuth } from "@pelilauta/firebase/server";
import type { APIRoute } from "astro";
import { resolveSessionFromCookie } from "../../../utils/resolveSession";

const JSON_NO_STORE = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export const POST: APIRoute = async ({ cookies }) => {
  const { uid } = await resolveSessionFromCookie(
    cookies.get("session")?.value,
    "api/auth/custom-token",
  );

  if (uid === null) return new Response(null, { status: 401 });

  // The minted identity comes from the verified cookie alone — no request
  // input may influence it (spec §Regression Guardrails).
  try {
    const token = await getAuth().createCustomToken(uid);
    return new Response(JSON.stringify({ token }), { status: 200, headers: JSON_NO_STORE });
  } catch (e) {
    console.error("[api/auth/custom-token] createCustomToken failed", e);
    return new Response(null, { status: 500 });
  }
};
