import * as firebaseClient from "@pelilauta/firebase/client";
import type { Auth } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { fullLogout, logout, profile, sessionState, uid } from "./session";

vi.mock("@pelilauta/firebase/client", () => ({
  getAuth: vi.fn(),
}));

vi.mock("@pelilauta/utils/log", () => ({
  logError: vi.fn(),
}));

describe("session store", () => {
  beforeEach(() => {
    logout();
  });

  it("Scenario: Session store initializes to anonymous/initial", () => {
    expect(sessionState.get()).toBe("initial");
    expect(uid.get()).toBe(null);
    expect(profile.get()).toBe(null);
  });

  it("Scenario: Session store transitions through the documented lifecycle", () => {
    sessionState.set("loading");
    expect(sessionState.get()).toBe("loading");

    uid.set("user-123");
    profile.set({ nick: "TestUser", avatarURL: "https://example.test/a.png" });
    sessionState.set("active");

    expect(sessionState.get()).toBe("active");
    expect(uid.get()).toBe("user-123");
    expect(profile.get()).toEqual({
      nick: "TestUser",
      avatarURL: "https://example.test/a.png",
    });
  });

  it("allows optional avatarURL to be omitted", () => {
    profile.set({ nick: "NoAvatar" });
    expect(profile.get()).toEqual({ nick: "NoAvatar" });
  });

  it("error state is preserved on sessionState", () => {
    sessionState.set("error");
    expect(sessionState.get()).toBe("error");
  });

  it("Scenario: logout() clears all session atoms", () => {
    sessionState.set("active");
    uid.set("someone");
    profile.set({ nick: "Someone" });

    logout();

    expect(sessionState.get()).toBe("initial");
    expect(uid.get()).toBe(null);
    expect(profile.get()).toBe(null);
  });
});

describe("fullLogout", () => {
  let mockSignOut: Mock;

  beforeEach(() => {
    mockSignOut = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    // window.location.reload is non-configurable in real browsers; jsdom lets
    // us override the whole location object via stubGlobal.
    vi.stubGlobal("location", { reload: vi.fn() });
    vi.mocked(firebaseClient.getAuth).mockReturnValue({
      signOut: mockSignOut,
    } as unknown as Auth);

    sessionState.set("active");
    uid.set("u");
    profile.set({ nick: "N" });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("runs the full exit fan-out: DELETE → signOut → clear atoms → reload", async () => {
    await fullLogout();

    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/session",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(uid.get()).toBe(null);
    expect(profile.get()).toBe(null);
    expect(sessionState.get()).toBe("initial");
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it("Scenario: fullLogout halts on cookie DELETE throw", async () => {
    vi.mocked(fetch as Mock).mockRejectedValueOnce(new Error("network"));

    await fullLogout();

    expect(mockSignOut).not.toHaveBeenCalled();
    // Atoms preserved — the user is still authenticated on the server.
    expect(uid.get()).toBe("u");
    expect(profile.get()).toEqual({ nick: "N" });
    expect(sessionState.get()).toBe("error");
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it("Scenario: fullLogout halts on cookie DELETE non-ok response", async () => {
    vi.mocked(fetch as Mock).mockResolvedValueOnce({ ok: false, status: 500 });

    await fullLogout();

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(uid.get()).toBe("u");
    expect(sessionState.get()).toBe("error");
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it("Scenario: fullLogout proceeds on signOut failure after cookie clear", async () => {
    mockSignOut.mockRejectedValueOnce(new Error("firebase offline"));

    await fullLogout();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(uid.get()).toBe(null);
    expect(sessionState.get()).toBe("initial");
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });
});
