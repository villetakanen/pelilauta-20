// getSite — single-document site accessor by key.
//
// Reads `sites/{key}` from Firestore and parses through SiteSchema.
// Returns undefined for missing documents; errors propagate to the caller.
//
// See specs/pelilauta/sites/spec.md §Accessor Surfaces.

import { getDb } from "@pelilauta/firebase/server";
import { migrateLegacySiteFields } from "../schemas/migrateLegacySiteFields";
import { SITES_COLLECTION_NAME, type Site, SiteSchema } from "../schemas/SiteSchema";

export async function getSite(key: string): Promise<Site | undefined> {
  const snapshot = await getDb().collection(SITES_COLLECTION_NAME).doc(key).get();

  if (!snapshot.exists) {
    return undefined;
  }

  const data = migrateLegacySiteFields({ ...snapshot.data(), key: snapshot.id } as Partial<Site>);
  return SiteSchema.parse(data);
}
