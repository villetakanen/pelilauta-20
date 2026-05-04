// PageRefSchema — embedded page-index array shape, ported verbatim from
// .tmp/pelilauta-17/src/schemas/SiteSchema.ts (PageRefSchema).
//
// Each entry in `pageRefs` carries lightweight metadata about a page in the
// site's page tree. Full page content lives in a sub-collection owned by a
// future sub-spec.

import { z } from "zod";

/**
 * Each site has a page index. This is a list of keys that point to pages with
 * some metadata about the page, to help building the different page listings
 * (such as index, last 3 changes, etc).
 *
 * BREAKING CHANGE: This replaces earlier (< 16.x.y) index metadata that was
 * stored in firestore db.
 */
export const PageRefSchema = z.object({
  key: z.string(),
  name: z.string(),
  author: z.string(),
  category: z.string().optional(),
  // Note: we save flowTime instead of updatedAt, as firestore
  // does not fully support timestamps in array fields
  flowTime: z.number(),
  order: z.number().optional(), // Manual sort position for TOC ordering
});

export type PageRef = z.infer<typeof PageRefSchema>;
