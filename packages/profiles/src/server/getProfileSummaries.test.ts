import { beforeEach, describe, expect, it, vi } from "vitest";

const doc = vi.fn((uid: string) => ({ id: uid }));
const collection = vi.fn(() => ({ doc }));
const getAll = vi.fn();
const getDb = vi.fn(() => ({ collection, getAll }));

vi.mock("@pelilauta/firebase/server", () => ({ getDb }));

describe("getProfileSummaries", () => {
  beforeEach(() => {
    vi.resetModules();
    doc.mockClear();
    collection.mockClear();
    getAll.mockReset();
    getDb.mockClear();
  });

  it("strips empty and sentinel ids", async () => {
    getAll.mockResolvedValue([
      { id: "uid-a", exists: true, data: () => ({ nick: "Ada", username: "ada" }) },
      { id: "uid-b", exists: true, data: () => ({ nick: "Bob", username: "bob" }) },
    ]);
    const { getProfileSummaries } = await import("./getProfileSummaries");
    const out = await getProfileSummaries(["uid-a", "-", "", "uid-b"]);

    expect(doc).toHaveBeenCalledTimes(2);
    expect(out.has("uid-a")).toBe(true);
    expect(out.has("uid-b")).toBe(true);
    expect(out.has("-")).toBe(false);
  });

  it("dedupes repeated ids", async () => {
    getAll.mockResolvedValue([]);
    const { getProfileSummaries } = await import("./getProfileSummaries");
    await getProfileSummaries(["uid-a", "uid-a", "uid-b", "uid-a"]);
    expect(doc).toHaveBeenCalledTimes(2);
  });

  it("returns null for not-found ids", async () => {
    getAll.mockResolvedValue([
      { id: "uid-a", exists: true, data: () => ({ nick: "Ada", username: "ada" }) },
      { id: "uid-b", exists: false, data: () => undefined },
    ]);
    const { getProfileSummaries } = await import("./getProfileSummaries");
    const out = await getProfileSummaries(["uid-a", "uid-b"]);

    expect(out.get("uid-a")).toMatchObject({ key: "uid-a", nick: "Ada" });
    expect(out.get("uid-b")).toBeNull();
  });
});
