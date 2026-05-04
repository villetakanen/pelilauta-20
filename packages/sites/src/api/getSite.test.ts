// Scenarios: "getSite returns a parsed Site for an existing doc"
//            "getSite returns undefined for a missing doc"
//            "getSite propagates Firestore errors"
//            "getSite propagates Zod parse failures on malformed docs"
// — specs/pelilauta/sites/spec.md

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
      name: "Test Site",
      owners: ["user1"],
      hidden: false,
      flowTime: Date.now(),
      system: "homebrew",
      ...data,
    }),
  };
}

describe("getSite", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const mock of [getMock, docMock, collectionMock, getDb]) {
      mock.mockClear();
    }
    // Re-wire the chain after clear
    collectionMock.mockReturnValue({ doc: docMock });
    docMock.mockReturnValue({ get: getMock });
    getDb.mockReturnValue({ collection: collectionMock });
  });

  it("returns a parsed Site for an existing doc", async () => {
    getMock.mockResolvedValue(makeSnapshot("site-1", { name: "My Campaign" }));

    const { getSite } = await import("./getSite");
    const site = await getSite("site-1");

    expect(collectionMock).toHaveBeenCalledWith("sites");
    expect(docMock).toHaveBeenCalledWith("site-1");
    expect(site).toBeDefined();
    expect(site?.key).toBe("site-1");
    expect(site?.name).toBe("My Campaign");
  });

  it("returns undefined for a missing doc", async () => {
    getMock.mockResolvedValue({ exists: false, id: "missing", data: () => undefined });

    const { getSite } = await import("./getSite");
    const site = await getSite("missing");

    expect(site).toBeUndefined();
  });

  it("propagates Firestore errors to the caller", async () => {
    getMock.mockRejectedValue(new Error("network down"));

    const { getSite } = await import("./getSite");

    await expect(getSite("any")).rejects.toThrow("network down");
  });

  it("applies legacy field migration before parsing", async () => {
    getMock.mockResolvedValue(
      makeSnapshot("legacy-site", {
        customPageKeys: true,
        usePlainTextURLs: undefined,
        sortOrder: "created",
      }),
    );

    const { getSite } = await import("./getSite");
    const site = await getSite("legacy-site");

    // customPageKeys=true → usePlainTextURLs=false
    expect(site?.usePlainTextURLs).toBe(false);
    // 'created' → 'createdAt'
    expect(site?.sortOrder).toBe("createdAt");
  });

  it("returns the site with the requested key", async () => {
    getMock.mockResolvedValue(makeSnapshot("the-key", {}));

    const { getSite } = await import("./getSite");
    const site = await getSite("the-key");

    expect(site?.key).toBe("the-key");
  });
});
