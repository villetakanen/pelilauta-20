import {
  createSessionCookie,
  extractCustomClaims,
  verifyIdToken,
  verifySessionCookie,
} from "@pelilauta/firebase/server";
import type { APIRoute } from "astro";
import type { DecodedIdToken } from "firebase-admin/auth";

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export const POST: APIRoute = async ({ request, cookies }) => {
  let idToken: string | undefined;
  try {
    const body = await request.json();
    idToken = body.idToken;
  } catch (e) {
    console.debug("[api/auth/session] POST - invalid JSON", e);
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!idToken) {
    return new Response("Missing idToken", { status: 400 });
  }

  let decoded: DecodedIdToken;
  try {
    decoded = await verifyIdToken(idToken, true);
  } catch (error) {
    console.debug("[api/auth/session] POST - verifyIdToken failed", error);
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const sessionCookie = await createSessionCookie(idToken, { expiresIn: FIVE_DAYS_MS });
    cookies.set("session", sessionCookie, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: FIVE_DAYS_MS / 1000,
    });
    return new Response(JSON.stringify({ status: "success", uid: decoded.uid }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[api/auth/session] POST - createSessionCookie failed", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ cookies }) => {
  cookies.delete("session", { path: "/" });
  return new Response(null, { status: 204 });
};

export const GET: APIRoute = async ({ cookies }) => {
  const sessionCookie = cookies.get("session")?.value;

  if (!sessionCookie) {
    return new Response(JSON.stringify({ uid: null, claims: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const decodedClaims = await verifySessionCookie(sessionCookie, true);
    return new Response(
      JSON.stringify({
        uid: decodedClaims.uid,
        claims: extractCustomClaims(decodedClaims),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (!code?.startsWith("auth/")) {
      console.error("[api/auth/session] GET - Unexpected session verification failure", error);
    }
    return new Response(JSON.stringify({ uid: null, claims: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
