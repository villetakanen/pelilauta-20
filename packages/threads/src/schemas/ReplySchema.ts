// ReplySchema — legacy-tolerant Zod schema for thread reply documents.
// See specs/pelilauta/threads/spec.md §Reply Schema.

import { ContentEntrySchema, ImageArraySchema, toDate } from "@pelilauta/models";
import { z } from "zod";

export const REPLIES_COLLECTION = "comments";

// See ThreadSchema.ts for the full rationale — same v17 parity rules.
const normalizeRawReply = (raw: unknown): unknown => {
  if (!raw || typeof raw !== "object") return raw;
  const data = { ...(raw as Record<string, unknown>) };

  if (
    Array.isArray(data.images) &&
    data.images.length > 0 &&
    data.images.every((entry): entry is string => typeof entry === "string")
  ) {
    data.images = data.images.map((url) => ({ url, alt: `Image [${url}]` }));
  }

  // Force author to owners[0] unconditionally (v17 parity)
  if (Array.isArray(data.owners) && data.owners.length > 0) {
    data.author = data.owners[0];
  }

  data.createdAt = toDate(data.createdAt);
  data.updatedAt = toDate(data.updatedAt);
  data.flowTime = toDate(data.flowTime).getTime();

  return data;
};

export const ReplySchema = z.preprocess(
  normalizeRawReply,
  ContentEntrySchema.extend({
    threadKey: z.string(),
    images: ImageArraySchema.optional(),
    // NOTE: lowercase is the v17 storage name and must not be renamed
    // (feedback_no_breaking_data_contracts). Thread's equivalent field
    // is camelCase `quoteRef` — the inconsistency is inherited from v17.
    quoteref: z.string().optional(),
    owners: z.array(z.string()).min(1, "Reply must have at least one owner"),
  }),
);

export type Reply = z.infer<typeof ReplySchema>;
