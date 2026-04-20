---
feature: Session
parent_spec: ../spec.md
---

# Feature: Session

## Blueprint

### Context

Session is the identity seam between three independent auth surfaces: the HTTP-only session cookie that powers SSR identity resolution, the Bearer token that powers API-mediated writes, and the Firebase client SDK that powers CSR state and real-time subscriptions. It owns the lifecycle (`initial → loading → active → error`), the cookie contract, the token-repair invariant, and the small reactive store that authenticated CSR islands read from. It does **not** own login UX (see [`../auth/spec.md`](../auth/spec.md)), onboarding / claim gating, or per-feature authorization (those live with Firestore rules and API-route specs).

The session boundary exists once; every other feature composes against it.

### Architecture

- **Host components** (`app/pelilauta/src/`):
  - `middleware.ts` — SSR-side cookie verification. Populates `Astro.locals.uid` and `Astro.locals.sessionState`. Does **not** gate page access.
  - `stores/session.ts` — nanostore atoms (`sessionState`, `uid`, `profile`). CSR-only. No `localStorage` persistence.
  - `components/auth/AuthHandler.svelte` — CSR island rendered only when SSR determined the session is active. Owns `onAuthStateChanged`, token-refresh lifecycle, and logout fan-out.
  - `utils/authedFetch.ts` — single entry point for API writes. Attaches `Authorization: Bearer <idToken>`, intercepts `401`, performs one-shot token repair.
  - `pages/api/auth/session.ts` — `POST` (login: verify ID token, set cookie), `DELETE` (logout: clear cookie), `GET` (verify cookie, return `{ uid, claims }`).
  - `pages/api/auth/status.ts` — oracle endpoint. Verifies cookie, reads Firestore for claim backfill, returns authoritative `{ loggedIn, uid, claims }`. Used by client to resolve stale-token races.

- **Data models:**
  - `SessionState = 'initial' | 'loading' | 'active' | 'error'`
  - `SessionContext = { uid: string; claims: Record<string, unknown> } | null` — the value populated on `Astro.locals` by middleware.
  - `profile` shape: reuses the minimal public-facing projection needed by `ProfileButton` (`nick`, `avatarURL`). Full `Profile` schema lives in its own feature spec; session only surfaces the fields consumed by chrome.

- **API contracts:**
  - **Cookie** (SSR identity): name `session`, `httpOnly: true`, `secure: true`, `sameSite: 'Lax'`, `path: '/'`, `maxAge: 5 days`. Set via `firebase-admin` `createSessionCookie(idToken, { expiresIn })`. Verified via `verifySessionCookie(cookie, /* checkRevoked */ true)`.
  - **Bearer** (API writes): `Authorization: Bearer <firebase_id_token>` on every mutating API request. Verified via `verifyIdToken()` from [`@pelilauta/firebase/server`](../firebase/spec.md). The session cookie is **irrelevant** to API calls — they stand alone on the bearer token.
  - **Session store consumers** read atoms via nanostore subscriptions. They do **not** write atoms directly — only `AuthHandler` and `logout()` mutate session state.

- **Dependencies:**
  - [`@pelilauta/firebase/server`](../firebase/spec.md) — `verifyIdToken`, `createSessionCookie`, `verifySessionCookie`, admin Firestore for claim reads in the oracle.
  - [`@pelilauta/firebase/client`](../firebase/spec.md) — `getAuth()`, `onAuthStateChanged`, `signInWithPopup`, `user.getIdToken(force)`.
  - Consumed by: [`auth/`](../auth/spec.md) (login flow), [`ProfileButton`](../../cyan-ds/components/profile-button/spec.md) (reads `uid` + `profile` via app-layer props), every future write-capable feature (via `authedFetch`).

- **Constraints:**
  - **Anonymous surfaces ship zero CSR for auth.** If `Astro.locals.uid` is null at SSR time, no session store, no `AuthHandler`, no Firebase client SDK bundle is mounted. This is load-bearing for SEO performance and non-negotiable.
  - **Session cookie is never readable by client JS.** `httpOnly: true` is a regression guardrail. The client reconstructs session knowledge exclusively via `onAuthStateChanged` + `getIdToken()`.
  - **Writes default to API routes.** The authorization model for writes lives in TypeScript inside Astro API routes, not Firestore security rules. Rules express read access; `allow write: if false` is the default, with narrow named carve-outs documented per feature.
  - **No Firebase Cloud Functions.** Server-side logic lives in Astro API routes. See project memory; this is a hard constraint.
  - **No `localStorage` persistence of `uid` or `profile`.** SSR paints the authenticated shell from the verified cookie, so there is no rehydration-from-local-storage scenario to paper over. This eliminates v17's "optimistic UID" divergence class of bugs.

### Authentication Flow

1. **Login** (see [`auth/spec.md`](../auth/spec.md) for UX):
   - Client completes Firebase popup → receives `User`.
   - Client calls `user.getIdToken()` → `POST /api/auth/session` with the token.
   - Server `verifyIdToken(token)`, then `createSessionCookie(token, { expiresIn: 5d })`, sets the cookie on the response.
   - Client triggers a **full page reload** to the target route. This is deliberate — the reload flips the page from anonymous-SSR to authenticated-SSR, mounting `AuthHandler` and the session store only from this point forward.

2. **Subsequent SSR requests:**
   - Middleware reads `Astro.request.cookies.get('session')`.
   - If valid, calls `verifySessionCookie(cookie, true)` → populates `Astro.locals.uid`, `Astro.locals.claims`, `Astro.locals.sessionState = 'active'`.
   - If invalid or absent → `Astro.locals.sessionState = 'initial'`, `uid = null`.
   - Middleware **does not redirect**. Page/layout composition decides whether to render the anonymous or authenticated shell.

3. **CSR hydration (authenticated surfaces only):**
   - `AuthHandler` mounts client-side, subscribes to `onAuthStateChanged`.
   - If the client-side Firebase session matches the server's `uid`, session store transitions `initial → active` immediately.
   - If the client-side session is absent or stale, `AuthHandler` invokes `GET /api/auth/status` to reconcile; if the server says "logged in" but the client disagrees, forces a token refresh via `user.getIdToken(true)`.
   - If reconciliation fails, triggers `logout()`.

4. **Write request (API-mediated):**
   - Feature calls `authedFetch('/api/threads', { method: 'POST', body })`.
   - `authedFetch` awaits `auth.currentUser.getIdToken()`, attaches the Bearer header, issues the request.
   - On `401`: exactly one retry with `user.getIdToken(true)` (force refresh). On repeated failure, calls `logout()` and rejects.
   - No silent failures, no multi-step repair loops.

5. **Logout:**
   - `DELETE /api/auth/session` clears the cookie.
   - `auth.signOut()` clears Firebase client state.
   - Full page reload to the current path (or `/` if the current path requires auth). The reload guarantees the next paint is anonymous-SSR with no CSR bundle mounted.

### Out of Scope (deferred to future specs)

The following concerns intentionally live outside this spec. They are flagged here so a reader knows where *not* to look when implementing session and where the responsibility will eventually land.

- **Custom claim enforcement / onboarding redirects.** v17 used `eula_accepted` and `account_created` custom claims to gate "incomplete" users into `/onboarding`. v20 session surfaces whatever claims the cookie carries on `Astro.locals.claims` but takes no action on them. A future `specs/pelilauta/onboarding/spec.md` will own the EULA acceptance flow, profile-creation gating, and the `/api/auth/status` oracle's claim-backfill logic. Until that spec exists, `/api/auth/status` is specified only at the "verify cookie + return claims as-is" level; no Firestore reads, no claim writes.
- **Admin / role authorization.** `isAdmin()` from [`@pelilauta/firebase/server`](../firebase/spec.md) is available but session does not read it. Per-feature API routes compose admin checks themselves.
- **Firestore security rules.** Read-scoping rules are a separate deliverable (`specs/pelilauta/firestore-rules/spec.md`, not yet drafted). Session only asserts the *default* posture: `allow write: if false`, with any write carve-outs specced per feature.
- **Per-feature write authorization.** Each feature that adds API routes specifies its own bearer verification + payload validation. Session provides `authedFetch` and the bearer contract; it does not dictate the shape of those routes.
- **Profile schema and subscription (read-receipts) state.** v17's session bundled `Account`, `Profile`, and `Subscriber` sub-stores. v20 session touches only the minimal `profile` projection needed by `ProfileButton`; the full `Profile` schema and subscription tracking belong to their own feature specs.

### Anti-Patterns

- **Middleware that redirects based on session state.** v17's `middleware.ts.disabled` file is the cautionary tale. SSR pages are read-only and safe; gating them cosmetically via redirect adds no security and breaks login cycles. Any redirect policy lives at the page/layout level, not in middleware.
- **Cookie gating as a security control.** The cookie enables SSR identity, not authorization. Real authorization lives in API routes (bearer verification) and Firestore rules (read scoping).
- **Reading session state synchronously on anonymous pages.** Anonymous pages must not import the session store, `AuthHandler`, or `@pelilauta/firebase/client`. Tree-shaking is not a substitute for structural discipline.
- **Persisted `uid` in `localStorage`.** v17's `persistentAtom` approach forced the `isRehydrating` computed helper to exist. v20 resolves `uid` from the verified cookie at SSR time; if the cookie is absent, the user is anonymous. There is no in-between.
- **Token-repair loops.** Exactly one retry. Failure means logout.
- **Custom-claim enforcement from middleware.** Onboarding / EULA redirects are a future concern (see deferred `specs/pelilauta/onboarding/spec.md`). Session spec surfaces claims on `Astro.locals`; policy consumes them.

## Contract

### Definition of Done

- [ ] `middleware.ts` reads the `session` cookie, verifies it via `@pelilauta/firebase/server`, and populates `Astro.locals.uid` and `Astro.locals.claims`.
- [ ] Middleware never issues a redirect based on session state.
- [ ] `stores/session.ts` exposes `sessionState`, `uid`, and `profile` atoms, with no `localStorage` persistence.
- [ ] `AuthHandler.svelte` mounts only when `Astro.locals.uid` is non-null at SSR render time.
- [ ] `authedFetch` attaches the Bearer token, retries 401 responses once with a forced token refresh, and calls `logout()` on repeated failure.
- [ ] `/api/auth/session` supports `POST` (cookie set from ID token), `DELETE` (cookie cleared), and `GET` (verify cookie, return uid + claims).
- [ ] `/api/auth/status` verifies the cookie, reads Firestore for claim backfill, and returns authoritative `{ loggedIn, uid, claims }`.
- [ ] Logout clears the cookie, signs out of Firebase, and triggers a full page reload.
- [ ] Anonymous page loads ship zero bytes of Firebase client SDK, session store, or `AuthHandler`.

### Regression Guardrails

- **Cookie attributes are non-negotiable.** `httpOnly: true`, `secure: true`, `sameSite: 'Lax'` — any PR removing or relaxing these is a security regression.
- **Cookie and Bearer are independent.** API routes must never check the session cookie for authorization. If an API route's security depends on the cookie being present, the route is broken.
- **Anonymous = no Firebase client bundle.** A regression where an anonymous page boots the Firebase client SDK is a SEO/perf regression and must fail CI.
- **Token repair has exactly one retry.** Nested or recursive repair attempts are forbidden.
- **Session store is CSR-only.** Importing `stores/session.ts` from an `.astro` frontmatter or from the server entry of a shared package is a structural bug.
- **`Astro.locals.sessionState` is authoritative for SSR paint decisions.** Pages and layouts branch on this value, not on client-side store reads, to decide which shell to render.

### Testing Scenarios

#### Scenario: SSR identity resolution from valid cookie

```gherkin
Given an incoming request with a valid "session" cookie
When middleware runs
Then Astro.locals.uid equals the uid encoded in the cookie
And Astro.locals.sessionState equals "active"
And no redirect is issued
```

- **Vitest Unit Test:** `app/pelilauta/src/middleware.test.ts`

#### Scenario: Anonymous SSR on missing cookie

```gherkin
Given an incoming request with no "session" cookie
When middleware runs
Then Astro.locals.uid is null
And Astro.locals.sessionState equals "initial"
And no redirect is issued
```

- **Vitest Unit Test:** `app/pelilauta/src/middleware.test.ts`

#### Scenario: Session cookie is set on login

```gherkin
Given a POST to "/api/auth/session" with a valid Firebase ID token
When the route handler runs
Then firebase-admin createSessionCookie is called with expiresIn = 5 days
And the response sets a "session" cookie with httpOnly, secure, and sameSite=Lax
And the response body contains { uid }
```

- **Vitest Unit Test:** `app/pelilauta/src/pages/api/auth/session.test.ts`

#### Scenario: Session cookie is cleared on logout

```gherkin
Given a DELETE to "/api/auth/session"
When the route handler runs
Then the response clears the "session" cookie
And the response status is 204
```

- **Vitest Unit Test:** `app/pelilauta/src/pages/api/auth/session.test.ts`

#### Scenario: authedFetch retries once on 401

```gherkin
Given auth.currentUser has a valid Firebase user
And an API endpoint returns 401 on the first call with the current ID token
And returns 200 on a subsequent call with a freshly-refreshed ID token
When authedFetch is invoked against that endpoint
Then user.getIdToken(true) is called exactly once
And the second request carries the refreshed token
And the caller receives the 200 response
```

- **Vitest Unit Test:** `app/pelilauta/src/utils/authedFetch.test.ts`

#### Scenario: authedFetch gives up after one repair attempt

```gherkin
Given an API endpoint returns 401 on the first call
And returns 401 again after the token is force-refreshed
When authedFetch is invoked against that endpoint
Then user.getIdToken(true) is called exactly once
And logout() is invoked
And the returned promise rejects with a clear authentication error
```

- **Vitest Unit Test:** `app/pelilauta/src/utils/authedFetch.test.ts`

#### Scenario: AuthHandler reconciles a stale client session

```gherkin
Given SSR determined the user is active (valid cookie)
But the client-side Firebase SDK has no current user on mount
When AuthHandler runs its reconciliation routine
Then it calls GET "/api/auth/status"
And if the server reports loggedIn=true, it forces a client token refresh
And the session store transitions to "active" once reconciliation succeeds
```

- **Vitest Unit Test:** `app/pelilauta/src/components/auth/AuthHandler.test.ts`

#### Scenario: Anonymous page ships no Firebase client bundle

```gherkin
Given a Playwright navigation to "/" as an anonymous user
When the page finishes loading
Then no network request is made for firebase/app, firebase/auth, or firebase/firestore chunks
And no "authenticated" DOM islands are present
```

- **Playwright E2E Test:** `app/pelilauta/e2e/session-anonymous.spec.ts`

#### Scenario: Authenticated page mounts AuthHandler

```gherkin
Given a signed-in user navigates to "/"
When the page finishes SSR
Then the rendered HTML contains the AuthHandler island marker
And the session store transitions to "active" within 500ms of hydration
```

- **Playwright E2E Test:** `app/pelilauta/e2e/session-authenticated.spec.ts`

#### Scenario: Logout returns the user to an anonymous SSR paint

```gherkin
Given a signed-in user on an authenticated page
When they trigger logout
Then DELETE /api/auth/session is called
And firebase.auth().signOut() is invoked
And the browser performs a full navigation (not a client-side route change)
And the subsequent paint contains no Firebase client bundle
```

- **Playwright E2E Test:** `app/pelilauta/e2e/session-logout.spec.ts`
