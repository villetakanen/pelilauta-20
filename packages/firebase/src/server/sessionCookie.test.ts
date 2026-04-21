// Scenario: createSessionCookie and verifySessionCookie wraps firebase-admin (specs/pelilauta/firebase/spec.md)

import { describe, expect, it, vi } from "vitest";

const mockCreateSessionCookie = vi.fn();
const mockVerifySessionCookie = vi.fn();

vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn(() => ({
    createSessionCookie: mockCreateSessionCookie,
    verifySessionCookie: mockVerifySessionCookie,
  })),
}));

vi.mock("./index", () => ({
  getApp: vi.fn(() => ({ name: "[DEFAULT]" })),
}));

import { createSessionCookie, verifySessionCookie } from "./sessionCookie";

describe("sessionCookie accessors", () => {
  const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

  it("wraps firebase-admin createSessionCookie (wrap-create scenario)", async () => {
    mockCreateSessionCookie.mockResolvedValue("mock-cookie");

    const result = await createSessionCookie("id-token", { expiresIn: FIVE_DAYS_MS });

    expect(mockCreateSessionCookie).toHaveBeenCalledWith("id-token", { expiresIn: FIVE_DAYS_MS });
    expect(result).toBe("mock-cookie");
  });

  it("wraps firebase-admin verifySessionCookie (wrap-verify scenario)", async () => {
    const mockClaims = { uid: "user-123", email: "test@example.com" };
    mockVerifySessionCookie.mockResolvedValue(mockClaims);

    const result = await verifySessionCookie("session-cookie", true);

    expect(mockVerifySessionCookie).toHaveBeenCalledWith("session-cookie", true);
    expect(result).toBe(mockClaims);
  });

  it("defaults checkRevoked to true", async () => {
    mockVerifySessionCookie.mockResolvedValue({ uid: "u" });

    await verifySessionCookie("session-cookie");

    expect(mockVerifySessionCookie).toHaveBeenCalledWith("session-cookie", true);
  });

  it("surfaces firebase-admin errors (reject-invalid scenario)", async () => {
    const mockError = new Error("Auth error");
    mockVerifySessionCookie.mockRejectedValue(mockError);

    await expect(verifySessionCookie("invalid-cookie")).rejects.toThrow("Auth error");
  });
});
