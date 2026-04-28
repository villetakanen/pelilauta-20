// getThread — single-document public thread accessor by key.
//
// Reads `stream/{key}` from Firestore and parses through ThreadSchema.
// Returns undefined for missing documents; errors propagate to the caller.
//
// See specs/pelilauta/threads/spec.md §Accessor Surfaces.

import { getDb } from "@pelilauta/firebase/server";
import { THREADS_COLLECTION_NAME, type Thread, ThreadSchema } from "../schemas/ThreadSchema";

export async function getThread(key: string): Promise<Thread | undefined> {
  const snapshot = await getDb().collection(THREADS_COLLECTION_NAME).doc(key).get();

  if (!snapshot.exists) {
    return undefined;
  }

  return ThreadSchema.parse({ ...snapshot.data(), key: snapshot.id });
}
