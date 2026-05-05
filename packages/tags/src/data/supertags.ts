// Supertag registry — frozen array of 5 curated supertag entries.
//
// Source of truth for: canonical slug, icon noun, synonyms list.
// Localized displayName and description are NOT here — they live in
// packages/tags/src/i18n/index.ts, keyed by canonicalTag.
//
// Synonyms carry forward verbatim from
// .tmp/pelilauta-17/src/schemas/TagSynonyms.ts (TAG_SYNONYMS array).
// Editable only by code change; new supertags require a code edit plus
// matching i18n entries.

import type { SupertagEntry } from "../schemas/SupertagSchema";

export const SUPERTAGS: readonly SupertagEntry[] = Object.freeze([
  {
    canonicalTag: "d%26d",
    synonyms: [
      "dnd",
      "d&d",
      "dungeons & dragons",
      "dungeons and dragons",
      "dd",
      "d and d",
      "deddu",
    ],
    icon: "d20",
  },
  {
    canonicalTag: "pathfinder",
    synonyms: ["pathfinder 2e", "pf2e", "pathfinder 1e", "pf1e", "pf", "päffä"],
    icon: "compass",
  },
  {
    canonicalTag: "legendoja %26 lohikäärmeitä",
    synonyms: [
      "legendoja ja lohikäärmeita",
      "l&l",
      "ll",
      "löllö",
      "letl",
      "lössö",
      "Suuri seikkailu",
    ],
    icon: "ll-ampersand",
  },
  {
    canonicalTag: "pbta",
    synonyms: ["powered by the apocalypse", "apocalypse world", "pbta-pelit", "FitD"],
    icon: "books",
  },
  {
    canonicalTag: "call+of+cthulhu",
    synonyms: ["coc", "cthulhu", "call of cthulu", "delta green", "dg"],
    icon: "tentacles",
  },
]);
