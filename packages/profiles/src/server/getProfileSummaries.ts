import { getDb } from "@pelilauta/firebase/server";
import { PROFILES_COLLECTION_NAME, type ProfileSummary, ProfileSummarySchema } from "./schemas";

export async function getProfileSummaries(
  uids: string[],
): Promise<Map<string, ProfileSummary | null>> {
  const normalized = [...new Set(uids.filter((uid) => uid && uid !== "-"))];
  const out = new Map<string, ProfileSummary | null>();
  if (normalized.length === 0) return out;

  const refs = normalized.map((uid) => getDb().collection(PROFILES_COLLECTION_NAME).doc(uid));
  const docs = await getDb().getAll(...refs);

  for (const doc of docs) {
    if (!doc.exists) {
      out.set(doc.id, null);
      continue;
    }
    out.set(doc.id, ProfileSummarySchema.parse({ ...doc.data(), key: doc.id }));
  }

  return out;
}
