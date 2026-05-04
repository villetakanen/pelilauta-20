// systemToNoun — maps a Site `system` value to a cyan icon noun.
//
// Ported from .tmp/pelilauta-17/src/utils/schemaHelpers.ts:39-44.
// Falls back to "homebrew" for unknown systems and logs a warn.
//
// See specs/pelilauta/sites/spec.md §Accessor Surfaces.

import { logWarn } from "@pelilauta/utils/log";
import { systemToNounMapping } from "../schemas/nouns";

export function systemToNoun(system: string | undefined): string {
  if (system && system in systemToNounMapping) {
    return systemToNounMapping[system];
  }
  logWarn("systemToNoun", `missing mapping for "${system}", falling back to "homebrew"`);
  return "homebrew";
}
