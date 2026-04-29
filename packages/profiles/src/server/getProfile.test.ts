import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const docMock = vi.fn(() => ({ get: getMock }));
const collectionMock = vi.fn(() => ({ doc: docMock }));
const getDb = vi.fn(() => ({ collection: collectionMock }));

vi.mock("@pelilauta/firebase/server", () => ({ getDb }));

describe("getProfile", () => {
  beforeEach(() => {
    vi.resetModules();
    getMock.mockReset();
    docMock.mockClear();
    collectionMock.mockClear();
    getDb.mockClear();
  });

  it("returns null on missing doc", async () => {
    getMock.mockResolvedValue({ exists: false, id: "uid-x", data: () => undefined });
    const { getProfile } = await import("./getProfile");
    await expect(getProfile("uid-x")).resolves.toBeNull();
  });

  it("returns parsed profile on existing doc", async () => {
    getMock.mockResolvedValue({
      exists: true,
      id: "uid-a",
      data: () => ({ nick: "Ada", username: "ada" }),
    });
    const { getProfile } = await import("./getProfile");
    await expect(getProfile("uid-a")).resolves.toMatchObject({ key: "uid-a", nick: "Ada" });
  });

  it("returns null for sentinel uid", async () => {
    const { getProfile } = await import("./getProfile");
    await expect(getProfile("-")).resolves.toBeNull();
    expect(getDb).not.toHaveBeenCalled();
  });
});
