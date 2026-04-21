// Firebase Admin SDK initialization for SSR / API routes.
//
// Service-account credentials come from SECRET_* env vars; project-level
// config from PUBLIC_*. Init is lazy and memoized: importing this module has
// no side effects, env vars are only read on the first accessor call.
// See specs/pelilauta/firebase/spec.md §SSR Safety and §Scaffold DoD.

export { getApp, getAuth, getDb } from "./app";

export { extractCustomClaims } from "./claims";
export {
  createSessionCookie,
  type SessionCookieOptions,
  verifySessionCookie,
} from "./sessionCookie";
export { verifyIdToken } from "./tokenToUid";
