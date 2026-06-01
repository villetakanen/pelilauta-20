// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §getReplies returns parsed replies in stable order
// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §getReplies returns parsed replies in stable order
// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §getReplies returns parsed replies in stable order
// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §getReplies returns parsed replies in stable order
// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §getReplies surfaces errors to the caller
// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §getReplies surfaces errors to the caller

import { beforeEach, describe, expect, it, vi } from "vitest";

// Firestore chain mock: collection().doc().collection().get()
const getMock = vi.fn();
const repliesCollectionMock = vi.fn(() => ({ get: getMock }));
const docMock = vi.fn(() => ({ collection: repliesCollectionMock }));
const collectionMock = vi.fn(() => ({ doc: docMock }));
const getDb = vi.fn(() => ({ collection: collectionMock }));

vi.mock("@pelilauta/firebase/server", () => ({ getDb }));

function makeReplyDoc(
  id: string,
  data: Record<string, unknown>,
): { id: string; data: () => Record<string, unknown> } {
  return {
    id,
    data: () => ({
      owners: ["user1"],
      author: "user1",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
      flowTime: 1000,
      ...data,
    }),
  };
}

describe("getReplies", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const mock of [getMock, repliesCollectionMock, docMock, collectionMock, getDb]) {
      mock.mockClear();
    }
    // Re-wire the chain after clear
    collectionMock.mockReturnValue({ doc: docMock });
    docMock.mockReturnValue({ collection: repliesCollectionMock });
    repliesCollectionMock.mockReturnValue({ get: getMock });
  });

  it("returns [] for an empty threadKey without issuing a Firestore read", async () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §getReplies returns parsed replies in stable order
    const { getReplies } = await import("./getReplies");
    const result = await getReplies("");

    expect(result).toEqual([]);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("returns parsed replies sorted by flowTime ascending", async () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §getReplies returns parsed replies in stable order
    getMock.mockResolvedValue({
      docs: [
        makeReplyDoc("r3", { flowTime: 300 }),
        makeReplyDoc("r1", { flowTime: 100 }),
        makeReplyDoc("r2", { flowTime: 200 }),
      ],
    });

    const { getReplies } = await import("./getReplies");
    const replies = await getReplies("thread1");

    expect(collectionMock).toHaveBeenCalledWith("stream");
    expect(docMock).toHaveBeenCalledWith("thread1");
    expect(repliesCollectionMock).toHaveBeenCalledWith("comments");
    expect(replies).toHaveLength(3);
    expect(replies[0]?.flowTime).toBe(100);
    expect(replies[1]?.flowTime).toBe(200);
    expect(replies[2]?.flowTime).toBe(300);
    // Each reply.key matches the source doc.id and threadKey is set
    expect(replies[0]?.key).toBe("r1");
    expect(replies[0]?.threadKey).toBe("thread1");
  });

  it("returns Date-typed timestamps from Firestore Timestamps", async () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §getReplies returns parsed replies in stable order
    // Simulate Firestore Timestamp instances (objects with toDate/toMillis methods)
    const firestoreTimestamp = (ms: number) => ({
      toDate: () => new Date(ms),
      toMillis: () => ms,
      seconds: Math.floor(ms / 1000),
      nanoseconds: 0,
    });

    getMock.mockResolvedValue({
      docs: [
        makeReplyDoc("r1", {
          createdAt: firestoreTimestamp(Date.parse("2026-01-01T00:00:00Z")),
          updatedAt: firestoreTimestamp(Date.parse("2026-01-02T00:00:00Z")),
          flowTime: firestoreTimestamp(1000),
        }),
      ],
    });

    const { getReplies } = await import("./getReplies");
    const replies = await getReplies("thread1");

    expect(replies).toHaveLength(1);
    expect(replies[0]?.createdAt).toBeInstanceOf(Date);
    expect(replies[0]?.updatedAt).toBeInstanceOf(Date);
    expect(typeof replies[0]?.flowTime).toBe("number");
  });

  it("tie-breaks equal flowTimes by createdAt ascending", async () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §getReplies returns parsed replies in stable order
    getMock.mockResolvedValue({
      docs: [
        makeReplyDoc("r2", {
          flowTime: 200,
          createdAt: new Date("2026-01-02T00:00:00Z"),
        }),
        makeReplyDoc("r1", {
          flowTime: 200,
          createdAt: new Date("2026-01-01T00:00:00Z"),
        }),
      ],
    });

    const { getReplies } = await import("./getReplies");
    const replies = await getReplies("thread1");

    expect(replies).toHaveLength(2);
    // Earlier createdAt comes first
    expect(replies[0]?.key).toBe("r1");
    expect(replies[1]?.key).toBe("r2");
  });

  it("propagates Firestore errors", async () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §getReplies surfaces errors to the caller
    getMock.mockRejectedValue(new Error("permission-denied"));

    const { getReplies } = await import("./getReplies");

    await expect(getReplies("thread1")).rejects.toThrow("permission-denied");
  });

  it("propagates Zod parse failures on a malformed doc", async () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §getReplies surfaces errors to the caller
    getMock.mockResolvedValue({
      docs: [
        makeReplyDoc("bad", {
          // Missing required `owners` field — violates ReplySchema
          owners: undefined,
        }),
      ],
    });

    const { getReplies } = await import("./getReplies");

    await expect(getReplies("thread1")).rejects.toThrow();
  });
});
