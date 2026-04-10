---
feature: Firebase Client Package
---

# Feature: Firebase Client Package

## Blueprint

### Context

Shared Firebase infrastructure package providing SSR-safe client initialization for all Pelilauta sub-apps. Ensures a single Firebase app instance is shared across the monorepo, with separate entry points for server (Astro SSR) and client (Svelte hydration) contexts.

### Architecture

- **Package:** `packages/firebase/`
- **Exports:**
  - `server/` — firebase-admin initialization, `getFirestore()`, `verifyIdToken()`, admin helpers
  - `client/` — firebase/app + firebase/firestore client SDK, `getFirestore()`, auth utilities
  - `config` — project config (env-backed: `PUBLIC_*` for client, `SECRET_*` for admin)

#### Module Structure

```
packages/firebase/
  src/
    server/
      index.ts          → initializeApp (firebase-admin), getFirestore, getAuth
      admin.ts           → isAdmin() helper (reads meta/pelilauta doc)
      tokenToUid.ts      → verifyIdToken from Bearer header
    client/
      index.ts          → initializeApp (firebase/app), getFirestore, getAuth
      toFirestoreEntry.ts → serverTimestamp() conversion for writes
    config.ts            → env var mapping (PUBLIC_projectId, etc.)
```

- **Dependencies:**
  - `firebase` (client SDK) — client entry point
  - `firebase-admin` — server entry point
  - `@models` — `Entry` / `ContentEntry` types for Firestore conversion helpers
- **Consumed by:** `packages/threads`, future domain packages, `app/pelilauta` API routes

#### SSR Safety

- Server exports must never import client SDK modules (and vice versa)
- Package uses conditional exports (`"exports"` field in package.json) or separate entry points so bundlers tree-shake correctly
- No top-level side effects — `initializeApp` is lazy (called once, memoized)

#### Environment Variables

| Variable | Context | Purpose |
|---|---|---|
| `PUBLIC_FIREBASE_API_KEY` | Client | Firebase API key |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | Client | Auth domain |
| `PUBLIC_FIREBASE_PROJECT_ID` | Both | Project ID |
| `PUBLIC_FIREBASE_STORAGE_BUCKET` | Both | Storage bucket |
| `SECRET_FIREBASE_CLIENT_EMAIL` | Server | Service account email |
| `SECRET_FIREBASE_PRIVATE_KEY` | Server | Service account private key |

### Anti-Patterns

- Do not put domain logic (queries, schema parsing) here — this is infrastructure only
- Do not import both `server/` and `client/` in the same module — SSR will break
- Do not store Firebase config in code — use environment variables
- Do not call `initializeApp` more than once — memoize or guard with `getApps().length`

## Contract

### Definition of Done

- [ ] `packages/firebase` exists as a pnpm workspace package
- [ ] Server entry exports `getFirestore()`, `getAuth()`, `verifyIdToken()`
- [ ] Client entry exports `getFirestore()`, `getAuth()`
- [ ] `initializeApp` is memoized (safe to call multiple times)
- [ ] Firestore timestamp conversion helper exported from client entry
- [ ] No cross-import between server and client modules
- [ ] Package passes `pnpm check`

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
