import * as firebaseServer from "@pelilauta/firebase/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cookiesWithValue, makeApiContext } from "./_testContext";
import { POST } from "./custom-token";

const createCustomToken = vi.fn();

vi.mock("@pelilauta/firebase/server", () => ({
  verifySessionCookie: vi.fn(),
  extractCustomClaims: vi.fn(() => ({})),
  getAuth: vi.fn(() => ({ createCustomToken })),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("/api/auth/custom-token", () => {
  it("Scenario: Custom-token endpoint mints for a valid cookie", async () => {
    // Verifies: specs/pelilauta/session/state-machine.md §Custom-token endpoint mints for a valid cookie
    const { ctx } = makeApiContext({ cookies: cookiesWithValue("valid-cookie") });

    vi.mocked(firebaseServer.verifySessionCookie).mockResolvedValue({ uid: "u1" } as never);
    createCustomToken.mockResolvedValue("minted-token");

    const response = await POST(ctx);
    const body = await response.json();

    expect(createCustomToken).toHaveBeenCalledWith("u1");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toEqual({ token: "minted-token" });
  });

  it("Scenario: Custom-token endpoint rejects a missing cookie", async () => {
    // Verifies: specs/pelilauta/session/state-machine.md §Custom-token endpoint rejects a missing or invalid cookie
    const { ctx } = makeApiContext({ cookies: cookiesWithValue(undefined) });

    const response = await POST(ctx);

    expect(response.status).toBe(401);
    expect(createCustomToken).not.toHaveBeenCalled();
  });

  it("Scenario: Custom-token endpoint rejects an invalid cookie", async () => {
    // Verifies: specs/pelilauta/session/state-machine.md §Custom-token endpoint rejects a missing or invalid cookie
    const { ctx } = makeApiContext({ cookies: cookiesWithValue("expired-cookie") });

    vi.mocked(firebaseServer.verifySessionCookie).mockRejectedValue(
      Object.assign(new Error("expired"), { code: "auth/session-cookie-expired" }),
    );

    const response = await POST(ctx);

    expect(response.status).toBe(401);
    expect(createCustomToken).not.toHaveBeenCalled();
  });

  it("returns 500 when minting fails", async () => {
    const { ctx } = makeApiContext({ cookies: cookiesWithValue("valid-cookie") });

    vi.mocked(firebaseServer.verifySessionCookie).mockResolvedValue({ uid: "u1" } as never);
    createCustomToken.mockRejectedValue(new Error("admin unavailable"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(ctx);

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
