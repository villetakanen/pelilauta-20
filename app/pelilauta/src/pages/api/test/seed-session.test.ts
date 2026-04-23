import * as firebaseServer from "@pelilauta/firebase/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeApiContext } from "../auth/_testContext";
import { POST } from "./seed-session";

vi.mock("@pelilauta/firebase/server", () => ({
  createSessionCookie: vi.fn(),
  getAuth: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("/api/test/seed-session", () => {
  const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

  describe("Layer 1: production guard", () => {
    it("returns 404 in production mode without touching env vars or firebase", async () => {
      vi.stubEnv("DEV", false as unknown as string);
      const set = vi.fn();
      const { ctx } = makeApiContext({ cookies: { set }, body: { uid: "e2e-test-user-1" } });

      const response = await POST(ctx);

      expect(response.status).toBe(404);
      expect(set).not.toHaveBeenCalled();
      expect(firebaseServer.getAuth).not.toHaveBeenCalled();
    });
  });

  describe("Layer 2: env var presence guard", () => {
    it("returns 500 when SECRET_e2e_seed_secret is not set", async () => {
      vi.stubEnv("DEV", true as unknown as string);
      // Ensure the secret is absent
      vi.stubEnv("SECRET_e2e_seed_secret", "");
      const set = vi.fn();
      const { ctx } = makeApiContext({
        cookies: { set },
        body: { uid: "e2e-test-user-1" },
        headers: { "x-e2e-seed-secret": "anything" },
      });

      const response = await POST(ctx);

      expect(response.status).toBe(500);
      const text = await response.text();
      expect(text).toContain("not configured");
      expect(set).not.toHaveBeenCalled();
      expect(firebaseServer.getAuth).not.toHaveBeenCalled();
    });
  });

  describe("Layer 3: header match guard", () => {
    it("returns 401 when x-e2e-seed-secret header does not match", async () => {
      vi.stubEnv("DEV", true as unknown as string);
      vi.stubEnv("SECRET_e2e_seed_secret", "correct-secret");
      const set = vi.fn();
      const { ctx } = makeApiContext({
        cookies: { set },
        body: { uid: "e2e-test-user-1" },
        headers: { "x-e2e-seed-secret": "wrong-secret" },
      });

      const response = await POST(ctx);

      expect(response.status).toBe(401);
      expect(set).not.toHaveBeenCalled();
      expect(firebaseServer.getAuth).not.toHaveBeenCalled();
    });
  });

  describe("Happy path", () => {
    beforeEach(() => {
      vi.stubEnv("DEV", true as unknown as string);
      vi.stubEnv("SECRET_e2e_seed_secret", "correct-secret");
      vi.stubEnv("PUBLIC_apiKey", "test-api-key");
    });

    it("returns 200 with session cookie when all guards pass", async () => {
      const set = vi.fn();
      const { ctx } = makeApiContext({
        cookies: { set },
        body: { uid: "e2e-test-user-1", claims: { nick: "TestUser" } },
        headers: { "x-e2e-seed-secret": "correct-secret" },
      });

      const mockAdminAuth = {
        createCustomToken: vi.fn().mockResolvedValue("mock-custom-token"),
      };
      vi.mocked(firebaseServer.getAuth).mockReturnValue(mockAdminAuth as never);

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({ idToken: "mock-id-token" }),
        }),
      );

      vi.mocked(firebaseServer.createSessionCookie).mockResolvedValue("mock-session-cookie");

      const response = await POST(ctx);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.uid).toBe("e2e-test-user-1");

      expect(mockAdminAuth.createCustomToken).toHaveBeenCalledWith("e2e-test-user-1", {
        nick: "TestUser",
      });

      expect(firebaseServer.createSessionCookie).toHaveBeenCalledWith("mock-id-token", {
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
    });
  });
});
