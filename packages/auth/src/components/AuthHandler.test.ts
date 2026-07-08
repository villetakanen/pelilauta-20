import { profile, sessionState, uid } from "@pelilauta/auth/client";
import * as firebaseClient from "@pelilauta/firebase/client";
import { cleanup, render, waitFor } from "@testing-library/svelte";
import type { Auth, User } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import AuthHandler from "./AuthHandler.svelte";

vi.mock("@pelilauta/firebase/client", () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signInWithCustomToken: vi.fn(),
}));

vi.mock("@pelilauta/utils/log", () => ({
  logError: vi.fn(),
}));

function mockAuthFixture(overrides: Partial<Auth> = {}): Auth {
  return {
    currentUser: null,
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as Auth;
}

describe("AuthHandler.svelte", () => {
  const ssrUid = "ssr-user-123";
  const ssrProfile = { nick: "SSR User" };
  let mockAuth: Auth;
  let authStateCallback: (user: User | null) => void;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("location", { reload: vi.fn() });

    mockAuth = mockAuthFixture();
    vi.mocked(firebaseClient.getAuth).mockReturnValue(mockAuth);
    vi.mocked(firebaseClient.onAuthStateChanged).mockImplementation((_auth, cb) => {
      authStateCallback = cb as (user: User | null) => void;
      return () => {};
    });

    uid.set(null);
    profile.set(null);
    sessionState.set("initial");
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("Scenario: AuthHandler seeds the session store from SSR props on mount", () => {
    render(AuthHandler, { ssrUid, ssrProfile });

    expect(uid.get()).toBe(ssrUid);
    expect(profile.get()).toEqual(ssrProfile);
    expect(sessionState.get()).toBe("active");
  });

  it("Scenario: AuthHandler stays quiet when the client session matches SSR", () => {
    render(AuthHandler, { ssrUid, ssrProfile });

    authStateCallback({ uid: ssrUid } as User);

    expect(fetch).not.toHaveBeenCalled();
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it("Scenario: AuthHandler reconciles a stale client session with a live currentUser", async () => {
    const mockUser = {
      uid: ssrUid,
      getIdToken: vi.fn().mockResolvedValue("new-token"),
    } as unknown as User;
    mockAuth = mockAuthFixture({ currentUser: mockUser });
    vi.mocked(firebaseClient.getAuth).mockReturnValue(mockAuth);

    vi.mocked(fetch as Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ loggedIn: true, uid: ssrUid }),
    });

    render(AuthHandler, { ssrUid, ssrProfile });

    authStateCallback(null);

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/auth/status",
        expect.objectContaining({ cache: "no-store" }),
      ),
    );
    await waitFor(() => expect(mockUser.getIdToken).toHaveBeenCalledWith(true));
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it("Scenario: AuthHandler propagates frozen=true to the profile store after reconciliation", async () => {
    // Verifies: specs/pelilauta/session/frozen.md §Client session store reflects frozen status after status check
    const mockUser = {
      uid: ssrUid,
      getIdToken: vi.fn().mockResolvedValue("new-token"),
    } as unknown as User;
    mockAuth = mockAuthFixture({ currentUser: mockUser });
    vi.mocked(firebaseClient.getAuth).mockReturnValue(mockAuth);

    vi.mocked(fetch as Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ loggedIn: true, uid: ssrUid, frozen: true }),
    });

    render(AuthHandler, { ssrUid, ssrProfile });

    authStateCallback(null);

    await waitFor(() => {
      const currentProfile = profile.get();
      expect(currentProfile?.frozen).toBe(true);
    });
  });

  it("Scenario: AuthHandler logs out when the server oracle reports loggedIn=false", async () => {
    vi.mocked(fetch as Mock).mockImplementation((url) => {
      if (url === "/api/auth/status") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ loggedIn: false }) });
      }
      if (url === "/api/auth/session") {
        return Promise.resolve({ ok: true });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    render(AuthHandler, { ssrUid, ssrProfile });

    authStateCallback(null);

    await waitFor(() => expect(window.location.reload).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/session",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(mockAuth.signOut).toHaveBeenCalled();
  });

  it("Scenario: Reconcile recovers a missing client user", async () => {
    // Verifies: specs/pelilauta/session/state-machine.md §Reconcile recovers a missing client user
    vi.mocked(fetch as Mock).mockImplementation((url) => {
      if (url === "/api/auth/status") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ loggedIn: true, uid: ssrUid }),
        });
      }
      if (url === "/api/auth/custom-token") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ token: "recovery-token" }),
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    render(AuthHandler, { ssrUid, ssrProfile });
    authStateCallback(null);

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/auth/custom-token",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    await waitFor(() =>
      expect(firebaseClient.signInWithCustomToken).toHaveBeenCalledWith(mockAuth, "recovery-token"),
    );
    // No teardown: the client user was missing, not rejected by the server.
    expect(mockAuth.signOut).not.toHaveBeenCalled();
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it("Scenario: Reconcile resolves a uid mismatch in the server's favor", async () => {
    // Verifies: specs/pelilauta/session/state-machine.md §Reconcile resolves a uid mismatch in the server's favor
    mockAuth = mockAuthFixture({ currentUser: { uid: "other-user" } as User });
    vi.mocked(firebaseClient.getAuth).mockReturnValue(mockAuth);

    vi.mocked(fetch as Mock).mockImplementation((url) => {
      if (url === "/api/auth/status") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ loggedIn: true, uid: ssrUid }),
        });
      }
      if (url === "/api/auth/custom-token") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ token: "recovery-token" }),
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    render(AuthHandler, { ssrUid, ssrProfile });
    authStateCallback({ uid: "other-user" } as User);

    await waitFor(() =>
      expect(firebaseClient.signInWithCustomToken).toHaveBeenCalledWith(mockAuth, "recovery-token"),
    );
    // The wrong client user is dropped before recovery as the cookie's uid.
    expect(mockAuth.signOut).toHaveBeenCalled();
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it("Scenario: Failed recovery exits via fullLogout", async () => {
    // Verifies: specs/pelilauta/session/state-machine.md §Failed recovery exits via fullLogout
    vi.mocked(fetch as Mock).mockImplementation((url, init) => {
      if (url === "/api/auth/status") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ loggedIn: true, uid: ssrUid }),
        });
      }
      if (url === "/api/auth/custom-token") {
        return Promise.resolve({ ok: false, status: 500 });
      }
      if (url === "/api/auth/session" && init?.method === "DELETE") {
        return Promise.resolve({ ok: true });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    render(AuthHandler, { ssrUid, ssrProfile });
    authStateCallback(null);

    await waitFor(() => expect(window.location.reload).toHaveBeenCalled());
    const customTokenCalls = vi
      .mocked(fetch as Mock)
      .mock.calls.filter(([url]) => url === "/api/auth/custom-token");
    expect(customTokenCalls).toHaveLength(1);
    expect(firebaseClient.signInWithCustomToken).not.toHaveBeenCalled();
  });

  it("Scenario: Oracle transport failure preserves the session", async () => {
    // Verifies: specs/pelilauta/session/state-machine.md §Oracle transport failure preserves the session
    vi.mocked(fetch as Mock).mockRejectedValue(new TypeError("network down"));

    render(AuthHandler, { ssrUid, ssrProfile });
    authStateCallback(null);

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/auth/status", expect.anything()));
    // Give any erroneous teardown a chance to run before asserting it didn't.
    await new Promise((r) => setTimeout(r, 0));

    expect(window.location.reload).not.toHaveBeenCalled();
    expect(mockAuth.signOut).not.toHaveBeenCalled();
    expect(uid.get()).toBe(ssrUid);
    expect(sessionState.get()).toBe("active");
  });
});
