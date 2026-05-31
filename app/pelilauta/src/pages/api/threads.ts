import { getAccount } from "@pelilauta/auth/server";
import { verifyIdToken } from "@pelilauta/firebase/server";
import type { APIRoute } from "astro";

function getBearerToken(header: string | null): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export const POST: APIRoute = async ({ request }) => {
  const idToken = getBearerToken(request.headers.get("authorization"));
  if (!idToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await verifyIdToken(idToken, true);
    uid = decoded.uid;
  } catch (error) {
    console.debug("[api/threads] POST - verifyIdToken failed", error);
    return new Response("Unauthorized", { status: 401 });
  }

  const account = await getAccount(uid);
  if (account?.frozen === true) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response("Not implemented", { status: 501 });
};
