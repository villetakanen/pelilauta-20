// TagSchema — v17 Firestore tag-index document shape, preserved verbatim.
//
// Each doc in tags/{key} represents a single tagged entry (a thread or a
// page within a site). The collection is queryable by
// where('tags', 'array-contains', X).
//
// v20 delta: none. Field shape carries forward from
// .tmp/pelilauta-17/src/schemas/TagSchema.ts unchanged.
//
// MVP ships no Firestore reader for this collection. The schema travels
// with the package so future readers can parse without reintroducing the type.

import { z } from "zod";

export const TAG_FIRESTORE_COLLECTION = "tags";

export const TagSchema = z.object({
  title: z.string(),
  type: z.enum(["thread", "page"]),
  key: z.string(),
  tags: z.array(z.string()),
  author: z.string(),
  flowTime: z.number().int().positive(),
});

export type Tag = z.infer<typeof TagSchema>;
