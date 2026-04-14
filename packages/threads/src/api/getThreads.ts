// getThreads — paginated public thread query sorted by flowTime or createdAt.
//
// Queries the `stream` collection with optional visibility and order overrides.
// Errors propagate to the caller per spec §Accessor Surfaces "Error behavior."
//
// See specs/pelilauta/threads/spec.md §Accessor Surfaces.

import { getDb } from "@pelilauta/firebase/server";
import { THREADS_COLLECTION_NAME, type Thread, ThreadSchema } from "../schemas/ThreadSchema";

interface GetThreadsOptions {
  order?: "flowTime" | "createdAt";
  public?: boolean;
}

export async function getThreads(limit: number, options?: GetThreadsOptions): Promise<Thread[]> {
  const order = options?.order ?? "flowTime";
  const isPublic = options?.public ?? true;

  const query = getDb()
    .collection(THREADS_COLLECTION_NAME)
    .where("public", "==", isPublic)
    .orderBy(order, "desc")
    .limit(limit);

  const snapshot = await query.get();

  return snapshot.docs.map((doc: { id: string; data: () => Record<string, unknown> }) => {
    const data = doc.data();
    return ThreadSchema.parse({ ...data, key: doc.id });
  });
}
