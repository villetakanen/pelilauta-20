import * as firebaseServer from "@pelilauta/firebase/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cookiesWithValue, makeApiContext } from "./_testContext";
import { GET } from "./status";

vi.mock("@pelilauta/firebase/server", () => ({
  verifySessionCookie: vi.fn(),
  extractCustomClaims: vi.fn((c: Record<string, unknown>) => {
    const { admin } = c;
    return { admin };
  }),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("/api/auth/status", () => {
  it("Scenario: Status oracle reports loggedIn=true with uid and custom claims", async () => {
    const { ctx } = makeApiContext({ cookies: cookiesWithValue("valid-cookie") });

    vi.mocked(firebaseServer.verifySessionCookie).mockResolvedValue({
      uid: "oracle-123",
      admin: true,
      iat: 123,
    } as never);

    const response = await GET(ctx);
    const body = await response.json();

    expect(firebaseServer.verifySessionCookie).toHaveBeenCalledWith("valid-cookie", true);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toEqual({ loggedIn: true, uid: "oracle-123", claims: { admin: true } });
  });

  it("Scenario: Status oracle reports loggedIn=false for a missing cookie", async () => {
    const { ctx } = makeApiContext({ cookies: cookiesWithValue() });

    const response = await GET(ctx);
    const body = await response.json();

    expect(firebaseServer.verifySessionCookie).not.toHaveBeenCalled();
    expect(firebaseServer.extractCustomClaims).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toEqual({ loggedIn: false, uid: null, claims: null });
  });

  it("treats an empty-string cookie as absent", async () => {
    const { ctx } = makeApiContext({ cookies: cookiesWithValue("") });

    const response = await GET(ctx);
    const body = await response.json();

    expect(firebaseServer.verifySessionCookie).not.toHaveBeenCalled();
    expect(body.loggedIn).toBe(false);
  });

  it("Scenario: Status oracle degrades silently on auth/* verification errors", async () => {
    const { ctx } = makeApiContext({ cookies: cookiesWithValue("invalid-cookie") });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(firebaseServer.verifySessionCookie).mockRejectedValue(
      Object.assign(new Error("Revoked"), { code: "auth/session-cookie-revoked" }),
    );

    const response = await GET(ctx);
    const body = await response.json();

    expect(firebaseServer.verifySessionCookie).toHaveBeenCalledWith("invalid-cookie", true);
    expect(firebaseServer.extractCustomClaims).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toEqual({ loggedIn: false, uid: null, claims: null });
    expect(errorSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("Scenario: Status oracle logs infrastructure errors while degrading", async () => {
    const { ctx } = makeApiContext({ cookies: cookiesWithValue("some-cookie") });
    vi.mocked(firebaseServer.verifySessionCookie).mockRejectedValue(new Error("Network Error"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(ctx);
    const body = await response.json();

    expect(firebaseServer.extractCustomClaims).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toEqual({ loggedIn: false, uid: null, claims: null });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]?.[0]).toContain("[api/auth/status]");

    errorSpy.mockRestore();
  });
});
