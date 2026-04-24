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
- **`firebase-admin` MUST stay external in the SSR bundle.** Three coupled pieces keep this working on Netlify Functions:
  1. `app/pelilauta/astro.config.mjs` marks `firebase-admin` + subpath entries (`firebase-admin/app`, `firebase-admin/auth`, `firebase-admin/firestore`) in `vite.ssr.external`. Keeps the package out of the Vite SSR chunk, avoiding the `ReferenceError: __dirname is not defined in ES module scope` crash from grpc-js's CommonJS `__dirname` read.
  2. `app/pelilauta/netlify.toml` `[functions.ssr] external_node_modules = ["firebase-admin"]` tells Netlify's function bundler to deploy firebase-admin alongside the function so `require('firebase-admin')` resolves at runtime.
  3. `.npmrc` sets `shamefully-hoist=true`. pnpm's default isolated `node_modules/` layout (symlinks into `.pnpm/`) isn't followed reliably by Netlify's zip-it-and-ship-it bundler; hoisting public deps to the top-level `node_modules/` gives zisi an npm-flat structure it can resolve. The `.pnpm/` content-addressable store is preserved — this just adds public-hoisted copies.
  Removing any one layer breaks the deploy — either at build time (Vite crash), at cold start (package-not-found), or at first Firestore call (dirname crash). All three are load-bearing.
- **Firebase Auth redirect handler MUST be proxied through the app's own origin in production.** Without this, `signInWithRedirect` succeeds at Google, returns to `<project>.firebaseapp.com`, and the iframe postMessage handshake back to the app is blocked by browser cross-site storage partitioning — `getRedirectResult` returns null AND `auth.currentUser` is also null, with no visible error. Localhost is exempt; real deploys on separate eTLD+1 origins are not. The fix has two coupled parts:
  1. The hosting target (Netlify) proxies `/__/auth/*` to `https://<project>.firebaseapp.com/__/auth/*` via a `status = 200, force = true` redirect rule in `netlify.toml`. OAuth returns now land on the app's own origin.
  2. `PUBLIC_authDomain` is set to the **app's hostname** (e.g. `pelilauta-social-next.netlify.app` or `pelilauta.social`), not the default `<project>.firebaseapp.com`. Firebase's client SDK sends the OAuth redirect to whatever `authDomain` says; with the proxy rule in place, that redirect resolves on the app origin, the handshake is first-party, and auth state propagates. Removing either half reintroduces the silent-login failure. Reference: [Firebase redirect best practices](https://firebase.google.com/docs/auth/web/redirect-best-practices).

#### Environment Variables

Env var names are inherited from pelilauta-17 to preserve Firebase project reuse across versions, with **one deliberate divergence**: v17 mislabeled several public-valued fields with the `SECRET_` prefix (`SECRET_auth_uri`, `SECRET_token_uri`, `SECRET_auth_provider_x509_cert_url`, and `SECRET_universe_domain`). v20 corrects these to `PUBLIC_` because in v20 the `SECRET_` prefix is a **strict sensitivity classification**, not a naming artifact: any `SECRET_*` value surfacing in the published build output is a build failure, enforced by Netlify's secrets scanner. Mislabeling a public URL as `SECRET_` would either force a false-positive bypass (weakening the scanner's guarantee) or fail the build for a non-leak.

**Classification rule:**
- `PUBLIC_*` — value is safe to inline into the client bundle. Read via `import.meta.env.PUBLIC_*`.
- `SECRET_*` — value MUST NOT appear in any published artifact (client bundle, SSR function source, static assets). Read via `process.env.SECRET_*` only, which stays dynamic at build time. Compromise here is a deploy failure, not a runtime concern.

`SECRET_client_x509_cert_url` retains the `SECRET_` prefix because its value contains the service-account email — the same identifier as `SECRET_client_email`. Classification matches the underlying identity it exposes.

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
| `PUBLIC_universe_domain` | Server | Service-account universe domain — invariant public value (`googleapis.com` for default Google Cloud universe). v20 correction of v17's `SECRET_` mislabeling. |
| `PUBLIC_auth_uri` | Server | Service-account auth URI — invariant public Google endpoint (`https://accounts.google.com/o/oauth2/auth`). v20 correction of v17's `SECRET_` mislabeling. |
| `PUBLIC_token_uri` | Server | Service-account token URI — invariant public Google endpoint (`https://oauth2.googleapis.com/token`). v20 correction of v17's `SECRET_` mislabeling. |
| `PUBLIC_auth_provider_x509_cert_url` | Server | Service-account auth provider cert URL — invariant public Google cert endpoint (`https://www.googleapis.com/oauth2/v1/certs`). v20 correction of v17's `SECRET_` mislabeling. |
| `SECRET_private_key_id` | Server | Service account private key ID. |
| `SECRET_private_key` | Server | Service account private key. |
| `SECRET_client_email` | Server | Service account email — identifies the service account, semi-sensitive. |
| `SECRET_client_id` | Server | Service account client ID. |
| `SECRET_client_x509_cert_url` | Server | Service-account client cert URL — contains the service-account email; classified `SECRET_` to match `SECRET_client_email`. |
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

- Importing `@firebase/server` in a client bundle must fail at build time (or produce a clear error).
- `initializeApp` must not throw on repeated calls.
- Environment variable names must match the `PUBLIC_` / `SECRET_` convention for Astro.
- **Any `SECRET_*` env-var value appearing in the published build output (client bundle, SSR function source, static assets) MUST fail the Netlify deploy.** Enforced by Netlify's secrets scanner. `SECRETS_SCAN_OMIT_KEYS` in any `netlify.toml` MAY list `PUBLIC_*` vars (Netlify sometimes flags them by UI convention) but MUST NOT list any `SECRET_*` var — doing so removes the enforcement this guardrail depends on.

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
