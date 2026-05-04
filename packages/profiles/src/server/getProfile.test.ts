// Verifies: specs/pelilauta/profiles/spec.md §getProfile returns null on missing or unparseable doc

import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const docMock = vi.fn(() => ({ get: getMock }));
const collectionMock = vi.fn(() => ({ doc: docMock }));
const getDb = vi.fn(() => ({ collection: collectionMock }));
const logError = vi.fn();

vi.mock("@pelilauta/firebase/server", () => ({ getDb }));
vi.mock("@pelilauta/utils/log", () => ({ logError }));

describe("getProfile", () => {
  beforeEach(() => {
    vi.resetModules();
    getMock.mockReset();
    docMock.mockClear();
    collectionMock.mockClear();
    getDb.mockClear();
    logError.mockClear();
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

  it("returns null when the doc fails ProfileSchema", async () => {
    // bio is z.string().optional(); an integer bio passes through normalizer untouched and fails parse.
    getMock.mockResolvedValue({
      exists: true,
      id: "uid-bad",
      data: () => ({ nick: "Ada", username: "ada", bio: 42 }),
    });
    const { getProfile } = await import("./getProfile");
    await expect(getProfile("uid-bad")).resolves.toBeNull();
    expect(logError).toHaveBeenCalledOnce();
  });
});
