import { getDb } from "@pelilauta/firebase/server";
import { PROFILES_COLLECTION_NAME, type Profile, ProfileSchema } from "./schemas";

export async function getProfile(uid: string): Promise<Profile | null> {
  if (!uid || uid === "-") return null;
  const snapshot = await getDb().collection(PROFILES_COLLECTION_NAME).doc(uid).get();
  if (!snapshot.exists) return null;
  return ProfileSchema.parse({ ...snapshot.data(), key: snapshot.id });
}
