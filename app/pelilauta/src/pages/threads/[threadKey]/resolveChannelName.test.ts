// Verifies: specs/pelilauta/threads/detail-page/sidebar-metadata.md §Channel display name falls back to slug when not in directory

import { describe, expect, it } from "vitest";
import { resolveChannelName } from "./resolveChannelName";

describe("resolveChannelName", () => {
  it("returns the display name when the channel slug is found in the directory", () => {
    // Verifies: specs/pelilauta/threads/detail-page/sidebar-metadata.md §Channel display name falls back to slug when not in directory
    const channels = [
      { slug: "yleinen", name: "Yleinen" },
      { slug: "roolipelit", name: "Roolipelit" },
    ];
    expect(resolveChannelName("yleinen", channels)).toBe("Yleinen");
  });

  it("returns the slug itself when the channel is not found in the directory", () => {
    // Verifies: specs/pelilauta/threads/detail-page/sidebar-metadata.md §Channel display name falls back to slug when not in directory
    const channels = [{ slug: "yleinen", name: "Yleinen" }];
    expect(resolveChannelName("unknown-channel", channels)).toBe("unknown-channel");
  });

  it("returns the slug when the channel directory is empty", () => {
    // Verifies: specs/pelilauta/threads/detail-page/sidebar-metadata.md §Channel display name falls back to slug when not in directory
    expect(resolveChannelName("some-channel", [])).toBe("some-channel");
  });
});
