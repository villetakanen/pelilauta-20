// getChannels — read the channel directory from the `meta/threads` document.
//
// The directory lives as a `topics` array on a single Firestore document; v17
// shape preserved verbatim per spec §Architecture. Result is memoized at
// module scope; write paths must call `clearChannelsCache()` after mutating
// the directory so subsequent reads observe the new state.
//
// See specs/pelilauta/threads/spec.md §Accessor Surfaces.

import { getDb } from "@pelilauta/firebase/server";
import { CHANNELS_META_REF, type Channel, ChannelsSchema } from "../schemas/ChannelSchema";

let _cache: Channel[] | undefined;

export async function getChannels(): Promise<Channel[]> {
  if (_cache) return _cache;

  const [collection, docId] = CHANNELS_META_REF.split("/");
  if (!collection || !docId) return [];

  const snapshot = await getDb().collection(collection).doc(docId).get();
  const topics = snapshot.data()?.topics;

  if (!Array.isArray(topics)) return [];

  _cache = ChannelsSchema.parse(topics);
  return _cache;
}

export function clearChannelsCache(): void {
  _cache = undefined;
}
