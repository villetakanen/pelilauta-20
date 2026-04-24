import { getAuth } from "@pelilauta/firebase/client";
import { logError } from "@pelilauta/utils/log";
import type { Auth } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { logout } from "../stores/session";
import { AuthedFetchError, authedFetch } from "./authedFetch";

vi.mock("@pelilauta/firebase/client", () => ({
  getAuth: vi.fn(),
}));

vi.mock("@pelilauta/utils/log", () => ({
  logError: vi.fn(),
}));

vi.mock("../stores/session", () => ({
  logout: vi.fn(),
}));

function mockAuth(currentUser: { getIdToken: Mock } | null): Auth {
  return { currentUser } as unknown as Auth;
}

describe("authedFetch", () => {
  let mockFetch: Mock;
  let mockGetIdToken: Mock;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    mockGetIdToken = vi.fn();
    vi.mocked(getAuth).mockReturnValue(mockAuth({ getIdToken: mockGetIdToken }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("Scenario: authedFetch attaches the Bearer token on the happy path", async () => {
    mockGetIdToken.mockResolvedValue("mock-token");
    mockFetch.mockResolvedValue(new Response("OK", { status: 200 }));

    const res = await authedFetch("https://api.example.com/test");

    expect(mockGetIdToken).toHaveBeenCalledTimes(1);
    expect(mockGetIdToken).toHaveBeenCalledWith(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.get("Authorization")).toBe("Bearer mock-token");
    expect(res.status).toBe(200);
    expect(logout).not.toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();
  });

  it("Scenario: authedFetch rejects and logs out when currentUser is null at entry", async () => {
    vi.mocked(getAuth).mockReturnValue(mockAuth(null));

    await expect(authedFetch("https://api.example.com/test")).rejects.toThrow(AuthedFetchError);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(logout).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logError).mock.calls[0]?.[0]).toContain("[authedFetch]");
  });

  it("Scenario: authedFetch rejects and logs out when the initial getIdToken throws", async () => {
    mockGetIdToken.mockRejectedValue(
      Object.assign(new Error("sdk boom"), { code: "auth/network-request-failed" }),
    );

    await expect(authedFetch("https://api.example.com/test")).rejects.toThrow(AuthedFetchError);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(logout).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logError).mock.calls[0]?.[0]).toContain("[authedFetch]");
  });

  it("Scenario: authedFetch retries once on 401", async () => {
    mockGetIdToken.mockImplementation(async (force?: boolean) =>
      force ? "refreshed-token" : "initial-token",
    );
    mockFetch
      .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))
      .mockResolvedValueOnce(new Response("OK", { status: 200 }));

    const res = await authedFetch("https://api.example.com/test");

    expect(mockGetIdToken).toHaveBeenCalledTimes(2);
    expect(mockGetIdToken).toHaveBeenNthCalledWith(1, false);
    expect(mockGetIdToken).toHaveBeenNthCalledWith(2, true);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const [, init1] = mockFetch.mock.calls[0];
    expect(init1.headers.get("Authorization")).toBe("Bearer initial-token");
    const [, init2] = mockFetch.mock.calls[1];
    expect(init2.headers.get("Authorization")).toBe("Bearer refreshed-token");

    expect(res.status).toBe(200);
    expect(logout).not.toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();
  });

  it("Scenario: authedFetch rejects and logs out when the refresh getIdToken throws", async () => {
    mockGetIdToken
      .mockResolvedValueOnce("initial-token")
      .mockRejectedValueOnce(new Error("refresh boom"));
    mockFetch.mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    await expect(authedFetch("https://api.example.com/test")).rejects.toThrow(AuthedFetchError);

    expect(mockGetIdToken).toHaveBeenCalledTimes(2);
    expect(mockGetIdToken).toHaveBeenNthCalledWith(2, true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logError).mock.calls[0]?.[0]).toContain("[authedFetch]");
  });

  it("Scenario: authedFetch gives up after one repair attempt", async () => {
    mockGetIdToken.mockImplementation(async (force?: boolean) =>
      force ? "refreshed-token" : "initial-token",
    );
    mockFetch.mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    await expect(authedFetch("https://api.example.com/test")).rejects.toThrow(AuthedFetchError);

    expect(mockGetIdToken).toHaveBeenCalledTimes(2);
    expect(mockGetIdToken).toHaveBeenNthCalledWith(2, true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(logout).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logError).mock.calls[0]?.[0]).toContain("[authedFetch]");
  });
});
