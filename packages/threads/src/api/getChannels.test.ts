// Scenario: "getChannels reads the meta/threads topics array"
// — specs/pelilauta/threads/spec.md

import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const doc = vi.fn(() => ({ get }));
const collection = vi.fn(() => ({ doc }));
const getDb = vi.fn(() => ({ collection }));

vi.mock("@pelilauta/firebase/server", () => ({ getDb }));

describe("getChannels", () => {
  beforeEach(async () => {
    vi.resetModules();
    get.mockReset();
    doc.mockClear();
    collection.mockClear();
    getDb.mockClear();
  });

  it("reads meta/threads and returns the parsed topics array", async () => {
    get.mockResolvedValue({
      data: () => ({
        topics: [
          { slug: "yleinen", name: "Yleinen" },
          { slug: "pelit", name: "Pelit", icon: "adventurer", category: "Games" },
        ],
      }),
    });

    const { getChannels } = await import("./getChannels");
    const channels = await getChannels();

    expect(collection).toHaveBeenCalledWith("meta");
    expect(doc).toHaveBeenCalledWith("threads");
    expect(channels).toHaveLength(2);
    expect(channels[0]?.icon).toBe("discussion"); // schema default
    expect(channels[0]?.category).toBeUndefined(); // v20 drops v17 'Pelilauta' default
    expect(channels[1]?.category).toBe("Games");
  });

  it("returns [] when the topics field is missing or not an array", async () => {
    get.mockResolvedValue({ data: () => ({}) });
    const { getChannels } = await import("./getChannels");
    expect(await getChannels()).toEqual([]);
  });

  it("returns [] when the doc has no data", async () => {
    get.mockResolvedValue({ data: () => undefined });
    const { getChannels } = await import("./getChannels");
    expect(await getChannels()).toEqual([]);
  });

  it("memoizes the result across repeat calls", async () => {
    get.mockResolvedValue({
      data: () => ({ topics: [{ slug: "a", name: "A" }] }),
    });
    const { getChannels } = await import("./getChannels");
    await getChannels();
    await getChannels();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("clearChannelsCache forces the next call to re-read", async () => {
    get.mockResolvedValue({
      data: () => ({ topics: [{ slug: "a", name: "A" }] }),
    });
    const { getChannels, clearChannelsCache } = await import("./getChannels");
    await getChannels();
    clearChannelsCache();
    await getChannels();
    expect(get).toHaveBeenCalledTimes(2);
  });
});
