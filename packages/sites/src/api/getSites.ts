// getSites — paginated public sites query sorted by flowTime.
//
// Queries the `sites` collection with optional visibility and uid filters.
// Errors propagate to the caller per spec §Accessor Surfaces "Error behavior."
//
// See specs/pelilauta/sites/spec.md §Accessor Surfaces.

import { getDb } from "@pelilauta/firebase/server";
import { migrateLegacySiteFields } from "../schemas/migrateLegacySiteFields";
import { SITES_COLLECTION_NAME, type Site, SiteSchema } from "../schemas/SiteSchema";

interface GetSitesOptions {
  order?: "flowTime";
  public?: boolean;
  uid?: string;
}

export async function getSites(limit: number, options: GetSitesOptions = {}): Promise<Site[]> {
  const { order = "flowTime", public: isPublic = true, uid } = options;

  // Base query: filter by hidden (public API name maps to hidden===false storage predicate)
  // When uid is supplied, additionally filter to sites where owners array-contains uid
  const base = getDb().collection(SITES_COLLECTION_NAME).where("hidden", "==", !isPublic);

  const withUid = uid ? base.where("owners", "array-contains", uid) : base;

  const query = withUid.orderBy(order, "desc").limit(limit);

  const snapshot = await query.get();

  return snapshot.docs.map((doc: { id: string; data: () => Record<string, unknown> }) => {
    const data = migrateLegacySiteFields({ ...doc.data(), key: doc.id } as Partial<Site>);
    return SiteSchema.parse(data);
  });
}
