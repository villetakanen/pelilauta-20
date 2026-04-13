// Scenario: "ChannelSchema does not default category"
// — specs/pelilauta/threads/spec.md

import { describe, expect, it } from "vitest";
import {
  CHANNEL_DEFAULT_ICON,
  CHANNEL_DEFAULT_SLUG,
  CHANNELS_META_REF,
  ChannelSchema,
  ChannelsSchema,
} from "./ChannelSchema";

describe("ChannelSchema.parse", () => {
  it("leaves category undefined when missing (v20 drops v17's 'Pelilauta' default)", () => {
    const channel = ChannelSchema.parse({ slug: "yleinen", name: "Yleinen" });
    expect(channel.category).toBeUndefined();
  });

  it("preserves other v17 defaults when fields are missing", () => {
    const channel = ChannelSchema.parse({ slug: "yleinen", name: "Yleinen" });
    expect(channel.description).toBe("");
    expect(channel.icon).toBe(CHANNEL_DEFAULT_ICON);
    expect(channel.flowTime).toBe(0);
    expect(channel.threadCount).toBe(0);
  });

  it("requires slug and name", () => {
    expect(() => ChannelSchema.parse({ name: "no-slug" })).toThrow();
    expect(() => ChannelSchema.parse({ slug: "no-name" })).toThrow();
  });

  it("parses optional latestThread / latestReply snapshots with their own defaults", () => {
    const channel = ChannelSchema.parse({
      slug: "s",
      name: "n",
      latestThread: { key: "t1" },
    });
    expect(channel.latestThread).toEqual({ key: "t1", createTime: 0, author: "-" });
  });

  it("retains an explicit category when supplied", () => {
    const channel = ChannelSchema.parse({ slug: "s", name: "n", category: "Games" });
    expect(channel.category).toBe("Games");
  });

  it("coalesces empty-string icon/description to v17 defaults (v17 `||` parity)", () => {
    // v17 parseChannel: icon = c.icon || 'discussion'. Zod's .default() would
    // leave "" as-is; v17 coalesced it.
    const channel = ChannelSchema.parse({
      slug: "s",
      name: "n",
      icon: "",
      description: "",
    });
    expect(channel.icon).toBe(CHANNEL_DEFAULT_ICON);
    expect(channel.description).toBe("");
  });

  it("coalesces null icon/description to v17 defaults (v17 `||` parity)", () => {
    const channel = ChannelSchema.parse({
      slug: "s",
      name: "n",
      icon: null,
      description: null,
    });
    expect(channel.icon).toBe(CHANNEL_DEFAULT_ICON);
    expect(channel.description).toBe("");
  });
});

describe("ChannelsSchema.parse", () => {
  it("parses an array of channel objects", () => {
    const channels = ChannelsSchema.parse([
      { slug: "a", name: "A" },
      { slug: "b", name: "B", icon: "adventurer" },
    ]);
    expect(channels).toHaveLength(2);
    expect(channels[1]?.icon).toBe("adventurer");
  });
});

describe("channel constants", () => {
  it("exposes the meta reference and sentinel values", () => {
    expect(CHANNELS_META_REF).toBe("meta/threads");
    expect(CHANNEL_DEFAULT_SLUG).toBe("yleinen");
    expect(CHANNEL_DEFAULT_ICON).toBe("discussion");
  });
});
