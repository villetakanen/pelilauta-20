// Host-owned (`app` namespace) locale strings.
// Add strings here as host-level surfaces (layouts, error pages, generic UI) need them.
// Feature verticals own their strings in their own packages — see specs/pelilauta/i18n/spec.md.

import type { NestedTranslation } from "@pelilauta/i18n";

export const fi: NestedTranslation = {
  action: {
    showMore: "Näytä lisää",
  },
  tag: {
    synonymsLabel: "Synonyymit ({count}):",
  },
  featuredTags: {
    title: "Tunnisteet",
  },
  footer: {
    feed: {
      title: "Syotteet",
    },
    links: {
      title: "Roolipelit verkossa",
    },
    product: {
      name: "Pelilauta 20",
      title: "Pelilauta",
    },
  },
  error: {
    fetch: "Lataaminen epäonnistui",
    notFound: "Sivua ei löytynyt",
  },
  syndicate: {
    heading: "Yhteisön blogit",
  },
};

export const en: NestedTranslation = {
  action: {
    showMore: "Show more",
  },
  tag: {
    synonymsLabel: "Synonyms ({count}):",
  },
  featuredTags: {
    title: "Tags",
  },
  footer: {
    feed: {
      title: "Feeds",
    },
    links: {
      title: "RPG online",
    },
    product: {
      name: "Pelilauta 20",
      title: "Pelilauta",
    },
  },
  error: {
    fetch: "Failed to load",
    notFound: "Page not found",
  },
  syndicate: {
    heading: "Community blogs",
  },
};
