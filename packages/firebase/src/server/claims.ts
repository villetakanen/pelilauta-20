import type { DecodedIdToken } from "firebase-admin/auth";

// Reserved fields emitted by firebase-admin that are not custom claims.
// Callers that pin claims onto Astro.locals must not forward these to
// client-rendered HTML.
const FIREBASE_RESERVED = new Set([
  "iss",
  "aud",
  "auth_time",
  "user_id",
  "sub",
  "iat",
  "exp",
  "email",
  "email_verified",
  "firebase",
  "uid",
]);

export function extractCustomClaims(decoded: DecodedIdToken): Record<string, unknown> {
  return Object.fromEntries(Object.entries(decoded).filter(([k]) => !FIREBASE_RESERVED.has(k)));
}
