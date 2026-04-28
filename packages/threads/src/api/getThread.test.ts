// Scenarios: "getThread returns a parsed Thread for an existing doc"
//            "getThread returns undefined for a missing doc"
//            "getThread propagates Firestore errors"
//            "getThread propagates Zod parse failures on malformed docs"
// — specs/pelilauta/threads/spec.md

import { beforeEach, describe, expect, it, vi } from "vitest";

// Firestore chain mock: collection().doc().get()
const getMock = vi.fn();
const docMock = vi.fn(() => ({ get: getMock }));
const collectionMock = vi.fn(() => ({ doc: docMock }));
const getDb = vi.fn(() => ({ collection: collectionMock }));

vi.mock("@pelilauta/firebase/server", () => ({ getDb }));

function makeSnapshot(id: string, data: Record<string, unknown>) {
  return {
    id,
    exists: true,
    data: () => ({
      title: "Thread",
      channel: "yleinen",
      owners: ["user1"],
      public: true,
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
      flowTime: Date.now(),
      ...data,
    }),
  };
}

describe("getThread", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const mock of [getMock, docMock, collectionMock, getDb]) {
      mock.mockClear();
    }
    // Re-wire the chain after clear
    collectionMock.mockReturnValue({ doc: docMock });
    docMock.mockReturnValue({ get: getMock });
  });

  it("returns a parsed Thread for an existing doc", async () => {
    // Legacy `topic` field exercises ThreadSchema preprocessing — channel must
    // resolve from topic when the canonical field is absent.
    getMock.mockResolvedValue(
      makeSnapshot("t1", { title: "Hello World", channel: undefined, topic: "old-channel" }),
    );

    const { getThread } = await import("./getThread");
    const thread = await getThread("t1");

    expect(collectionMock).toHaveBeenCalledWith("stream");
    expect(docMock).toHaveBeenCalledWith("t1");
    expect(thread).toBeDefined();
    expect(thread?.key).toBe("t1");
    expect(thread?.title).toBe("Hello World");
    expect(thread?.channel).toBe("old-channel");
  });

  it("returns undefined for a missing doc", async () => {
    getMock.mockResolvedValue({ exists: false, id: "missing", data: () => undefined });

    const { getThread } = await import("./getThread");
    const thread = await getThread("missing");

    expect(thread).toBeUndefined();
  });

  it("propagates Firestore errors", async () => {
    getMock.mockRejectedValue(new Error("network down"));

    const { getThread } = await import("./getThread");

    await expect(getThread("any")).rejects.toThrow("network down");
  });

  it("propagates Zod parse failures on malformed docs", async () => {
    getMock.mockResolvedValue(
      makeSnapshot("bad", {
        title: undefined,
        channel: undefined,
        owners: undefined,
      }),
    );

    const { getThread } = await import("./getThread");

    await expect(getThread("bad")).rejects.toThrow();
  });
});
