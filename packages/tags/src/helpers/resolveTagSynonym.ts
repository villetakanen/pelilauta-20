// resolveTagSynonym — pure synonym-to-canonical-slug resolver.
//
// The synonym map is built ONCE at module load (top-level const), not on
// every call. This is the v20 improvement over v18's per-call buildSynonymMap().
// Observable behavior is identical; per-call cost is reduced to a single
// Map.get() lookup.
//
// Returns the canonical slug for any known synonym (case-insensitive),
// or the lowercased input for unknown slugs. No async work, no I/O,
// no side effects.

import { SUPERTAGS } from "../data/supertags";

// Build the synonym map once at module load.
const SYNONYM_MAP: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const entry of SUPERTAGS) {
    // Canonical tag maps to itself.
    map.set(entry.canonicalTag.toLowerCase(), entry.canonicalTag);
    // Each synonym maps to the canonical tag.
    for (const synonym of entry.synonyms) {
      map.set(synonym.toLowerCase(), entry.canonicalTag);
    }
  }
  return map;
})();

/**
 * Resolve a tag slug to its canonical form.
 *
 * @param input - Raw tag slug (any casing).
 * @returns Canonical slug if the input is a known synonym; lowercased input otherwise.
 */
export function resolveTagSynonym(input: string): string {
  const normalized = input.toLowerCase();
  return SYNONYM_MAP.get(normalized) ?? normalized;
}
