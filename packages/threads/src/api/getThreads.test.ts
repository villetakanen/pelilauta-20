// Scenarios: "getThreads returns paginated public threads"
//            "getThreads honours an order override"
// — specs/pelilauta/threads/spec.md

import { beforeEach, describe, expect, it, vi } from "vitest";

// Firestore chain mock: collection().where().orderBy().limit().get()
const getMock = vi.fn();
const limitMock = vi.fn(() => ({ get: getMock }));
const orderByMock = vi.fn(() => ({ limit: limitMock }));
const whereMock = vi.fn(() => ({ orderBy: orderByMock }));
const collectionMock = vi.fn(() => ({ where: whereMock }));
const getDb = vi.fn(() => ({ collection: collectionMock }));

vi.mock("@pelilauta/firebase/server", () => ({ getDb }));

function makeDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
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

describe("getThreads", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const mock of [getMock, limitMock, orderByMock, whereMock, collectionMock, getDb]) {
      mock.mockClear();
    }
    // Re-wire the chain after clear
    collectionMock.mockReturnValue({ where: whereMock });
    whereMock.mockReturnValue({ orderBy: orderByMock });
    orderByMock.mockReturnValue({ limit: limitMock });
    limitMock.mockReturnValue({ get: getMock });
  });

  it("queries stream collection with public=true and flowTime desc by default", async () => {
    getMock.mockResolvedValue({ docs: [makeDoc("t1", {}), makeDoc("t2", {})] });

    const { getThreads } = await import("./getThreads");
    const threads = await getThreads(10);

    expect(collectionMock).toHaveBeenCalledWith("stream");
    expect(whereMock).toHaveBeenCalledWith("public", "==", true);
    expect(orderByMock).toHaveBeenCalledWith("flowTime", "desc");
    expect(limitMock).toHaveBeenCalledWith(10);
    expect(threads).toHaveLength(2);
    expect(threads[0]?.key).toBe("t1");
  });

  it("honours order override to createdAt", async () => {
    getMock.mockResolvedValue({ docs: [makeDoc("t1", {})] });

    const { getThreads } = await import("./getThreads");
    await getThreads(5, { order: "createdAt" });

    expect(orderByMock).toHaveBeenCalledWith("createdAt", "desc");
  });

  it("passes public=false when requested", async () => {
    getMock.mockResolvedValue({ docs: [] });

    const { getThreads } = await import("./getThreads");
    await getThreads(5, { public: false });

    expect(whereMock).toHaveBeenCalledWith("public", "==", false);
  });

  it("returns an empty array when no documents match", async () => {
    getMock.mockResolvedValue({ docs: [] });

    const { getThreads } = await import("./getThreads");
    const threads = await getThreads(10);

    expect(threads).toEqual([]);
  });

  it("assigns doc.id as the thread key", async () => {
    getMock.mockResolvedValue({ docs: [makeDoc("my-thread-key", {})] });

    const { getThreads } = await import("./getThreads");
    const threads = await getThreads(1);

    expect(threads[0]?.key).toBe("my-thread-key");
  });

  it("parses legacy data through ThreadSchema normalization", async () => {
    getMock.mockResolvedValue({
      docs: [
        makeDoc("legacy", {
          images: ["https://example.com/a.jpg"],
          topic: "old-channel",
          channel: undefined,
          owners: ["u1"],
        }),
      ],
    });

    const { getThreads } = await import("./getThreads");
    const threads = await getThreads(1);

    // Legacy string images → [{url, alt}]
    expect(threads[0]?.images?.[0]).toEqual({
      url: "https://example.com/a.jpg",
      alt: "Image [https://example.com/a.jpg]",
    });
    // Legacy topic → channel
    expect(threads[0]?.channel).toBe("old-channel");
    // Author derived from owners[0]
    expect(threads[0]?.author).toBe("u1");
  });
});
