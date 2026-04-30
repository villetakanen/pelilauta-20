// groupChannels — pure helper for the ChannelsList component.
//
// Groups a flat channel array into ordered category buckets. Channels with no
// category field fall under the literal "Pelilauta" bucket — NOT an i18n key.
// Category order preserves first-appearance in the input array (insertion order
// of Map keys in modern JS is guaranteed).
//
// See specs/pelilauta/channels/spec.md §Architecture §Constraints.

import type { Channel } from "../schemas/ChannelSchema";

export interface ChannelGroup {
  category: string;
  channels: Channel[];
}

const FALLBACK_CATEGORY = "Pelilauta";

export function groupChannels(channels: Channel[]): ChannelGroup[] {
  const map = new Map<string, Channel[]>();

  for (const channel of channels) {
    const category = channel.category || FALLBACK_CATEGORY;
    const existing = map.get(category);
    if (existing) {
      existing.push(channel);
    } else {
      map.set(category, [channel]);
    }
  }

  return Array.from(map.entries()).map(([category, channels]) => ({
    category,
    channels,
  }));
}
