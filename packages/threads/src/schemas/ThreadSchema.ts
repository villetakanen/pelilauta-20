// ThreadSchema — legacy-tolerant Zod schema for discussion thread documents.
//
// Ports v17's parseThread() coalescings directly onto the schema via
// z.preprocess / .transform / .default so call sites use ThreadSchema.parse(raw)
// with no wrapper. See specs/pelilauta/threads/spec.md §Thread Schema.
//
// Storage shape is preserved verbatim from pelilauta-17
// (feedback_no_breaking_data_contracts memory).

import { ContentEntrySchema, ImageArraySchema, toDate } from "@pelilauta/models";
import { z } from "zod";

export const THREADS_COLLECTION_NAME = "stream";

// Pre-parse normalization — ports v17's parseThread() coalescings verbatim
// (see spec §Constraints "Parse-behavior parity with v17's parseX() wrappers"):
//
//   - Legacy string-url images → [{url, alt}] objects
//   - Legacy `topic` field aliased to `channel`
//   - Missing `title` / `channel` coalesced to "" (matches v17's `|| ''`)
//   - `author` unconditionally forced to owners[0] when owners non-empty
//   - createdAt/updatedAt unconditionally coerced through toDate() — missing
//     dates resolve to new Date(0), matching v17 behavior for consumers that
//     don't null-check the field
//   - flowTime unconditionally coerced through toDate().getTime() — missing
//     becomes 0, matching v17
const normalizeRawThread = (raw: unknown): unknown => {
  if (!raw || typeof raw !== "object") return raw;
  const data = { ...(raw as Record<string, unknown>) };

  // Legacy string-array images → [{url, alt}] objects. Only triggers on
  // homogeneously-string arrays; mixed arrays fall through to Zod validation.
  if (
    Array.isArray(data.images) &&
    data.images.length > 0 &&
    data.images.every((entry): entry is string => typeof entry === "string")
  ) {
    data.images = data.images.map((url) => ({ url, alt: `Image [${url}]` }));
  }

  // Legacy `topic` field is v17's earlier name for `channel`
  if (!data.channel && typeof data.topic === "string") {
    data.channel = data.topic;
  }

  // Missing-required-field fallbacks (v17 `|| ''` semantics — coalesces all
  // falsy inputs including null, undefined, "", 0)
  data.title ||= "";
  data.channel ||= "";

  // Force author to owners[0] when owners has entries — v17's explicit
  // "Forcing the author to be the first owner" invariant, unconditional.
  if (Array.isArray(data.owners) && data.owners.length > 0) {
    data.author = data.owners[0];
  }

  // Unconditional timestamp coercion (v17 parity). toDate() handles Firestore
  // Timestamp / number / string / Date / null / undefined with a new Date(0)
  // fallback, so missing fields resolve to epoch-0 rather than undefined.
  data.createdAt = toDate(data.createdAt);
  data.updatedAt = toDate(data.updatedAt);
  data.flowTime = toDate(data.flowTime).getTime();

  return data;
};

export const ThreadSchema = z.preprocess(
  normalizeRawThread,
  ContentEntrySchema.extend({
    title: z.string(),
    channel: z.string(),
    siteKey: z.string().optional(),
    youtubeId: z.string().optional(),
    poster: z.string().optional(),
    images: ImageArraySchema.optional(),
    replyCount: z.number().optional(),
    lovedCount: z.number().optional(),
    quoteRef: z.string().optional(),
    labels: z.array(z.string()).optional(),

    // Bluesky syndication tracking
    blueskyPostUrl: z.string().url().optional(),
    blueskyPostUri: z.string().optional(),
    blueskyPostCreatedAt: z.coerce.date().optional(),

    // Override: at least one owner required for authorization
    owners: z.array(z.string()).min(1, "Please add at least one thread owner."),
  }),
);

export type Thread = z.infer<typeof ThreadSchema>;

// Factory — returns a populated blank Thread. Not a parser; does not touch
// Firestore. Used by write-path APIs and form initialization.
export function createThread(source?: Partial<Thread>, threadKey?: string): Thread {
  const owners = source?.owners && source.owners.length > 0 ? source.owners : ["-"];
  const now = new Date();

  return {
    key: threadKey || source?.key || "",
    locale: source?.locale ?? "fi",
    title: source?.title ?? "",
    channel: source?.channel ?? "",
    siteKey: source?.siteKey,
    youtubeId: source?.youtubeId,
    poster: source?.poster,
    images: source?.images ?? [],
    owners,
    author: owners[0],
    replyCount: source?.replyCount ?? 0,
    lovedCount: source?.lovedCount ?? 0,
    createdAt: source?.createdAt ?? now,
    updatedAt: source?.updatedAt ?? now,
    flowTime: source?.flowTime ?? Date.now(),
    markdownContent: source?.markdownContent ?? "",
    quoteRef: source?.quoteRef,
    public: source?.public ?? true,
    tags: source?.tags,
    labels: source?.labels,
  };
}
