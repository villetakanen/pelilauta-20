// Locale-strings sub-export for @pelilauta/sites.
//
// Static data only — no runtime code, no side effects. The only non-data
// import is the `NestedTranslation` type from `@pelilauta/i18n`.
// See specs/pelilauta/sites/spec.md §i18n.

import type { NestedTranslation } from "@pelilauta/i18n";

export const fi: Record<string, NestedTranslation> = {
  title: "Sivustot",
};

export const en: Record<string, NestedTranslation> = {
  title: "Sites",
};
