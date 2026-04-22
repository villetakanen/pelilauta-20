import { cleanup, render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { logout, profile, sessionState } from "../../stores/session";
import AuthChrome from "./AuthChrome.svelte";

describe("AuthChrome.svelte", () => {
  beforeEach(() => {
    logout();
  });

  afterEach(() => {
    cleanup();
    logout();
  });

  it("Scenario: AuthChrome prefers the hydrated store over the SSR seed", () => {
    profile.set({ nick: "Live", avatarURL: "https://x/2.png" });
    const { container } = render(AuthChrome, {
      ssrProfile: { nick: "SSR", avatarURL: "https://x/1.png" },
    });
    const avatar = container.querySelector(".cn-avatar");
    expect(avatar?.getAttribute("data-nick")).toBe("Live");
  });

  it("falls back to SSR seed when the store is empty", () => {
    const { container } = render(AuthChrome, {
      ssrProfile: { nick: "SSR", avatarURL: "https://x/1.png" },
    });
    const avatar = container.querySelector(".cn-avatar");
    expect(avatar?.getAttribute("data-nick")).toBe("SSR");
  });

  it("Scenario: AuthChrome surfaces the loading sessionState to ProfileButton", () => {
    sessionState.set("loading");
    const { container } = render(AuthChrome, { ssrProfile: null });
    expect(container.querySelector(".cn-profile-button--loading")).not.toBeNull();
  });

  it("renders the anonymous state when both store and SSR seed are null", () => {
    const { container } = render(AuthChrome, { ssrProfile: null });
    expect(container.querySelector(".cn-profile-button--anonymous")).not.toBeNull();
  });
});
