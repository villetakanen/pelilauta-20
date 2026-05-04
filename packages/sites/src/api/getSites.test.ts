// Scenarios: "getSites returns paginated public sites"
//            "getSites with uid filter returns sites the uid owns"
// — specs/pelilauta/sites/spec.md

import { beforeEach, describe, expect, it, vi } from "vitest";

// Firestore chain mock: collection().where().where?().orderBy().limit().get()
const getMock = vi.fn();
const limitMock = vi.fn(() => ({ get: getMock }));
const orderByMock = vi.fn(() => ({ limit: limitMock }));
const whereMock = vi.fn();
const collectionMock = vi.fn();
const getDb = vi.fn();

// Wire up chain
whereMock.mockReturnValue({ where: whereMock, orderBy: orderByMock });
collectionMock.mockReturnValue({ where: whereMock });
getDb.mockReturnValue({ collection: collectionMock });

vi.mock("@pelilauta/firebase/server", () => ({ getDb }));

function makeDoc(id: string, data: Record<string, unknown> = {}) {
  return {
    id,
    data: () => ({
      name: "Test Site",
      owners: ["user1"],
      hidden: false,
      flowTime: Date.now(),
      system: "homebrew",
      ...data,
    }),
  };
}

describe("getSites", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const mock of [getMock, limitMock, orderByMock, whereMock, collectionMock, getDb]) {
      mock.mockClear();
    }
    // Re-wire the chain after clear
    whereMock.mockReturnValue({ where: whereMock, orderBy: orderByMock });
    collectionMock.mockReturnValue({ where: whereMock });
    getDb.mockReturnValue({ collection: collectionMock });
    orderByMock.mockReturnValue({ limit: limitMock });
    limitMock.mockReturnValue({ get: getMock });
  });

  it("queries sites collection with hidden=false and flowTime desc by default", async () => {
    getMock.mockResolvedValue({ docs: [makeDoc("s1"), makeDoc("s2")] });

    const { getSites } = await import("./getSites");
    const sites = await getSites(10);

    expect(collectionMock).toHaveBeenCalledWith("sites");
    expect(whereMock).toHaveBeenCalledWith("hidden", "==", false);
    expect(orderByMock).toHaveBeenCalledWith("flowTime", "desc");
    expect(limitMock).toHaveBeenCalledWith(10);
    expect(sites).toHaveLength(2);
    expect(sites[0]?.key).toBe("s1");
  });

  it("excludes hidden=true sites when public=true (default)", async () => {
    getMock.mockResolvedValue({ docs: [makeDoc("s1")] });

    const { getSites } = await import("./getSites");
    await getSites(10);

    // hidden===false is the storage predicate for public===true
    expect(whereMock).toHaveBeenCalledWith("hidden", "==", false);
  });

  it("adds owners array-contains filter when uid is supplied", async () => {
    getMock.mockResolvedValue({ docs: [makeDoc("s1", { owners: ["u-alice"] })] });

    const { getSites } = await import("./getSites");
    await getSites(20, { uid: "u-alice" });

    expect(whereMock).toHaveBeenCalledWith("owners", "array-contains", "u-alice");
  });

  it("returns sites sorted by flowTime descending", async () => {
    const now = Date.now();
    getMock.mockResolvedValue({
      docs: [makeDoc("newer", { flowTime: now }), makeDoc("older", { flowTime: now - 10_000 })],
    });

    const { getSites } = await import("./getSites");
    const sites = await getSites(10);

    // Order is determined by Firestore's orderBy — we verify the correct orderBy was called
    expect(orderByMock).toHaveBeenCalledWith("flowTime", "desc");
    expect(sites[0]?.key).toBe("newer");
  });

  it("returns an empty array when no documents match", async () => {
    getMock.mockResolvedValue({ docs: [] });

    const { getSites } = await import("./getSites");
    const sites = await getSites(10);

    expect(sites).toEqual([]);
  });

  it("assigns doc.id as the site key", async () => {
    getMock.mockResolvedValue({ docs: [makeDoc("my-site-key")] });

    const { getSites } = await import("./getSites");
    const sites = await getSites(1);

    expect(sites[0]?.key).toBe("my-site-key");
  });

  it("applies legacy field migration before parsing", async () => {
    getMock.mockResolvedValue({
      docs: [
        makeDoc("legacy-site", {
          customPageKeys: true,
          usePlainTextURLs: undefined,
          sortOrder: "updated",
        }),
      ],
    });

    const { getSites } = await import("./getSites");
    const sites = await getSites(1);

    // customPageKeys=true → usePlainTextURLs=false
    expect(sites[0]?.usePlainTextURLs).toBe(false);
    // 'updated' → 'flowTime'
    expect(sites[0]?.sortOrder).toBe("flowTime");
  });

  it("propagates Firestore errors to the caller", async () => {
    getMock.mockRejectedValue(new Error("network down"));

    const { getSites } = await import("./getSites");

    await expect(getSites(10)).rejects.toThrow("network down");
  });
});
