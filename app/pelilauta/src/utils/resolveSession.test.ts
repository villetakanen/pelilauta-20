import * as firebaseServer from "@pelilauta/firebase/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveSessionFromCookie } from "./resolveSession";

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

describe("resolveSessionFromCookie", () => {
  it("returns anonymous when the cookie is absent", async () => {
    const result = await resolveSessionFromCookie(undefined, "test");

    expect(result).toEqual({ uid: null, claims: null });
    expect(firebaseServer.verifySessionCookie).not.toHaveBeenCalled();
    expect(firebaseServer.extractCustomClaims).not.toHaveBeenCalled();
  });

  it("treats an empty-string cookie as absent", async () => {
    const result = await resolveSessionFromCookie("", "test");

    expect(result).toEqual({ uid: null, claims: null });
    expect(firebaseServer.verifySessionCookie).not.toHaveBeenCalled();
  });

  it("verifies the cookie with checkRevoked=true and projects custom claims", async () => {
    vi.mocked(firebaseServer.verifySessionCookie).mockResolvedValue({
      uid: "user-123",
      admin: true,
      iat: 1,
      exp: 2,
    } as never);

    const result = await resolveSessionFromCookie("valid-cookie", "test");

    expect(firebaseServer.verifySessionCookie).toHaveBeenCalledWith("valid-cookie", true);
    expect(result).toEqual({ uid: "user-123", claims: { admin: true } });
  });

  it("degrades silently on auth/* errors without calling extractCustomClaims", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(firebaseServer.verifySessionCookie).mockRejectedValue(
      Object.assign(new Error("Revoked"), { code: "auth/session-cookie-revoked" }),
    );

    const result = await resolveSessionFromCookie("bad-cookie", "test");

    expect(result).toEqual({ uid: null, claims: null });
    expect(firebaseServer.extractCustomClaims).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("logs infra errors once with the supplied logPrefix and still degrades", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(firebaseServer.verifySessionCookie).mockRejectedValue(
      new Error("service account unreachable"),
    );

    const result = await resolveSessionFromCookie("cookie", "api/auth/status");

    expect(result).toEqual({ uid: null, claims: null });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]?.[0]).toContain("[api/auth/status]");

    errorSpy.mockRestore();
  });
});
