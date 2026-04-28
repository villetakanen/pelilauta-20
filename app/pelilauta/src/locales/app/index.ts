// Host-owned (`app` namespace) locale strings.
// Add strings here as host-level surfaces (layouts, error pages, generic UI) need them.
// Feature verticals own their strings in their own packages — see specs/pelilauta/i18n/spec.md.

import type { NestedTranslation } from "@pelilauta/i18n";

export const fi: NestedTranslation = {
  action: {
    showMore: "Näytä lisää",
  },
  error: {
    fetch: "Lataaminen epäonnistui",
    notFound: "Sivua ei löytynyt",
  },
};

export const en: NestedTranslation = {
  action: {
    showMore: "Show more",
  },
  error: {
    fetch: "Failed to load",
    notFound: "Page not found",
  },
};
