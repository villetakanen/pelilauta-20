import * as firebaseClient from "@pelilauta/firebase/client";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import LoginButton from "./LoginButton.svelte";

vi.mock("@pelilauta/firebase/client", () => ({
  getAuth: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
}));

vi.mock("@pelilauta/utils/log", () => ({
  logError: vi.fn(),
}));

describe("LoginButton.svelte", () => {
  const mockIdToken = "mock-id-token";
  const mockUser = {
    getIdToken: vi.fn(() => Promise.resolve(mockIdToken)),
  };
  const mockResult = { user: mockUser };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("location", { ...window.location, assign: vi.fn() });

    vi.mocked(firebaseClient.signInWithPopup).mockResolvedValue(
      mockResult as unknown as Awaited<ReturnType<typeof firebaseClient.signInWithPopup>>,
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("Scenario: LoginButton triggers popup and posts ID token on success", async () => {
    vi.mocked(fetch as Mock).mockResolvedValue({ ok: true });

    render(LoginButton, { next: "/threads" });
    await fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(firebaseClient.signInWithPopup).toHaveBeenCalled());
    expect(mockUser.getIdToken).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/session",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ idToken: mockIdToken }),
      }),
    );
    expect(window.location.assign).toHaveBeenCalledWith("/threads");
  });

  it("Scenario: LoginButton surfaces popup errors inline", async () => {
    vi.mocked(firebaseClient.signInWithPopup).mockRejectedValue(
      Object.assign(new Error("Popup blocked"), { code: "auth/popup-blocked" }),
    );

    render(LoginButton);
    await fireEvent.click(screen.getByRole("button"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Popup was blocked by the browser.");
    expect(screen.getByRole("button")).not.toBeDisabled();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it("Scenario: LoginButton surfaces server-POST errors inline", async () => {
    vi.mocked(fetch as Mock).mockResolvedValue({ ok: false });

    render(LoginButton);
    await fireEvent.click(screen.getByRole("button"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Login failed. Please try again.");
    expect(screen.getByRole("button")).not.toBeDisabled();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it("Scenario: LoginButton discards unsafe next values", async () => {
    vi.mocked(fetch as Mock).mockResolvedValue({ ok: true });

    render(LoginButton, { next: "http://evil.example.com" });
    await fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(window.location.assign).toHaveBeenCalled());
    expect(window.location.assign).toHaveBeenCalledWith("/");
  });

  it("maps auth/popup-closed-by-user to the dismissal message", async () => {
    vi.mocked(firebaseClient.signInWithPopup).mockRejectedValue(
      Object.assign(new Error("Popup closed"), { code: "auth/popup-closed-by-user" }),
    );

    render(LoginButton);
    await fireEvent.click(screen.getByRole("button"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sign-in popup was closed. Please try again.",
    );
  });

  it("falls back to generic message when error has no known code", async () => {
    vi.mocked(firebaseClient.signInWithPopup).mockRejectedValue(new Error("whatever"));

    render(LoginButton);
    await fireEvent.click(screen.getByRole("button"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Login failed. Please try again.");
  });
});
