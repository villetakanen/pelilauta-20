// Locale-strings sub-export for @pelilauta/threads.
//
// Static data only — no runtime code, no side effects. The only non-data
// import is the `NestedTranslation` type from `@pelilauta/i18n`.
// See specs/pelilauta/threads/spec.md §i18n.

import type { NestedTranslation } from "@pelilauta/i18n";

export const fi: Record<string, NestedTranslation> = {
  title: "Keskustelut",
  card: {
    inChannel: "Aiheessa ",
  },
};

export const en: Record<string, NestedTranslation> = {
  title: "Discussions",
  card: {
    inChannel: "In ",
  },
};
