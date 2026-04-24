---
feature: Firebase Infrastructure
---

# Feature: Firebase Infrastructure

## Blueprint

### Context

Shared Firebase infrastructure within the pnpm workspace, providing initialization for both server (Astro SSR / API routes) and client (Svelte CSR hydration) contexts. This is not a separately published package — it ships as part of the workspace and is consumed by domain packages (`packages/threads`, etc.) and the app (`app/pelilauta`). The server entry powers SSR data fetching and API endpoints; the client entry powers authenticated writes, real-time Firestore listeners, and auth flows in the browser.

### Architecture

- **Location:** `packages/firebase/` (workspace package, not independently published)
- **Exports:**
  - `server/` — firebase-admin initialization, `getFirestore()`, `verifyIdToken()`, admin helpers. Used by Astro frontmatter and API routes for SSR data fetching.
  - `client/` — firebase/app + firebase/firestore client SDK, `getFirestore()`, `getAuth()`. Used by Svelte components for authenticated writes, `onSnapshot()` real-time listeners, and client-side auth flows. Also re-exports `GoogleAuthProvider`, `signInWithRedirect`, `getRedirectResult`, and `onAuthStateChanged` from `firebase/auth` for auth UX islands and the `AuthHandler` reconciliation loop (see `specs/pelilauta/auth/spec.md` and `specs/pelilauta/session/spec.md`). `signInWithPopup` is intentionally **not** re-exported — see auth spec §Anti-Patterns.
  - `config` — project config (env-backed: `PUBLIC_*` for client, `SECRET_*` for admin)

#### Module Structure

```
packages/firebase/
  src/
    server/
      index.ts          → initializeApp (firebase-admin), getFirestore, getAuth
      admin.ts           → isAdmin() helper (reads meta/pelilauta doc)
      tokenToUid.ts      → verifyIdToken from Bearer header
      sessionCookie.ts   → createSessionCookie / verifySessionCookie wrappers
    client/
      index.ts          → initializeApp (firebase/app), getFirestore, getAuth; re-exports GoogleAuthProvider, signInWithRedirect, getRedirectResult, onAuthStateChanged
      toFirestoreEntry.ts → serverTimestamp() conversion for writes
    config.ts            → client-safe env var mapping (PUBLIC_* accessors). MUST NOT reference process/fs/dotenv — imported by client bundle.
    config-server.ts     → server-only env loading (dotenv) + buildServiceAccount/serverAppOptions. NEVER imported by client entry.
```

- **Dependencies:**
  - `firebase` (client SDK) — client entry point
  - `firebase-admin` — server entry point
  - `@models` — `Entry` / `ContentEntry` types for Firestore conversion helpers
- **Consumed by:** `packages/threads`, future domain packages, `app/pelilauta` pages and API routes

#### SSR Safety

- Server exports must never import client SDK modules (and vice versa)
- Package uses conditional exports (`"exports"` field in package.json) or separate entry points so bundlers tree-shake correctly
- No top-level side effects — `initializeApp` is lazy (called once, memoized)

#### Environment Variables

Env var names are inherited verbatim from pelilauta-17 so that the same dev/prod
Firebase projects can be reused across versions without re-provisioning secrets.
They intentionally do **not** follow a `PUBLIC_FIREBASE_*` / `SECRET_FIREBASE_*`
convention — the v17 contract predates that style and changing it would force
re-provisioning in Netlify and every contributor's local `.env`. Treat the list
below as authoritative; do not rename.

| Variable | Context | Purpose |
|---|---|---|
| `PUBLIC_apiKey` | Client | Firebase Web API key |
| `PUBLIC_authDomain` | Client | Auth domain |
| `PUBLIC_projectId` | Both | Project ID |
| `PUBLIC_storageBucket` | Both | Storage bucket |
| `PUBLIC_messagingSenderId` | Client | FCM sender ID |
| `PUBLIC_appId` | Client | Firebase app ID |
| `PUBLIC_measurementId` | Client | Analytics measurement ID (optional) |
| `PUBLIC_databaseURL` | Both | Realtime Database URL |
| `PUBLIC_universe_domain` | Server | Service-account universe domain — public identifier (`googleapis.com` for default Google Cloud universe), not a credential. Carries `PUBLIC_` prefix per v17 verbatim convention. |
| `SECRET_private_key_id` | Server | Service account private key ID |
| `SECRET_private_key` | Server | Service account private key |
| `SECRET_client_email` | Server | Service account email |
| `SECRET_client_id` | Server | Service account client ID |
| `SECRET_auth_uri` | Server | Service account auth URI |
| `SECRET_token_uri` | Server | Service account token URI |
| `SECRET_auth_provider_x509_cert_url` | Server | Service account auth provider cert URL |
| `SECRET_client_x509_cert_url` | Server | Service account client cert URL |
| `SECRET_e2e_seed_secret` | Server | Test-only seed route secret — MUST be unset in prod. Dev-only E2E fixture authentication. See session spec §Test-only seed route. |

A `.env.example` at the repo root documents the full set for local dev. The
v17 dev Firebase project is the canonical dev target — no emulator.

### Anti-Patterns

- Do not put domain logic (queries, schema parsing) here — this is infrastructure only
- Do not import both `server/` and `client/` in the same module — SSR will break
- Do not store Firebase config in code — use environment variables
- Do not call `initializeApp` more than once — memoize or guard with `getApps().length`

## Contract

### Definition of Done

DoD is split across two ship stages so a scaffold-only PR can land green without
having to satisfy accessor-level clauses that depend on domain packages.

#### Scaffold DoD (Stage 1 — infrastructure only)

- [ ] `packages/firebase` exists as a pnpm workspace package, picked up by `pnpm-workspace.yaml`
- [ ] `src/server/index.ts` and `src/client/index.ts` exist with `initializeApp` memoized (guarded by `getApps().length`)
- [ ] `initializeApp` / `getFirestore` / `getAuth` are exposed as lazy accessors — no unguarded top-level `initializeApp(...)` call
- [ ] `src/config.ts` centralizes env-var reads; both entries import from it
- [ ] No cross-import between server and client modules (server must not import `firebase/*`, client must not import `firebase-admin/*`)
- [ ] Any pre-existing `app/pelilauta/src/firebase/{server,client}/` directories are deleted in the same commit that adds this package
- [ ] Package passes `pnpm check`

#### Accessor DoD (Stage 2 — domain-consumable API)

- [ ] Server entry exports `verifyIdToken()` (from `src/server/tokenToUid.ts`)
- [ ] Server entry exports `isAdmin()` (from `src/server/admin.ts`)
- [ ] Server entry exports `createSessionCookie(idToken, { expiresIn })` (from `src/server/sessionCookie.ts`), wrapping `firebase-admin` `auth().createSessionCookie`
- [ ] Server entry exports `verifySessionCookie(cookie, checkRevoked?)` (from `src/server/sessionCookie.ts`), wrapping `firebase-admin` `auth().verifySessionCookie`
- [ ] Client entry exports the Firestore timestamp conversion helper (`src/client/toFirestoreEntry.ts`)
- [ ] Client entry re-exports `GoogleAuthProvider`, `signInWithRedirect`, and `getRedirectResult` from `firebase/auth` for use by auth UX islands. `signInWithPopup` is NOT re-exported.
- [ ] Client entry re-exports `onAuthStateChanged` from `firebase/auth` for use by `AuthHandler`.
- [ ] Vitest scenarios below are implemented and green

### Regression Guardrails

- Importing `@firebase/server` in a client bundle must fail at build time (or produce a clear error)
- `initializeApp` must not throw on repeated calls
- Environment variable names must match the `PUBLIC_` / `SECRET_` convention for Astro

### Testing Scenarios

#### Scenario: Server Firestore initialization

```gherkin
Given valid SECRET_* environment variables
When getFirestore() is called from the server entry
Then a Firestore instance is returned
And calling getFirestore() again returns the same instance
```

- **Vitest Unit Test:** `packages/firebase/src/server/index.test.ts`

#### Scenario: Client initialization is SSR-safe

```gherkin
Given the client entry is imported during SSR (no window/document)
When initializeApp() is called
Then it does not throw
And getFirestore() returns a valid instance
```

- **Vitest Unit Test:** `packages/firebase/src/client/index.test.ts`

#### Scenario: verifyIdToken wraps firebase-admin with checkRevoked

```gherkin
Given a valid Firebase ID token
When verifyIdToken(idToken, true) is called
Then firebase-admin auth().verifyIdToken is invoked with checkRevoked=true
And the decoded token (including uid and custom claims) is returned
```

- **Vitest Unit Test:** `packages/firebase/src/server/tokenToUid.test.ts`

#### Scenario: verifyIdToken rejects an invalid or revoked token

```gherkin
Given an expired, revoked, or malformed ID token
When verifyIdToken is called
Then the underlying firebase-admin error is surfaced to the caller
And no partial / unverified token payload is returned
```

- **Vitest Unit Test:** `packages/firebase/src/server/tokenToUid.test.ts`

#### Scenario: createSessionCookie wraps firebase-admin

```gherkin
Given a valid Firebase ID token
When createSessionCookie(idToken, { expiresIn: 5 days in ms }) is called
Then firebase-admin auth().createSessionCookie is invoked with the same arguments
And the resulting cookie string is returned to the caller
```

- **Vitest Unit Test:** `packages/firebase/src/server/sessionCookie.test.ts`

#### Scenario: verifySessionCookie returns decoded claims

```gherkin
Given a valid session cookie produced by createSessionCookie
When verifySessionCookie(cookie, true) is called
Then firebase-admin auth().verifySessionCookie is invoked with checkRevoked=true
And the decoded token (including uid and custom claims) is returned
```

- **Vitest Unit Test:** `packages/firebase/src/server/sessionCookie.test.ts`

#### Scenario: verifySessionCookie rejects an invalid cookie

```gherkin
Given an expired, revoked, or malformed session cookie
When verifySessionCookie is called
Then the underlying firebase-admin error is surfaced to the caller
And no partial / unverified token payload is returned
```

- **Vitest Unit Test:** `packages/firebase/src/server/sessionCookie.test.ts`
