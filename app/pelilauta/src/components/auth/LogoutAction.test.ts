import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as sessionStore from "../../stores/session";
import LogoutAction from "./LogoutAction.svelte";

vi.mock("../../stores/session", async () => {
  const actual =
    await vi.importActual<typeof import("../../stores/session")>("../../stores/session");
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
    expect(alert).toHaveTextContent(/sign-out failed/i);
    expect(button).not.toBeDisabled();
  });
});
