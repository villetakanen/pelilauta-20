import type { DecodedIdToken } from "firebase-admin/auth";
import { describe, expect, it } from "vitest";
import { extractCustomClaims } from "./claims";

describe("extractCustomClaims", () => {
  it("strips firebase-admin reserved fields", () => {
    const decoded = {
      iss: "https://securetoken.google.com/proj",
      aud: "proj",
      auth_time: 1234,
      user_id: "u",
      sub: "u",
      iat: 1234,
      exp: 5678,
      email: "a@b.c",
      email_verified: true,
      firebase: { sign_in_provider: "google.com" },
      uid: "u",
      admin: true,
      eula_accepted: "2024-01-01",
    } as unknown as DecodedIdToken;

    expect(extractCustomClaims(decoded)).toEqual({
      admin: true,
      eula_accepted: "2024-01-01",
    });
  });

  it("returns an empty object when no custom claims are present", () => {
    const decoded = {
      iss: "x",
      aud: "x",
      auth_time: 0,
      user_id: "u",
      sub: "u",
      iat: 0,
      exp: 0,
      uid: "u",
      firebase: { sign_in_provider: "password" },
    } as unknown as DecodedIdToken;

    expect(extractCustomClaims(decoded)).toEqual({});
  });
});
