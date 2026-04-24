// Scenario: verifyIdToken wraps firebase-admin (specs/pelilauta/firebase/spec.md)

import { describe, expect, it, vi } from "vitest";

const mockVerifyIdToken = vi.fn();

vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

vi.mock("./app", () => ({
  getApp: vi.fn(() => ({ name: "[DEFAULT]" })),
}));

import { verifyIdToken } from "./tokenToUid";

describe("verifyIdToken accessor", () => {
  it("wraps firebase-admin verifyIdToken with checkRevoked=true (wrap-verify scenario)", async () => {
    const claims = { uid: "user-123", admin: true };
    mockVerifyIdToken.mockResolvedValue(claims);

    const result = await verifyIdToken("id-token", true);

    expect(mockVerifyIdToken).toHaveBeenCalledWith("id-token", true);
    expect(result).toBe(claims);
  });

  it("defaults checkRevoked to true", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "u" });

    await verifyIdToken("id-token");

    expect(mockVerifyIdToken).toHaveBeenCalledWith("id-token", true);
  });

  it("surfaces firebase-admin errors unchanged (reject-invalid scenario)", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("Token revoked"));

    await expect(verifyIdToken("bad-token")).rejects.toThrow("Token revoked");
  });
});
