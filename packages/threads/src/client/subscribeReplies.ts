// subscribeReplies — CSR realtime listener for thread replies.
//
// Wraps Firestore client SDK `onSnapshot` over `stream/{threadKey}/comments`
// ordered by createdAt asc. Emits docChanges() diffs to the caller.
//
// Per-doc parse failures drop the malformed doc and log via
// @pelilauta/utils/log — the listener never throws.
// Returns the unsubscribe handle.
//
// See specs/pelilauta/threads/detail-page/replies/spec.md §API Contracts
// and §subscribeReplies emits diff updates and survives bad docs
// and §subscribeReplies emits diff updates and survives bad docs.
//
// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §subscribeReplies emits diff updates and survives bad docs
// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §subscribeReplies emits diff updates and survives bad docs

import { getDb } from "@pelilauta/firebase/client";
import { logError } from "@pelilauta/utils/log";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { REPLIES_COLLECTION, type Reply, ReplySchema } from "../schemas/ReplySchema";
import { THREADS_COLLECTION_NAME } from "../schemas/ThreadSchema";

export interface ReplyDiff {
  added: Reply[];
  modified: Reply[];
  removed: string[];
}

export type RepliesChangeCallback = (diff: ReplyDiff) => void;

/**
 * Subscribes to realtime updates for the reply sub-collection of a thread.
 * Orders by createdAt ascending. Emits a docChanges diff on each snapshot.
 * Returns the unsubscribe handle.
 */
export function subscribeReplies(threadKey: string, onChange: RepliesChangeCallback): () => void {
  const db = getDb();
  const repliesRef = collection(db, THREADS_COLLECTION_NAME, threadKey, REPLIES_COLLECTION);
  const repliesQuery = query(repliesRef, orderBy("createdAt", "asc"));

  const unsubscribe = onSnapshot(repliesQuery, (snapshot) => {
    const added: Reply[] = [];
    const modified: Reply[] = [];
    const removed: string[] = [];

    for (const change of snapshot.docChanges()) {
      if (change.type === "removed") {
        removed.push(change.doc.id);
        continue;
      }

      try {
        const reply = ReplySchema.parse({
          ...change.doc.data(),
          key: change.doc.id,
          threadKey,
        });

        if (change.type === "added") {
          added.push(reply);
        } else if (change.type === "modified") {
          modified.push(reply);
        }
      } catch (error) {
        logError("[subscribeReplies] parse failure", { docId: change.doc.id, error });
      }
    }

    onChange({ added, modified, removed });
  });

  return unsubscribe;
}
