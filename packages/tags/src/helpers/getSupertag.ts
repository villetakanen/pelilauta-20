// getSupertag — pure registry lookup helper.
//
// Renamed from v17's getTagDisplayInfo. Returns the SupertagEntry for a
// given slug (canonical or any synonym), or null if the slug is not
// registered. Plain-tag fallback is the consumer's responsibility.
//
// Carries forward v17's decodeURIComponent behavior for matching —
// the canonical slugs in the registry use URL-encoding (e.g. "d%26d"),
// and comparison decodes both sides before comparing.

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
