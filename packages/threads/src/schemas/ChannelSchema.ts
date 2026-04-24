// ChannelSchema — Zod schema for the channel directory stored as the `topics`
// array on the `meta/threads` document.
//
// Ported from v17 with one deliberate behavior change: `category` is NOT
// coalesced to a default. Other coalescings (description, icon, flowTime) are
// preserved and moved onto the schema via .default(...) so call sites use
// ChannelSchema.parse(raw) with no wrapper.
// See specs/pelilauta/threads/spec.md §Channel Schema.

import { z } from "zod";

export const CHANNELS_META_REF = "meta/threads";
export const CHANNEL_DEFAULT_SLUG = "yleinen";
export const CHANNEL_DEFAULT_ICON = "discussion";

// Inline latestThread / latestReply snapshot shape. If a second consumer
// appears, lift this out into @pelilauta/models as EntryMetadataSchema.
const ChannelSnapshotSchema = z.object({
  key: z.string().default(""),
  createTime: z.number().default(0),
  author: z.string().default("-"),
});

// v17 parity preprocess: parseChannel used `||` coalescing, which treats all
// falsy inputs (undefined, null, "", 0) as absent. Zod's `.default(...)` only
// catches `undefined`, so we need an explicit preprocess to match. See spec
// §Constraints "Parse-behavior parity with v17's parseX() wrappers."
const normalizeRawChannel = (raw: unknown): unknown => {
  if (!raw || typeof raw !== "object") return raw;
  const data = { ...(raw as Record<string, unknown>) };

  // v17: description = c.description || ''
  if (!data.description || typeof data.description !== "string") {
    data.description = "";
  }
  // v17: icon = c.icon || 'discussion'
  if (!data.icon || typeof data.icon !== "string") {
    data.icon = CHANNEL_DEFAULT_ICON;
  }
  // v17: flowTime = c.flowTime || 0
  if (!data.flowTime || typeof data.flowTime !== "number") {
    data.flowTime = 0;
  }
  // threadCount: v17 used z.number().default(0) — keep .default() on the
  // schema for this one; v17 did not falsy-coalesce it.

  // Explicit category default removal remains deliberate — leave as-is.
  return data;
};

export const ChannelSchema = z.preprocess(
  normalizeRawChannel,
  z.object({
    slug: z.string(),
    name: z.string(),
    description: z.string(),
    icon: z.string(),
    threadCount: z.number().default(0),
    category: z.string().optional(),
    flowTime: z.number(),
    latestThread: ChannelSnapshotSchema.optional(),
    latestReply: ChannelSnapshotSchema.optional(),
  }),
);

export const ChannelsSchema = z.array(ChannelSchema);

export type Channel = z.infer<typeof ChannelSchema>;
export type Channels = z.infer<typeof ChannelsSchema>;
