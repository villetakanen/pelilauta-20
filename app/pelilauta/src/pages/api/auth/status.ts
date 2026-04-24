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
  return new Response(JSON.stringify({ loggedIn: uid !== null, uid, claims }), {
    status: 200,
    headers: JSON_NO_STORE,
  });
};
