// Client-safe env-var mapping for @pelilauta/firebase.
//
// This module is imported by both client and server entries; its body MUST
// NOT reference `process`, `fs`, or other Node-only globals, and MUST NOT
// import packages (like `dotenv`) that do. Server-only env loading and the
// service-account builder live in `./config-server.ts`.
//
// Env var names are inherited verbatim from pelilauta-17 so the same dev/prod
// Firebase projects can be reused across versions without re-provisioning.
// See specs/pelilauta/firebase/spec.md §Environment Variables.

export const publicConfig = {
  get apiKey() {
    return import.meta.env.PUBLIC_apiKey;
  },
  get authDomain() {
    return import.meta.env.PUBLIC_authDomain;
  },
  get databaseURL() {
    return import.meta.env.PUBLIC_databaseURL;
  },
  get projectId() {
    return import.meta.env.PUBLIC_projectId;
  },
  get storageBucket() {
    return import.meta.env.PUBLIC_storageBucket;
  },
  get messagingSenderId() {
    return import.meta.env.PUBLIC_messagingSenderId;
  },
  get appId() {
    return import.meta.env.PUBLIC_appId;
  },
  get measurementId() {
    return import.meta.env.PUBLIC_measurementId;
  },
} as const;
