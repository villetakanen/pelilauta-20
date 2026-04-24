// Scenario: Server Firestore initialization (specs/pelilauta/firebase/spec.md)
// - Memoization: repeated getApp() returns the same instance.
// - SSR safety: importing the module does not read env / call initializeApp.

import { beforeEach, describe, expect, it, vi } from "vitest";

const initializeApp = vi.fn(() => ({ name: "[DEFAULT]" }));
const getApps = vi.fn(() => [] as Array<{ name: string }>);
const cert = vi.fn((x: unknown) => x);

vi.mock("firebase-admin/app", () => ({
  initializeApp,
  getApps,
  cert,
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn((app: unknown) => ({ _app: app, kind: "auth" })),
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: vi.fn((app: unknown) => ({ _app: app, kind: "firestore" })),
}));

describe("@pelilauta/firebase/server", () => {
  beforeEach(() => {
    vi.resetModules();
    initializeApp.mockClear();
    getApps.mockClear();
    getApps.mockReturnValue([]);
  });

  it("does not call initializeApp at import time (SSR safety)", async () => {
    await import("./index");
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it("memoizes getApp across repeat calls", async () => {
    const mod = await import("./index");
    const a = mod.getApp();
    const b = mod.getApp();
    expect(a).toBe(b);
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });

  it("reuses an existing [DEFAULT] app instead of re-initializing", async () => {
    const existing = { name: "[DEFAULT]" };
    getApps.mockReturnValue([existing]);
    const mod = await import("./index");
    expect(mod.getApp()).toBe(existing);
    expect(initializeApp).not.toHaveBeenCalled();
  });
});
