import { beforeEach, describe, expect, it } from "vitest";
import { logout, profile, sessionState, uid } from "./session";

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
