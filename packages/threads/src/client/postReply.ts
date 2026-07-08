// postReply — client-side write helper for thread replies.
//
// Posts to POST /api/threads/{threadKey}/replies with a Firebase ID token
// in the Authorization: Bearer header. Parses the response through ReplySchema
// before returning so consumers always receive a fully-typed Reply with Date instances.
//
// Verifies: specs/pelilauta/threads/detail-page/replies/authoring/spec.md §postReply parses the response through ReplySchema
// Verifies: specs/pelilauta/threads/detail-page/replies/authoring/spec.md §postReply rejects non-2xx responses

import type { Reply } from "../schemas/ReplySchema";
import { ReplySchema } from "../schemas/ReplySchema";

export interface PostReplyBody {
  markdownContent: string;
  images?: Array<{ url: string; alt: string }>;
  quoteref?: string;
}

/**
 * Posts a reply to the given thread via the Astro API route.
 *
 * @param threadKey - The thread's Firestore document key.
 * @param body - The reply body. Only markdownContent, images, and quoteref are sent.
 * @param idToken - Firebase ID token for Authorization: Bearer header.
 * @returns The server-parsed Reply (timestamps as Date instances).
 * @throws Error on non-2xx responses or parse failure.
 */
export async function postReply(
  threadKey: string,
  body: PostReplyBody,
  idToken: string,
): Promise<Reply> {
  const response = await fetch(`/api/threads/${threadKey}/replies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorMessage: string;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        const errBody = await response.json();
        errorMessage = errBody.error ?? response.statusText;
      } catch {
        errorMessage = response.statusText;
      }
    } else {
      errorMessage = await response.text().catch(() => response.statusText);
    }
    throw new Error(`${response.status}: ${errorMessage}`);
  }

  const json = await response.json();
  return ReplySchema.parse(json);
}
