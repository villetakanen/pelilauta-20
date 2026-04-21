import { defineMiddleware } from "astro:middleware";
import { extractCustomClaims, verifySessionCookie } from "@pelilauta/firebase/server";
import type { APIContext, MiddlewareNext } from "astro";

type SessionContext = Pick<APIContext, "cookies" | "locals">;

export async function handleRequest({ cookies, locals }: SessionContext, next: MiddlewareNext) {
  const sessionCookie = cookies.get("session")?.value;

  if (!sessionCookie) {
    locals.uid = null;
    locals.claims = null;
    locals.sessionState = "initial";
    return next();
  }

  try {
    const decodedClaims = await verifySessionCookie(sessionCookie, true);
    locals.uid = decodedClaims.uid;
    locals.claims = extractCustomClaims(decodedClaims);
    locals.sessionState = "active";
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (!code?.startsWith("auth/")) {
      console.error("[middleware] Unexpected session verification failure", error);
    }
    locals.uid = null;
    locals.claims = null;
    locals.sessionState = "initial";
  }

  return next();
}

export const onRequest = defineMiddleware(handleRequest);
