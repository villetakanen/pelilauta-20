// getSupertag — pure registry lookup helper.
//
// Renamed from v17's getTagDisplayInfo. Returns the SupertagEntry for a
// given slug (canonical or any synonym), or null if the slug is not
// registered. Plain-tag fallback is the consumer's responsibility.
//
// The decodeURIComponent on entry.canonicalTag is defensive — registry
// canonicals are stored decoded (e.g. "d&d"), so the decode is a no-op
// on registered entries. Decoding the input slug supports callers that
// happen to pass URL-encoded forms; both sides are normalized before
// comparison so the match is robust to incoming encoding variations.

import { SUPERTAGS } from "../data/supertags";
import type { SupertagEntry } from "../schemas/SupertagSchema";
import { resolveTagSynonym } from "./resolveTagSynonym";

/**
 * Look up a supertag entry by slug (canonical or synonym).
 *
 * @param slug - Raw tag slug (any casing, canonical or synonym).
 * @returns The matching SupertagEntry, or null if the slug is not registered.
 */
export function getSupertag(slug: string): SupertagEntry | null {
  const canonical = resolveTagSynonym(slug);
  const decodedCanonical = decodeURIComponent(canonical.toLowerCase());
  return (
    SUPERTAGS.find(
      (entry) => decodeURIComponent(entry.canonicalTag.toLowerCase()) === decodedCanonical,
    ) ?? null
  );
}
