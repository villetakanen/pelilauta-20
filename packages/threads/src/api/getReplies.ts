// getReplies — SSR-only sub-collection accessor for thread replies.
//
// Reads `stream/{threadKey}/comments` from Firestore (admin SDK),
// parses each document through ReplySchema, and returns the array
// sorted ascending by flowTime with createdAt as tie-breaker.
//
// Empty threadKey returns [] without issuing any Firestore read.
// Errors (Firestore network/permission failures and Zod parse errors) propagate
// to the caller — no fallback array is substituted.
//
// See specs/pelilauta/threads/replies/spec.md §API Contracts.

import { getDb } from "@pelilauta/firebase/server";
import { REPLIES_COLLECTION, type Reply, ReplySchema } from "../schemas/ReplySchema";
import { THREADS_COLLECTION_NAME } from "../schemas/ThreadSchema";

export async function getReplies(threadKey: string): Promise<Reply[]> {
  if (!threadKey) {
    return [];
  }

  const snapshot = await getDb()
    .collection(THREADS_COLLECTION_NAME)
    .doc(threadKey)
    .collection(REPLIES_COLLECTION)
    .get();

  const replies = snapshot.docs.map((doc: { id: string; data: () => Record<string, unknown> }) =>
    ReplySchema.parse({ ...doc.data(), key: doc.id, threadKey }),
  );

  return replies.sort((a, b) => {
    const flowDiff = a.flowTime - b.flowTime;
    if (flowDiff !== 0) return flowDiff;
    const aTime = a.createdAt?.getTime() ?? 0;
    const bTime = b.createdAt?.getTime() ?? 0;
    return aTime - bTime;
  });
}
