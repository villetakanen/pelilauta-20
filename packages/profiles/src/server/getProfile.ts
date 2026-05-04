import { getDb } from "@pelilauta/firebase/server";
import { logError } from "@pelilauta/utils/log";
import { PROFILES_COLLECTION_NAME, type Profile, ProfileSchema } from "./schemas";

export async function getProfile(uid: string): Promise<Profile | null> {
  if (!uid || uid === "-") return null;
  const snapshot = await getDb().collection(PROFILES_COLLECTION_NAME).doc(uid).get();
  if (!snapshot.exists) return null;

  const parsed = ProfileSchema.safeParse({ ...snapshot.data(), key: snapshot.id });
  if (!parsed.success) {
    logError("[profiles] getProfile parse failed", { uid, issues: parsed.error.issues });
    return null;
  }
  return parsed.data;
}
