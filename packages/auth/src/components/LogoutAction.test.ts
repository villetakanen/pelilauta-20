import * as sessionStore from "@pelilauta/auth/client";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LogoutAction from "./LogoutAction.svelte";

vi.mock("@pelilauta/auth/client", async () => {
  const actual =
    await vi.importActual<typeof import("@pelilauta/auth/client")>("@pelilauta/auth/client");
  return {
    ...actual,
    fullLogout: vi.fn().mockResolvedValue(undefined),
  };
});

describe("LogoutAction.svelte", () => {
  beforeEach(() => {
    vi.mocked(sessionStore.fullLogout).mockReset().mockResolvedValue(undefined);
    sessionStore.sessionState.set("active");
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("Scenario: LogoutAction triggers fullLogout on click", async () => {
    render(LogoutAction);
    const button = screen.getByRole("button");

    await fireEvent.click(button);

    expect(sessionStore.fullLogout).toHaveBeenCalledTimes(1);
  });

  it("Scenario: LogoutAction coalesces repeat clicks while logout is in flight", async () => {
    let resolveLogout: () => void = () => {};
    vi.mocked(sessionStore.fullLogout).mockImplementation(
      () => new Promise<void>((r) => (resolveLogout = r)),
    );

    render(LogoutAction);
    const button = screen.getByRole("button");

    await fireEvent.click(button);
    await fireEvent.click(button);
    await fireEvent.click(button);

    expect(sessionStore.fullLogout).toHaveBeenCalledTimes(1);
    resolveLogout();
  });

  it("Scenario: LogoutAction surfaces the error state when sign-out fails", async () => {
    // Simulate the partial-failure path — fullLogout flips sessionState to
    // "error" and resolves without reloading.
    vi.mocked(sessionStore.fullLogout).mockImplementation(async () => {
      sessionStore.sessionState.set("error");
    });

    render(LogoutAction);
    const button = screen.getByRole("button");

    await fireEvent.click(button);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent?.toLowerCase()).toContain("sign-out failed");
    expect(button.hasAttribute("disabled")).toBe(false);
  });
});
