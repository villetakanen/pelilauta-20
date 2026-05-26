// account.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

// Firestore chain mock: collection().doc().get()
const getMock = vi.fn();
const docMock = vi.fn(() => ({ get: getMock }));
const collectionMock = vi.fn(() => ({ doc: docMock }));
const getDb = vi.fn(() => ({ collection: collectionMock }));

vi.mock("@pelilauta/firebase/server", () => ({ getDb }));
vi.mock("@pelilauta/utils/log", () => ({ logError: vi.fn() }));

beforeEach(() => {
  vi.resetModules();
  getMock.mockReset();
  docMock.mockReset();
  collectionMock.mockReset();
  docMock.mockReturnValue({ get: getMock });
  collectionMock.mockReturnValue({ doc: docMock });
  getDb.mockReturnValue({ collection: collectionMock });
});

describe("getAccount", () => {
  it("returns null when the document is missing", async () => {
    getMock.mockResolvedValue({ exists: false, data: () => undefined });

    const { getAccount } = await import("./account");
    const result = await getAccount("uid-missing");

    expect(result).toBeNull();
    expect(collectionMock).toHaveBeenCalledWith("account");
    expect(docMock).toHaveBeenCalledWith("uid-missing");
  });

  it("returns { frozen: false } when the doc has no frozen field (default applies)", async () => {
    getMock.mockResolvedValue({ exists: true, data: () => ({ nick: "Alice" }) });

    const { getAccount } = await import("./account");
    const result = await getAccount("uid-no-frozen");

    expect(result).not.toBeNull();
    expect(result?.frozen).toBe(false);
  });

  it("returns { frozen: true } when the doc explicitly sets frozen: true", async () => {
    // Verifies: specs/pelilauta/session/frozen.md §Status oracle returns frozen status for standard users
    getMock.mockResolvedValue({ exists: true, data: () => ({ frozen: true }) });

    const { getAccount } = await import("./account");
    const result = await getAccount("uid-frozen");

    expect(result?.frozen).toBe(true);
  });

  it("logs and returns null when Firestore throws a network/permissions error", async () => {
    getMock.mockRejectedValue(new Error("UNAVAILABLE: network error"));

    const { getAccount } = await import("./account");
    const { logError } = await import("@pelilauta/utils/log");
    const result = await getAccount("uid-firestore-error");

    expect(result).toBeNull();
    expect(logError).toHaveBeenCalledWith(
      "[getAccount] firestore read failed",
      expect.objectContaining({ uid: "uid-firestore-error" }),
    );
  });

  it("logs and returns null on schema parse failure", async () => {
    // Force a parse failure by providing an invalid frozen value.
    getMock.mockResolvedValue({ exists: true, data: () => ({ frozen: "not-a-bool" }) });

    const { getAccount } = await import("./account");
    const { logError } = await import("@pelilauta/utils/log");
    const result = await getAccount("uid-bad-schema");

    expect(result).toBeNull();
    expect(logError).toHaveBeenCalled();
  });
});
