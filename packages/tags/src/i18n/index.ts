// Locale-strings sub-export for @pelilauta/tags.
//
// Static data only — no runtime code, no side effects. The only non-data
// import is the `NestedTranslation` type from `@pelilauta/i18n`.
// See specs/pelilauta/tags/i18n/spec.md §Supertag entries.
//
// Key structure: supertag.{canonicalTag}.displayName / .description
// The {canonicalTag} segment is verbatim from the registry, including
// URL-encoded characters (e.g. "d%26d", "legendoja %26 lohikäärmeitä").
//
// EN descriptions are deferred at MVP — the en tree ships displayName only.

import type { NestedTranslation } from "@pelilauta/i18n";

export const fi: Record<string, NestedTranslation> = {
  supertag: {
    "d%26d": {
      displayName: "D&D",
      description: "Dungeons & Dragons keskustelut, kampanjat ja materiaalit",
    },
    pathfinder: {
      displayName: "Pathfinder",
      description: "Pathfinder-roolipeli, säännöt, hahmot ja seikkailut",
    },
    "legendoja %26 lohikäärmeitä": {
      displayName: "Legendoja & lohikäärmeitä",
      description: "Legendoja ja Lohikäärmeitä -roolipeliin liittyvät keskustelut ja sivut.",
    },
    pbta: {
      displayName: "PbtA",
      description: "Powered by the Apocalypse -järjestelmän pelit ja keskustelut",
    },
    "call+of+cthulhu": {
      displayName: "Call of Cthulhu",
      description: "Call of Cthulhu ja muut sen sukulaiset",
    },
  },
};

export const en: Record<string, NestedTranslation> = {
  supertag: {
    "d%26d": {
      displayName: "D&D",
    },
    pathfinder: {
      displayName: "Pathfinder",
    },
    "legendoja %26 lohikäärmeitä": {
      displayName: "Legendoja & lohikäärmeitä",
    },
    pbta: {
      displayName: "PbtA",
    },
    "call+of+cthulhu": {
      displayName: "Call of Cthulhu",
    },
  },
};
