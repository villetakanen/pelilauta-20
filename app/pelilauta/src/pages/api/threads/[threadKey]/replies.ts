// POST /api/threads/{threadKey}/replies
//
// Creates a new reply document under stream/{threadKey}/comments.
// Auth: Authorization: Bearer <Firebase ID token>
// Body: { markdownContent: string; images?: ImageArray; quoteref?: string }
//
// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §POST /api/threads/{threadKey}/replies requires a bearer token
// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Invalid bearer token is rejected
// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Frozen accounts are blocked at the write endpoint
// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Empty markdownContent is rejected
// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Whitespace-only markdownContent is rejected
// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Missing thread returns 404
// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Successful write returns the parsed Reply
// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Client-provided owners and timestamps are ignored

import { getAccount } from "@pelilauta/auth/server";
import { getDb, verifyIdToken } from "@pelilauta/firebase/server";
import {
  REPLIES_COLLECTION,
  ReplySchema,
  THREADS_COLLECTION_NAME,
} from "@pelilauta/threads/server";
import type { APIRoute } from "astro";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

// Request body schema — in-route only, NOT a stored shape.
// images rejected (non-empty) per v1 contract.
const ImageEntrySchema = z.object({
  url: z.string(),
  alt: z.string(),
});

const ReplyRequestSchema = z.object({
  markdownContent: z.string().trim().min(1, "markdownContent is required and must not be empty"),
  images: z.array(ImageEntrySchema).optional(),
  quoteref: z.string().optional(),
});

function getBearerToken(header: string | null): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export const POST: APIRoute = async ({ request, params }) => {
  const { threadKey } = params;

  if (!threadKey) {
    return new Response(JSON.stringify({ error: "Missing threadKey" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- Auth: Bearer token ---
  const idToken = getBearerToken(request.headers.get("authorization"));
  if (!idToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await verifyIdToken(idToken, true);
    uid = decoded.uid;
  } catch (error) {
    console.debug("[api/threads/[threadKey]/replies] POST - verifyIdToken failed", error);
    return new Response("Unauthorized", { status: 401 });
  }

  // --- Frozen check ---
  const account = await getAccount(uid);
  if (account?.frozen === true) {
    return new Response("Forbidden", { status: 403 });
  }

  // --- Body validation ---
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Request body must be valid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = ReplyRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Invalid request body";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { markdownContent, images, quoteref } = parsed.data;

  // Reject non-empty images array (v1 contract: images not supported)
  if (images && images.length > 0) {
    return new Response(
      JSON.stringify({ error: "Image attachments are not supported in this version" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // --- Verify thread exists ---
  const db = getDb();
  const threadDoc = await db.collection(THREADS_COLLECTION_NAME).doc(threadKey).get();
  if (!threadDoc.exists) {
    return new Response(JSON.stringify({ error: "Thread not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- Write the reply ---
  // Server-assigned fields only: owners, author, createdAt, updatedAt, flowTime, threadKey, key
  // Client-provided values for these are ignored.
  const now = Date.now();
  const replyData: Record<string, unknown> = {
    owners: [uid],
    author: uid,
    threadKey,
    markdownContent,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    flowTime: now,
    images: [],
  };

  if (quoteref) {
    replyData.quoteref = quoteref;
  }

  try {
    const repliesCol = db
      .collection(THREADS_COLLECTION_NAME)
      .doc(threadKey)
      .collection(REPLIES_COLLECTION);

    const docRef = await repliesCol.add(replyData);

    // Read back the written doc to get resolved server timestamps
    const writtenDoc = await docRef.get();
    if (!writtenDoc.exists) {
      return new Response(JSON.stringify({ error: "Failed to read written reply" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const reply = ReplySchema.parse({
      ...writtenDoc.data(),
      key: writtenDoc.id,
      threadKey,
    });

    return new Response(JSON.stringify(reply), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[api/threads/[threadKey]/replies] POST - Firestore error", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
