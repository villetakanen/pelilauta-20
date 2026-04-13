// Scenario: Client initialization is SSR-safe (specs/pelilauta/firebase/spec.md)
// - Importing the module in a no-window environment does not throw.
// - Memoization: repeated getApp() returns the same instance.
// - Persistence shim only runs under window.hostname === "localhost".

import { beforeEach, describe, expect, it, vi } from "vitest";

const initializeApp = vi.fn(() => ({ name: "[DEFAULT]" }));
const getApps = vi.fn(() => [] as Array<{ name: string }>);

vi.mock("firebase/app", () => ({
  initializeApp,
  getApps,
}));

const setPersistence = vi.fn(() => Promise.resolve());
const browserLocalPersistence = Symbol("browserLocalPersistence");

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn((app: unknown) => ({ _app: app, kind: "auth" })),
  setPersistence,
  browserLocalPersistence,
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn((app: unknown) => ({ _app: app, kind: "firestore" })),
}));

describe("@pelilauta/firebase/client", () => {
  beforeEach(() => {
    vi.resetModules();
    initializeApp.mockClear();
    getApps.mockClear();
    getApps.mockReturnValue([]);
    setPersistence.mockClear();
  });

  it("imports without throwing in an SSR context (no window)", async () => {
    expect(typeof globalThis.window).toBe("undefined");
    await expect(import("./index")).resolves.toBeDefined();
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it("memoizes getApp across repeat calls", async () => {
    const mod = await import("./index");
    const a = mod.getApp();
    const b = mod.getApp();
    expect(a).toBe(b);
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });

  it("does not apply localhost persistence when window is undefined", async () => {
    const mod = await import("./index");
    mod.getAuth();
    expect(setPersistence).not.toHaveBeenCalled();
  });
});
