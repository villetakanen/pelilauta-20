import { createHash } from "node:crypto";
import { getProfile } from "@pelilauta/profiles/server";
import type { APIRoute } from "astro";

const CACHE_CONTROL = "s-maxage=60, stale-while-revalidate=300";

export const GET: APIRoute = async ({ params, request }) => {
  const uid = params.uid;
  if (!uid) return new Response("Missing uid", { status: 400 });

  const profile = await getProfile(uid);
  if (!profile) return new Response("Not found", { status: 404 });

  const body = JSON.stringify(profile);
  const etag = createHash("sha1").update(body).digest("hex");
  const ifNoneMatch = request.headers.get("if-none-match");

  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": CACHE_CONTROL,
      },
    });
  }

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ETag: etag,
      "Cache-Control": CACHE_CONTROL,
    },
  });
};
