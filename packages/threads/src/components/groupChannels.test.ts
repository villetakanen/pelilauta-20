// groupChannels unit tests — specs/pelilauta/channels/spec.md
// Verifies: specs/pelilauta/channels/spec.md §/channels renders the directory grouped by category
// Verifies: specs/pelilauta/channels/spec.md §/channels falls back the missing-category bucket to "Pelilauta"

import { describe, expect, it } from "vitest";
import type { Channel } from "../schemas/ChannelSchema";
import { groupChannels } from "./groupChannels";

function makeChannel(overrides: Partial<Channel> = {}): Channel {
  return {
    slug: "yleinen",
    name: "Yleinen",
    description: "",
    icon: "discussion",
    threadCount: 0,
    flowTime: 0,
    ...overrides,
  };
}

describe("groupChannels", () => {
  // Scenario: /channels renders the directory grouped by category
  // Given the meta/threads document holds 5 channels across 2 distinct categories
  it("groups channels by distinct category", () => {
    const channels: Channel[] = [
      makeChannel({ slug: "yleinen", name: "Yleinen", category: "Pelilauta" }),
      makeChannel({ slug: "pelit", name: "Pelit", category: "Pelilauta" }),
      makeChannel({ slug: "scifi", name: "Sci-fi", category: "Pelilauta" }),
      makeChannel({ slug: "kirjat", name: "Kirjat", category: "Games" }),
      makeChannel({ slug: "elokuvat", name: "Elokuvat", category: "Games" }),
    ];

    const groups = groupChannels(channels);

    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.category)).toEqual(["Pelilauta", "Games"]);
    expect(groups.find((g) => g.category === "Pelilauta")?.channels).toHaveLength(3);
    expect(groups.find((g) => g.category === "Games")?.channels).toHaveLength(2);
  });

  it("buckets channels with no category under literal 'Pelilauta'", () => {
    const channels: Channel[] = [
      makeChannel({ slug: "mystery", name: "Mystery", category: undefined }),
      makeChannel({ slug: "pelit", name: "Pelit", category: "Games" }),
    ];

    const groups = groupChannels(channels);

    const pelilautaGroup = groups.find((g) => g.category === "Pelilauta");
    expect(pelilautaGroup).toBeDefined();
    expect(pelilautaGroup?.channels.map((c) => c.slug)).toContain("mystery");
  });

  it("preserves first-appearance order of categories", () => {
    const channels: Channel[] = [
      makeChannel({ slug: "a", category: "Zeta" }),
      makeChannel({ slug: "b", category: "Alpha" }),
      makeChannel({ slug: "c", category: "Zeta" }),
      makeChannel({ slug: "d", category: "Mu" }),
    ];

    const groups = groupChannels(channels);

    expect(groups.map((g) => g.category)).toEqual(["Zeta", "Alpha", "Mu"]);
  });

  it("channels within a category preserve input order", () => {
    const channels: Channel[] = [
      makeChannel({ slug: "first", name: "First", category: "Games" }),
      makeChannel({ slug: "second", name: "Second", category: "Games" }),
      makeChannel({ slug: "third", name: "Third", category: "Games" }),
    ];

    const groups = groupChannels(channels);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.channels.map((c) => c.slug)).toEqual(["first", "second", "third"]);
  });
});
