// hasTaggedEntries — presence-check helper for the tags Firestore collection.
//
// Returns true when at least one document in tags/{key} has the canonical slug
// or any of its synonyms in its `tags` array. Returns false otherwise.
// Errors propagate — no swallowing, matching the read discipline of getSites/getThreads.
//
// See specs/pelilauta/tags/spec.md §Helper Surfaces.

import { getDb } from "@pelilauta/firebase/server";
import { getSupertag } from "../helpers/getSupertag";
import { resolveTagSynonym } from "../helpers/resolveTagSynonym";
import { TAG_FIRESTORE_COLLECTION } from "../schemas/TagSchema";

/**
 * Check whether any Firestore document in the tags collection matches the slug
 * (or any registered synonym of the slug's supertag).
 *
 * @param slug - Raw tag slug (any casing, canonical or synonym, URL-encoded ok).
 * @returns true if at least one matching document exists; false otherwise.
 */
export async function hasTaggedEntries(slug: string): Promise<boolean> {
  // Step 1: canonicalize the input slug.
  const canonical = resolveTagSynonym(slug);

  // Step 2: look up the registry entry to get the full synonym list.
  const supertag = getSupertag(canonical);

  // Step 3: build the full query-term array — canonical plus all synonyms,
  // decoded and lowercased to match how toTagData stores entry tags.
  // Deduplicated via Set: the canonical slug can decode to a string that's
  // also in the synonyms list (e.g. canonical 'd%26d' decodes to 'd&d',
  // which is also a D&D synonym). Firestore's array-contains-any behavior
  // with duplicate query terms is undocumented — passing a unique set keeps
  // us on the documented happy path.
  const allTags = [
    ...new Set(
      [canonical, ...(supertag?.synonyms ?? [])].map((s) => decodeURIComponent(s).toLowerCase()),
    ),
  ];

  // Step 4: query Firestore — limit(1) avoids reading more than necessary.
  const db = getDb();
  const snap = await db
    .collection(TAG_FIRESTORE_COLLECTION)
    .where("tags", "array-contains-any", allTags)
    .limit(1)
    .get();

  return !snap.empty;
}
