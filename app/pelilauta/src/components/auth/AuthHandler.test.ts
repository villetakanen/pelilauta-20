import * as firebaseClient from "@pelilauta/firebase/client";
import { cleanup, render, waitFor } from "@testing-library/svelte";
import type { Auth, User } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { profile, sessionState, uid } from "../../stores/session";
import AuthHandler from "./AuthHandler.svelte";

vi.mock("@pelilauta/firebase/client", () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(),
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
    const mockUser = { getIdToken: vi.fn().mockResolvedValue("new-token") } as unknown as User;
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
    expect(mockUser.getIdToken).toHaveBeenCalledWith(true);
    expect(window.location.reload).not.toHaveBeenCalled();
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

  it("Scenario: AuthHandler logs out when the client has no user and cannot recover", async () => {
    vi.mocked(fetch as Mock).mockImplementation((url) => {
      if (url === "/api/auth/status") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ loggedIn: true, uid: ssrUid }),
        });
      }
      if (url === "/api/auth/session") {
        return Promise.resolve({ ok: true });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    // Server says OK, but client has NO currentUser — no token to refresh.
    render(AuthHandler, { ssrUid, ssrProfile });
    authStateCallback(null);

    await waitFor(() => expect(window.location.reload).toHaveBeenCalled());
  });
});
