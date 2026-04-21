import * as firebaseServer from "@pelilauta/firebase/server";
import type { APIContext } from "astro";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "./session";

vi.mock("@pelilauta/firebase/server", () => ({
  createSessionCookie: vi.fn(),
  verifySessionCookie: vi.fn(),
  verifyIdToken: vi.fn(),
  extractCustomClaims: vi.fn((c: Record<string, unknown>) => {
    const { admin } = c;
    return { admin };
  }),
}));

type MockCookies = {
  get?: ReturnType<typeof vi.fn>;
  set?: ReturnType<typeof vi.fn>;
  delete?: ReturnType<typeof vi.fn>;
};

function makeContext(opts: { cookies?: MockCookies; body?: unknown; bodyRejects?: unknown } = {}): {
  ctx: APIContext;
  cookies: MockCookies;
  request: { json: ReturnType<typeof vi.fn> };
} {
  const request = {
    json: vi.fn(() =>
      opts.bodyRejects !== undefined
        ? Promise.reject(opts.bodyRejects)
        : Promise.resolve(opts.body ?? {}),
    ),
  };
  const cookies = opts.cookies ?? {};
  return {
    ctx: { request, cookies } as unknown as APIContext,
    cookies,
    request,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("/api/auth/session", () => {
  const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

  describe("POST (Scenario: Session cookie is set on login)", () => {
    it("verifies the ID token, mints a 5-day cookie, and returns { uid }", async () => {
      const set = vi.fn();
      const { ctx } = makeContext({
        cookies: { set },
        body: { idToken: "valid-id-token" },
      });

      vi.mocked(firebaseServer.verifyIdToken).mockResolvedValue({
        uid: "user-123",
      } as never);
      vi.mocked(firebaseServer.createSessionCookie).mockResolvedValue("mock-session-cookie");

      const response = await POST(ctx);

      expect(firebaseServer.verifyIdToken).toHaveBeenCalledWith("valid-id-token", true);
      expect(firebaseServer.createSessionCookie).toHaveBeenCalledWith("valid-id-token", {
        expiresIn: FIVE_DAYS_MS,
      });
      expect(set).toHaveBeenCalledWith(
        "session",
        "mock-session-cookie",
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          path: "/",
          sameSite: "lax",
          maxAge: FIVE_DAYS_MS / 1000,
        }),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.uid).toBe("user-123");
      expect(body.status).toBe("success");
    });

    it("returns 400 on missing idToken and does not touch cookies or firebase", async () => {
      const set = vi.fn();
      const { ctx } = makeContext({ cookies: { set }, body: {} });

      const response = await POST(ctx);

      expect(response.status).toBe(400);
      expect(set).not.toHaveBeenCalled();
      expect(firebaseServer.verifyIdToken).not.toHaveBeenCalled();
      expect(firebaseServer.createSessionCookie).not.toHaveBeenCalled();
    });

    it("returns 400 on invalid JSON body", async () => {
      const set = vi.fn();
      const { ctx } = makeContext({
        cookies: { set },
        bodyRejects: new SyntaxError("bad json"),
      });
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

      const response = await POST(ctx);

      expect(response.status).toBe(400);
      expect(set).not.toHaveBeenCalled();
      expect(firebaseServer.verifyIdToken).not.toHaveBeenCalled();
      debugSpy.mockRestore();
    });

    it("returns 401 when verifyIdToken rejects (revoked or expired)", async () => {
      const set = vi.fn();
      const { ctx } = makeContext({
        cookies: { set },
        body: { idToken: "revoked-token" },
      });
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

      vi.mocked(firebaseServer.verifyIdToken).mockRejectedValue(
        Object.assign(new Error("Revoked"), { code: "auth/id-token-revoked" }),
      );

      const response = await POST(ctx);

      expect(response.status).toBe(401);
      expect(set).not.toHaveBeenCalled();
      expect(firebaseServer.createSessionCookie).not.toHaveBeenCalled();
      debugSpy.mockRestore();
    });

    it("returns 500 and logs when createSessionCookie throws", async () => {
      const set = vi.fn();
      const { ctx } = makeContext({
        cookies: { set },
        body: { idToken: "valid-id-token" },
      });
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(firebaseServer.verifyIdToken).mockResolvedValue({
        uid: "user-123",
      } as never);
      vi.mocked(firebaseServer.createSessionCookie).mockRejectedValue(
        new Error("admin SDK exploded"),
      );

      const response = await POST(ctx);

      expect(response.status).toBe(500);
      expect(set).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0]?.[0]).toContain("[api/auth/session]");

      errorSpy.mockRestore();
    });
  });

  describe("DELETE (Scenario: Session cookie is cleared on logout)", () => {
    it("clears the session cookie and returns 204", async () => {
      const del = vi.fn();
      const { ctx } = makeContext({ cookies: { delete: del } });

      const response = await DELETE(ctx);

      expect(del).toHaveBeenCalledWith("session", { path: "/" });
      expect(response.status).toBe(204);
    });
  });

  describe("GET", () => {
    it("returns uid + custom claims on a valid cookie", async () => {
      const { ctx } = makeContext({
        cookies: { get: vi.fn(() => ({ value: "valid-cookie" })) },
      });

      vi.mocked(firebaseServer.verifySessionCookie).mockResolvedValue({
        uid: "user-123",
        admin: true,
      } as never);

      const response = await GET(ctx);
      const body = await response.json();

      expect(firebaseServer.verifySessionCookie).toHaveBeenCalledWith("valid-cookie", true);
      expect(response.status).toBe(200);
      expect(body.uid).toBe("user-123");
      expect(body.claims).toEqual({ admin: true });
    });

    it("returns { uid: null, claims: null } when no cookie is present", async () => {
      const { ctx } = makeContext({
        cookies: { get: vi.fn(() => undefined) },
      });

      const response = await GET(ctx);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.uid).toBeNull();
      expect(body.claims).toBeNull();
      expect(firebaseServer.verifySessionCookie).not.toHaveBeenCalled();
    });

    it("downgrades to null identity without logging on auth/* errors", async () => {
      const { ctx } = makeContext({
        cookies: { get: vi.fn(() => ({ value: "invalid-cookie" })) },
      });
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(firebaseServer.verifySessionCookie).mockRejectedValue(
        Object.assign(new Error("Revoked"), { code: "auth/session-cookie-revoked" }),
      );

      const response = await GET(ctx);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.uid).toBeNull();
      expect(body.claims).toBeNull();
      expect(errorSpy).not.toHaveBeenCalled();

      errorSpy.mockRestore();
    });

    it("logs unexpected infrastructure errors (non-auth/* code) while downgrading", async () => {
      const { ctx } = makeContext({
        cookies: { get: vi.fn(() => ({ value: "anything" })) },
      });
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(firebaseServer.verifySessionCookie).mockRejectedValue(
        new Error("service account misconfigured"),
      );

      const response = await GET(ctx);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.uid).toBeNull();
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0]?.[0]).toContain("[api/auth/session]");

      errorSpy.mockRestore();
    });
  });
});
