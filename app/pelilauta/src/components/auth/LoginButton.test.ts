import * as firebaseClient from "@pelilauta/firebase/client";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import LoginButton from "./LoginButton.svelte";

vi.mock("@pelilauta/firebase/client", () => ({
  getAuth: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(),
}));

vi.mock("@pelilauta/utils/log", () => ({
  logError: vi.fn(),
  logDebug: vi.fn(),
}));

const NEXT_KEY = "pelilauta.auth.next";

describe("LoginButton.svelte", () => {
  const mockIdToken = "mock-id-token";
  const mockUser = {
    getIdToken: vi.fn(() => Promise.resolve(mockIdToken)),
  };
  const mockResult = { user: mockUser };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("location", { ...window.location, assign: vi.fn() });

    // Mock Auth instance with a currentUser field — the component consults
    // auth.currentUser as a fallback when getRedirectResult returns null.
    vi.mocked(firebaseClient.getAuth).mockReturnValue({ currentUser: null } as ReturnType<
      typeof firebaseClient.getAuth
    >);

    // Default: first visit — no redirect result pending
    vi.mocked(firebaseClient.getRedirectResult).mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("Scenario: LoginButton click snapshots next and calls signInWithRedirect", async () => {
    vi.mocked(firebaseClient.getRedirectResult).mockResolvedValue(null);
    vi.mocked(firebaseClient.signInWithRedirect as Mock).mockResolvedValue(undefined);

    render(LoginButton, { next: "/threads" });

    // Wait for onMount getRedirectResult(null) to settle so button is enabled
    await waitFor(() => expect(firebaseClient.getRedirectResult).toHaveBeenCalled());

    await fireEvent.click(screen.getByRole("button"));

    expect(sessionStorage.getItem(NEXT_KEY)).toBe("/threads");
    expect(firebaseClient.signInWithRedirect).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("Scenario: LoginButton completes handshake on return from redirect", async () => {
    sessionStorage.setItem(NEXT_KEY, "/threads");
    vi.mocked(firebaseClient.getRedirectResult).mockResolvedValue(
      mockResult as unknown as Awaited<ReturnType<typeof firebaseClient.getRedirectResult>>,
    );
    vi.mocked(fetch as Mock).mockResolvedValue({ ok: true });

    render(LoginButton, { next: "/" });

    await waitFor(() => expect(mockUser.getIdToken).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/session",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ idToken: mockIdToken }),
      }),
    );
    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith("/threads"));
    expect(sessionStorage.getItem(NEXT_KEY)).toBeNull();
  });

  it("Scenario: LoginButton surfaces redirect errors inline on return", async () => {
    const testCases = [
      {
        code: "auth/network-request-failed",
        message: "Network error. Please check your connection.",
      },
      {
        code: "auth/account-exists-with-different-credential",
        message: "An account already exists with the same email using a different sign-in method.",
      },
      {
        code: "auth/unknown-code",
        message: "Login failed. Please try again.",
      },
    ];

    for (const { code, message } of testCases) {
      sessionStorage.setItem(NEXT_KEY, "/threads");
      vi.mocked(firebaseClient.getRedirectResult).mockRejectedValue(
        Object.assign(new Error("redirect error"), { code }),
      );

      const { unmount } = render(LoginButton);

      expect(await screen.findByRole("alert")).toHaveTextContent(message);
      expect(screen.getByRole("button")).not.toBeDisabled();
      expect(window.location.assign).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(NEXT_KEY)).toBeNull();

      unmount();
      vi.clearAllMocks();
      vi.mocked(fetch as Mock).mockReset();
    }
  });

  it("Scenario: LoginButton surfaces server-POST errors inline on return", async () => {
    sessionStorage.setItem(NEXT_KEY, "/threads");
    vi.mocked(firebaseClient.getRedirectResult).mockResolvedValue(
      mockResult as unknown as Awaited<ReturnType<typeof firebaseClient.getRedirectResult>>,
    );
    vi.mocked(fetch as Mock).mockResolvedValue({ ok: false });

    render(LoginButton);

    expect(await screen.findByRole("alert")).toHaveTextContent("Login failed. Please try again.");
    expect(screen.getByRole("button")).not.toBeDisabled();
    expect(window.location.assign).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(NEXT_KEY)).toBeNull();
  });

  it("Scenario: LoginButton clears stale NEXT_KEY on null result", async () => {
    sessionStorage.setItem(NEXT_KEY, "/stale-from-aborted-flow");
    vi.mocked(firebaseClient.getRedirectResult).mockResolvedValue(null);

    render(LoginButton);

    await waitFor(() => expect(firebaseClient.getRedirectResult).toHaveBeenCalled());
    expect(sessionStorage.getItem(NEXT_KEY)).toBeNull();
    expect(window.location.assign).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("Scenario: LoginButton renders completing state on mount when NEXT_KEY is present", async () => {
    sessionStorage.setItem(NEXT_KEY, "/threads");
    let resolveGetResult: ((v: null) => void) | undefined;
    const pending = new Promise<null>((resolve) => {
      resolveGetResult = resolve;
    });
    vi.mocked(firebaseClient.getRedirectResult).mockReturnValue(
      pending as unknown as ReturnType<typeof firebaseClient.getRedirectResult>,
    );

    render(LoginButton);

    // Before getRedirectResult resolves, the completing state is visible and the CTA is not.
    expect(await screen.findByRole("status")).toHaveTextContent("Completing sign-in...");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    // Resolving null drops to the CTA and clears the stale key.
    resolveGetResult?.(null);
    await waitFor(() => expect(sessionStorage.getItem(NEXT_KEY)).toBeNull());
    await waitFor(() => expect(screen.getByRole("button")).toBeInTheDocument());
  });

  it("Scenario: LoginButton completes handshake via auth.currentUser when getRedirectResult returns null", async () => {
    // Guards against a regression where the mount-phase handshake breaks on
    // Chromium browsers. Firebase's getRedirectResult sometimes returns null
    // even though it successfully processed the incoming OAuth response as a
    // side effect — auth.currentUser is populated, but the return value is
    // null. When sessionStorage says we initiated a redirect, auth.currentUser
    // is the authoritative source.
    sessionStorage.setItem(NEXT_KEY, "/threads");
    vi.mocked(firebaseClient.getRedirectResult).mockResolvedValue(null);
    vi.mocked(firebaseClient.getAuth).mockReturnValue({
      currentUser: mockUser,
    } as unknown as ReturnType<typeof firebaseClient.getAuth>);
    vi.mocked(fetch as Mock).mockResolvedValue({ ok: true });

    render(LoginButton);

    await waitFor(() => expect(mockUser.getIdToken).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/session",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ idToken: mockIdToken }),
      }),
    );
    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith("/threads"));
    expect(sessionStorage.getItem(NEXT_KEY)).toBeNull();
  });

  it("Scenario: LoginButton discards unsafe next values at both edges", async () => {
    // Outbound: unsafe prop value is sanitized before writing to sessionStorage
    vi.mocked(firebaseClient.getRedirectResult).mockResolvedValue(null);
    vi.mocked(firebaseClient.signInWithRedirect as Mock).mockResolvedValue(undefined);

    render(LoginButton, { next: "http://evil.example.com" });
    await waitFor(() => expect(firebaseClient.getRedirectResult).toHaveBeenCalled());

    await fireEvent.click(screen.getByRole("button"));

    expect(sessionStorage.getItem(NEXT_KEY)).toBe("/");

    cleanup();
    sessionStorage.clear();
    vi.clearAllMocks();

    // Return: tampered sessionStorage value is sanitized before navigation
    sessionStorage.setItem(NEXT_KEY, "javascript:alert(1)");
    vi.mocked(firebaseClient.getRedirectResult).mockResolvedValue(
      mockResult as unknown as Awaited<ReturnType<typeof firebaseClient.getRedirectResult>>,
    );
    vi.mocked(fetch as Mock).mockResolvedValue({ ok: true });

    render(LoginButton);

    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith("/"));
  });
});
