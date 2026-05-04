// Locale-strings sub-export for @pelilauta/threads.
//
// Static data only — no runtime code, no side effects. The only non-data
// import is the `NestedTranslation` type from `@pelilauta/i18n`.
// See specs/pelilauta/threads/spec.md §i18n.

import type { NestedTranslation } from "@pelilauta/i18n";

export const fi: Record<string, NestedTranslation> = {
  title: "Keskustelut",
  thread: {
    inChannel: "Aiheessa {topic}",
    replyCount: "{count} vastausta",
  },
  channel: {
    threadCount: "{count} ketjua",
  },
};

export const en: Record<string, NestedTranslation> = {
  title: "Discussions",
  thread: {
    inChannel: "In {topic}",
    replyCount: "{count} replies",
  },
  channel: {
    threadCount: "{count} threads",
  },
};

// SEO strings for the channels directory — owned by the threads package
// per specs/pelilauta/channels/spec.md §Decisions Decision 2.
// Registered under the `seo:` namespace in the host i18n composition.
export const seoFi: Record<string, NestedTranslation> = {
  channels: {
    title: "Keskustelukanavat — Pelilauta",
    description:
      "Selaa Pelilaudan keskustelukanavia. Löydä roolipeleihin, peleihin ja muihin aiheisiin liittyvät kanavat.",
  },
};

export const seoEn: Record<string, NestedTranslation> = {
  channels: {
    title: "Discussion Channels — Pelilauta",
    description:
      "Browse Pelilauta's discussion channels. Find channels for role-playing games, games, and more.",
  },
};
