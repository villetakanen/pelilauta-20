import { defineMiddleware } from "astro:middleware";
import type { APIContext, MiddlewareNext } from "astro";
import { resolveSessionFromCookie } from "./utils/resolveSession";

type SessionContext = Pick<APIContext, "cookies" | "locals">;

export async function handleRequest({ cookies, locals }: SessionContext, next: MiddlewareNext) {
  const { uid, claims } = await resolveSessionFromCookie(
    cookies.get("session")?.value,
    "middleware",
  );
  locals.uid = uid;
  locals.claims = claims;
  locals.sessionState = uid !== null ? "active" : "initial";
  return next();
}

export const onRequest = defineMiddleware(handleRequest);
