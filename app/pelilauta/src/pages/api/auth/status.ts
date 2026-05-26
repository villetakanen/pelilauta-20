import { getAccount } from "@pelilauta/auth/server";
import type { APIRoute } from "astro";
import { resolveSessionFromCookie } from "../../../utils/resolveSession";

const JSON_NO_STORE = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export const GET: APIRoute = async ({ cookies }) => {
  const { uid, claims } = await resolveSessionFromCookie(
    cookies.get("session")?.value,
    "api/auth/status",
  );

  if (uid === null) {
    return new Response(JSON.stringify({ loggedIn: false, uid: null, claims: null }), {
      status: 200,
      headers: JSON_NO_STORE,
    });
  }

  const account = await getAccount(uid);
  const frozen = account?.frozen ?? false;

  return new Response(JSON.stringify({ loggedIn: true, uid, claims, frozen }), {
    status: 200,
    headers: JSON_NO_STORE,
  });
};
