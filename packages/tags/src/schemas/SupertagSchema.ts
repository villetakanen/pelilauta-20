// SupertagSchema — registry-entry shape for curated supertags.
//
// Renamed from v17's TagSynonymSchema. v20 delta: displayName and description
// are removed from the schema — they live in the i18n surface
// (packages/tags/src/i18n/index.ts), not in the registry data file.
//
// Fields:
//   canonicalTag — canonical slug (decoded form, e.g. "d&d")
//   synonyms     — alternative slugs (lowercase, multi-lingual)
//   icon         — cn-icon noun

import { z } from "zod";

export const SupertagSchema = z.object({
  canonicalTag: z.string(),
  synonyms: z.array(z.string()),
  icon: z.string(),
});

export type SupertagEntry = z.infer<typeof SupertagSchema>;
