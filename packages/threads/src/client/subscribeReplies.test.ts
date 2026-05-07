// Verifies: specs/pelilauta/threads/replies/spec.md §subscribeReplies emits a docChanges diff on each snapshot
// Verifies: specs/pelilauta/threads/replies/spec.md §subscribeReplies drops and logs a per-doc parse failure

import { beforeEach, describe, expect, it, vi } from "vitest";

// --- firebase/firestore mock ---
// Captures the query+collection+orderBy call chain and the onSnapshot callback.
const onSnapshotMock = vi.fn();
const queryMock = vi.fn((...args) => ({ _queryArgs: args }));
const collectionMock = vi.fn((...args) => ({ _collArgs: args }));
const orderByMock = vi.fn((...args) => ({ _orderByArgs: args }));

vi.mock("firebase/firestore", () => ({
  collection: collectionMock,
  onSnapshot: onSnapshotMock,
  orderBy: orderByMock,
  query: queryMock,
}));

// --- @pelilauta/firebase/client mock ---
const getDbMock = vi.fn(() => ({ _db: true }));
vi.mock("@pelilauta/firebase/client", () => ({ getDb: getDbMock }));

// --- @pelilauta/utils/log mock ---
const logErrorMock = vi.fn();
vi.mock("@pelilauta/utils/log", () => ({ logError: logErrorMock }));

// --- helpers ---
function makeDocChange(
  type: "added" | "modified" | "removed",
  id: string,
  data: Record<string, unknown>,
) {
  return {
    type,
    doc: {
      id,
      data: () => ({
        owners: ["user1"],
        author: "user1",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
        flowTime: 1000,
        ...data,
      }),
    },
  };
}

function makeMalformedDocChange(id: string) {
  return {
    type: "added" as const,
    doc: {
      id,
      // Missing required owners field — will fail ReplySchema
      data: () => ({
        owners: [],
        author: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        flowTime: 100,
      }),
    },
  };
}

describe("subscribeReplies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: onSnapshot returns a noop unsubscribe
    onSnapshotMock.mockReturnValue(() => {});
  });

  it("calls query/collection/orderBy with the correct stream/{threadKey}/comments path and createdAt asc", async () => {
    // Verifies: specs/pelilauta/threads/replies/spec.md §subscribeReplies emits a docChanges diff on each snapshot
    const { subscribeReplies } = await import("./subscribeReplies");
    subscribeReplies("thread1", vi.fn());

    expect(collectionMock).toHaveBeenCalledWith({ _db: true }, "stream", "thread1", "comments");
    expect(orderByMock).toHaveBeenCalledWith("createdAt", "asc");
    expect(queryMock).toHaveBeenCalled();
    expect(onSnapshotMock).toHaveBeenCalled();
  });

  it("emits a diff with added, modified, and removed arrays derived from docChanges()", async () => {
    // Verifies: specs/pelilauta/threads/replies/spec.md §subscribeReplies emits a docChanges diff on each snapshot
    let capturedCallback: ((snap: unknown) => void) | undefined;
    onSnapshotMock.mockImplementation((_q, cb) => {
      capturedCallback = cb;
      return () => {};
    });

    const { subscribeReplies } = await import("./subscribeReplies");
    const onChangeMock = vi.fn();
    subscribeReplies("thread1", onChangeMock);

    // Simulate a snapshot with added C, modified B', removed A
    const snapshot = {
      docChanges: () => [
        makeDocChange("added", "c", { flowTime: 300 }),
        makeDocChange("modified", "b", { flowTime: 200 }),
        { type: "removed", doc: { id: "a", data: () => ({}) } },
      ],
    };
    capturedCallback?.(snapshot);

    expect(onChangeMock).toHaveBeenCalledOnce();
    const diff = onChangeMock.mock.calls[0][0];
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].key).toBe("c");
    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].key).toBe("b");
    expect(diff.removed).toEqual(["a"]);
  });

  it("emits Reply objects with threadKey set correctly", async () => {
    // Verifies: specs/pelilauta/threads/replies/spec.md §subscribeReplies emits a docChanges diff on each snapshot
    let capturedCallback: ((snap: unknown) => void) | undefined;
    onSnapshotMock.mockImplementation((_q, cb) => {
      capturedCallback = cb;
      return () => {};
    });

    const { subscribeReplies } = await import("./subscribeReplies");
    const onChangeMock = vi.fn();
    subscribeReplies("myThread", onChangeMock);

    const snapshot = {
      docChanges: () => [makeDocChange("added", "r1", { flowTime: 100 })],
    };
    capturedCallback?.(snapshot);

    const diff = onChangeMock.mock.calls[0][0];
    expect(diff.added[0].threadKey).toBe("myThread");
    expect(diff.added[0].key).toBe("r1");
  });

  it("drops a malformed doc and calls logError with docId and error", async () => {
    // Verifies: specs/pelilauta/threads/replies/spec.md §subscribeReplies drops and logs a per-doc parse failure
    let capturedCallback: ((snap: unknown) => void) | undefined;
    onSnapshotMock.mockImplementation((_q, cb) => {
      capturedCallback = cb;
      return () => {};
    });

    const { subscribeReplies } = await import("./subscribeReplies");
    const onChangeMock = vi.fn();
    subscribeReplies("thread1", onChangeMock);

    // Snapshot with one valid doc and one malformed doc
    const snapshot = {
      docChanges: () => [
        makeDocChange("added", "valid", { flowTime: 100 }),
        makeMalformedDocChange("malformed"),
      ],
    };
    capturedCallback?.(snapshot);

    // logError must have been called once with the bad doc id
    expect(logErrorMock).toHaveBeenCalledOnce();
    const logCall = logErrorMock.mock.calls[0];
    expect(logCall[1]).toMatchObject({ docId: "malformed" });

    // The valid doc is still emitted; malformed is dropped
    expect(onChangeMock).toHaveBeenCalledOnce();
    const diff = onChangeMock.mock.calls[0][0];
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].key).toBe("valid");
  });

  it("the listener remains active after a parse failure (callback is still called)", async () => {
    // Verifies: specs/pelilauta/threads/replies/spec.md §subscribeReplies drops and logs a per-doc parse failure
    let capturedCallback: ((snap: unknown) => void) | undefined;
    onSnapshotMock.mockImplementation((_q, cb) => {
      capturedCallback = cb;
      return () => {};
    });

    const { subscribeReplies } = await import("./subscribeReplies");
    const onChangeMock = vi.fn();
    subscribeReplies("thread1", onChangeMock);

    // First snapshot: malformed only
    capturedCallback?.({ docChanges: () => [makeMalformedDocChange("bad")] });
    // Second snapshot: valid
    capturedCallback?.({ docChanges: () => [makeDocChange("added", "ok", { flowTime: 200 })] });

    expect(onChangeMock).toHaveBeenCalledTimes(2);
    expect(onChangeMock.mock.calls[1][0].added[0].key).toBe("ok");
  });

  it("returns the unsubscribe handle from onSnapshot", async () => {
    // Verifies: specs/pelilauta/threads/replies/spec.md §subscribeReplies emits a docChanges diff on each snapshot
    const unsubMock = vi.fn();
    onSnapshotMock.mockReturnValue(unsubMock);

    const { subscribeReplies } = await import("./subscribeReplies");
    const result = subscribeReplies("thread1", vi.fn());

    expect(result).toBe(unsubMock);
  });
});
