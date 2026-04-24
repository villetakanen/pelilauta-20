---
feature: Authentication (Login UX)
parent_spec: ../spec.md
---

# Feature: Authentication (Login UX)

## Blueprint

### Context

This spec covers the **login/logout user journey** — the `/login` page, the Google-auth button, and the handshake that hands control to the [Session](../session/spec.md) layer. Session mechanics (cookie lifecycle, SSR identity, token repair, `AuthHandler`, `authedFetch`) live in the session spec. This spec owns only the UX surfaces the user interacts with and the narrow wiring that converts a successful Firebase popup into a persisted session.

### Architecture

- **Host components** (`app/pelilauta/src/`):
  - `pages/login.astro` — SSR-rendered anonymous-only landing page. Simple centered layout with a call-to-action and the login button island. If the request already carries a valid `session` cookie, middleware+page responds with a `302` to `next` (or `/`).
  - `components/auth/LoginButton.svelte` — CSR island that drives a **full-page redirect** sign-in (not popup). This button is the only CSR that `login.astro` ships. Two phases:
    1. **Click phase (outbound):** snapshot `sanitizeNext(next)` into `sessionStorage` under key `pelilauta.auth.next`, then call `signInWithRedirect(auth, GoogleAuthProvider)`. Control leaves the app — Google's OAuth page takes over.
    2. **Mount phase (return):** on mount, the component awaits `getRedirectResult(auth)`. The user source for the handshake is `result.user ?? auth.currentUser` (scoped: `currentUser` is only consulted when sessionStorage indicates we initiated a redirect). This fallback is load-bearing — on Chromium with storage partitioning, Firebase's `getRedirectResult` can return `null` even though its side effects successfully populated `auth.currentUser`. If a user is resolved from either source, the component enters a "completing sign-in..." state, calls `user.getIdToken()`, `POST`s it to `/api/auth/session`, then triggers a full page reload to the `sessionStorage`-restored `next` (or `/`). If neither source yields a user, the component renders the standard sign-in call-to-action. All paths clear the `sessionStorage` key.

    **Happy-path sequence:**

    ```mermaid
    sequenceDiagram
      actor User
      participant LoginBtn as LoginButton.svelte
      participant Browser
      participant Google as Google OAuth
      participant API as POST /api/auth/session
      participant Admin as firebase-admin

      User->>LoginBtn: click "Sign in with Google"
      LoginBtn->>Browser: sessionStorage[pelilauta.auth.next] = sanitizeNext(next)
      LoginBtn->>Browser: signInWithRedirect(auth, GoogleAuthProvider)
      Browser->>Google: navigate to OAuth
      Google-->>Browser: redirect back to /login
      Note over Browser: fresh page load — LoginButton.onMount fires

      LoginBtn->>LoginBtn: sessionStorage has NEXT_KEY → completing = true
      LoginBtn->>Browser: getRedirectResult(auth)
      Note over Browser: Firebase processes OAuth response as a side effect;<br/>auth.currentUser is populated regardless of return value
      Browser-->>LoginBtn: UserCredential or null

      alt getRedirectResult returned non-null
        LoginBtn->>LoginBtn: user = result.user
      else getRedirectResult returned null (Chromium quirk)
        LoginBtn->>LoginBtn: user = auth.currentUser (fallback)
      end

      LoginBtn->>Browser: user.getIdToken()
      LoginBtn->>API: POST { idToken }
      API->>Admin: verifyIdToken + createSessionCookie
      Admin-->>API: sessionCookie
      API-->>LoginBtn: 200 + Set-Cookie: session=...
      LoginBtn->>Browser: window.location.assign(sanitizeNext(stored))
      Note over Browser: full page reload carries the session cookie
      Browser->>Browser: middleware reads cookie → Astro.locals.uid
      Note over Browser: authenticated SSR chrome renders
    ```

    **State locations during the round-trip:**

    - `sessionStorage["pelilauta.auth.next"]` — our destination hint. Written on click; read once on return, then cleared unconditionally.
    - Firebase redirect state — stored internally in the client SDK's chosen persistence (Firebase default: IndexedDB). Must not be displaced mid-flight — an earlier implementation that forced `setPersistence(browserLocalPersistence)` unawaited on every `getAuth()` call created a race that caused `getRedirectResult` to lose state; that override has been removed in favour of the SDK default.
    - `session` cookie — HttpOnly, `Secure`, `SameSite=Lax`. Set by `/api/auth/session` POST; read by middleware on subsequent SSR requests.

    - **Why redirect over popup:** popup flows break in iOS Safari, in-app webviews (Instagram, Facebook, LinkedIn browsers), and under popup blockers — unacceptable for a community platform. Redirect works universally at the cost of one extra page load. Matches v17's historical behaviour.
    - **Anonymous-SSR impact:** on return from OAuth, the page paints as anonymous SSR first (no cookie yet) while the mount-phase handshake runs. The brief "completing sign-in..." state before the reload is the accepted tradeoff.
    - **Styling contract:** Uses the DS `cta` button class and DS tokens (`--cn-grid`, `--cn-color-error`, `--cn-font-size-text-small`). The component MAY define a local `<style>` block only for layout composition (flex stacking of the button + error message); it MUST NOT redefine button, icon, or typography styles — those are DS concerns.
    - **Error-code mapping:** Firebase redirect errors (surfaced by `getRedirectResult`) are mapped to curated user-facing messages before display. The mapping table lives inline in the component:
      - `auth/network-request-failed` → "Network error. Please check your connection."
      - `auth/account-exists-with-different-credential` → "An account already exists with the same email using a different sign-in method."
      - Fallback (any other error, including POST failure) → "Login failed. Please try again."
    - **`next` sanitization:** Defense in depth. The component calls `sanitizeNext(next)` both before writing to `sessionStorage` (outbound) and after reading back (return), falling back to `/` for any value that is not a same-origin relative path. Page-level validation in `login.astro` remains the primary defense. All three call sites use the shared `sanitizeNext` utility from `packages/utils/src/sanitizeNext.ts`.
  - `components/auth/LogoutAction.svelte` — small CSR island that renders a "Sign out" button. On click it calls `fullLogout()` from `stores/session.ts` (the authoritative exit: cookie DELETE → Firebase `signOut()` → clear atoms → full page reload). Hosted by `pages/settings.astro` (see below); may be hosted elsewhere in authenticated chrome in the future.
    - **Styling contract:** Uses the DS `cta` button class and DS tokens (`--cn-grid`, `--cn-color-error`, `--cn-font-size-text-small`). The component MAY define a local `<style>` block only for layout composition (stacking the button + error message) — matching `LoginButton`'s exception; it MUST NOT redefine button or typography styles.
    - **Busy state:** While `fullLogout()` is in flight, the button is disabled and repeat clicks are coalesced (single invocation). On the happy path the component unmounts before the reload. On the partial-failure path (`sessionState === 'error'`, see [session/spec.md](../session/spec.md) §Authentication Flow step 5), the button re-enables and an inline `role="alert"` element surfaces a retry prompt.
  - `pages/settings.astro` — authenticated-only SSR page. Anonymous visitors are redirected to `/login?next=/settings`. Hosts `LogoutAction` (MVP content); richer settings UI is out of scope for this spec. ProfileButton's authenticated state links here.

- **API contracts consumed** (owned by [session/](../session/spec.md)):
  - `POST /api/auth/session` — converts a Firebase ID token into a session cookie.
  - `DELETE /api/auth/session` — clears the session cookie.

- **Dependencies:**
  - [`@pelilauta/firebase/client`](../firebase/spec.md) — `getAuth()`, `GoogleAuthProvider`, `signInWithRedirect`, `getRedirectResult`.
  - [`session/`](../session/spec.md) — all state, cookie, and token plumbing.
  - [`ProfileButton`](../../cyan-ds/components/profile-button/spec.md) — the AppBar-slot button that points anonymous users here.

- **Constraints:**
  - `/login` is SSR-anonymous-only. Authenticated visitors are redirected away, not shown the page.
  - `LoginButton` is the only CSR island on `/login`. No `AuthHandler`, no session store, no Firebase Firestore client is bundled into the login page — it is an auth endpoint, not an authenticated surface.
  - Sign-in uses `signInWithRedirect` + `getRedirectResult`, never `signInWithPopup`. Popup flows break on iOS Safari and in-app webviews; redirect is the only universally reliable path.
  - After a successful login, navigation is a **full page reload** (not `router.push`). This is load-bearing: the reload is what flips the destination page from anonymous-SSR to authenticated-SSR, paid for by the newly-set cookie.
  - The `next` parameter is whitelisted to same-origin relative paths (no open-redirect vector), both at page-level validation and at every point the component reads it (prop, `sessionStorage` restore).

### Out of Scope (deferred to future specs)

- **EULA acceptance / profile creation flow.** v17 routes new users through `/onboarding` to accept the EULA and create a profile before they're considered "complete". v20 Login MVP accepts any successful Google sign-in as a valid session; the user can browse and see anonymous-equivalent content plus whatever authenticated chrome is unlocked by the cookie. Write actions that require a populated profile will short-circuit at the API route level until the onboarding spec lands.
- **Additional identity providers.** Only Google sign-in is in scope for the Login MVP. Email/password, GitHub, Apple, and anonymous-upgrade flows are deferred — each will get its own scenario extension when prioritised.
- **Session recovery UX (expired cookie during an in-flight action).** Session's `authedFetch` handles the 401 → refresh → retry path silently. Cases where token repair fails mid-action produce a forced logout; there is no "please sign in again to continue this action" modal in MVP.
- **Password reset, account deletion, email verification.** Not applicable to Google-only sign-in at this stage; will be specced alongside any future email/password provider.
- **DS primitives.** `login.astro` and `settings.astro` temporarily use local `<style>` blocks with `/* DEFERRED */` marker comments. Both escalate to a cyan DS section/hero primitive (tracked in `specs/cyan-ds/components/cn-hero/spec.md`, pending) before shipping to prod. No new pages in this spec are permitted to use the escape hatch.

### Anti-Patterns

- **Rendering `/login` as an authenticated shell.** The page must stay anonymous; otherwise it boots the session store and `AuthHandler` for a user who has no session yet, defeating the SEO/CSR split.
- **Using `signInWithPopup` for primary sign-in.** Popup flows are blocked by iOS Safari ITP, in-app webviews (Instagram, Facebook, LinkedIn browsers), and browser popup-blockers. Community-platform traffic is mobile-heavy — popup is not viable. Use `signInWithRedirect` + `getRedirectResult`.
- **Passing `next` through redirect via URL query only.** The return URL after OAuth is not guaranteed to preserve custom query params across providers and custom auth domains. Snapshot to `sessionStorage` before calling `signInWithRedirect`; restore on mount.
- **Using `router.push` after login instead of full reload.** Without the reload, the destination page was already SSRed as anonymous and would not pick up the new cookie until the next navigation — creating a brittle half-hydrated state.
- **Returning the ID token to the client as a response body.** The token came *from* the client; there is no reason to echo it. Response bodies contain `{ uid }` at most.
- **Embedding logout logic here.** `logout()` lives in session; this spec only describes where the "sign out" affordance appears in the UI.

## Contract

### Definition of Done

- [ ] `/login` renders as an anonymous SSR page with no Firebase SDK bundle beyond the login button's own needs.
- [ ] A valid `session` cookie on an incoming request to `/login` produces a `302` redirect to `next` (validated) or `/`.
- [ ] `LoginButton` performs `signInWithRedirect` on click, snapshotting `next` to `sessionStorage` under key `pelilauta.auth.next` before leaving the page.
- [ ] On mount, `LoginButton` calls `getRedirectResult`, and on a non-null result posts the ID token to `/api/auth/session` and triggers a full page reload to the restored (and re-sanitized) `next`.
- [ ] Sign-out UI is present in authenticated chrome (`LogoutAction` hosted on `/settings`) and calls into session's `fullLogout()`.
- [ ] Login-failure feedback is surfaced inline on `/login` (error message, button re-enabled, `sessionStorage` key cleared).

### Regression Guardrails

- `/login` must remain anonymous-only. A regression where it mounts `AuthHandler` or the session store is a SEO/perf regression.
- The `next` parameter must be validated as same-origin relative (no `http://`, no `//`, no protocol-relative). Unsafe values are discarded and `/` is used instead.
- Post-login navigation must be a full page reload. Client-side routing post-login is a regression.

### Testing Scenarios

#### Scenario: Anonymous visitor sees the login page

```gherkin
Given an anonymous request to "/login"
When the page renders
Then the login call-to-action and Google button are visible
And no AuthHandler island is in the DOM
And no Firebase Firestore bundle is requested
```

- **Playwright E2E Test:** `app/pelilauta/e2e/auth-login-page.spec.ts`

#### Scenario: Authenticated visitor is redirected away from /login

```gherkin
Given a request to "/login?next=/threads" with a valid session cookie
When the server processes the request
Then the response is a 302 to "/threads"
```

- **Playwright E2E Test:** `app/pelilauta/e2e/auth-login-page.spec.ts`

#### Scenario: sanitizeNext enforces same-origin relative paths

```gherkin
Given a candidate next redirect parameter
When the candidate is sanitized
Then null/undefined/empty string becomes "/"
And absolute URLs (http://, https://) become "/"
And protocol-relative URLs (//) become "/"
And safe same-origin relative paths pass through unchanged
```

- **Vitest Unit Test:** `packages/utils/src/sanitizeNext.test.ts`

#### Scenario: LoginButton click snapshots next and calls signInWithRedirect

```gherkin
Given a mounted LoginButton with next="/threads"
And getRedirectResult resolves with null (first visit)
When the user clicks the button
Then sessionStorage["pelilauta.auth.next"] is set to "/threads"
And signInWithRedirect is called with GoogleAuthProvider
And no POST to /api/auth/session occurs on this phase
```

- **Vitest Unit Test:** `app/pelilauta/src/components/auth/LoginButton.test.ts`

#### Scenario: LoginButton completes handshake on return from redirect

```gherkin
Given sessionStorage["pelilauta.auth.next"] is "/threads"
And getRedirectResult resolves with a non-null Firebase UserCredential
And POST /api/auth/session returns ok
When the component mounts
Then user.getIdToken() is called
And fetch posts the ID token to "/api/auth/session"
And window.location.assign is called with "/threads"
And sessionStorage["pelilauta.auth.next"] is cleared
```

- **Vitest Unit Test:** `app/pelilauta/src/components/auth/LoginButton.test.ts`

#### Scenario: LoginButton surfaces redirect errors inline on return

```gherkin
Given getRedirectResult rejects (network, account-exists, or unknown code)
When the component mounts
Then an alert-role element displays a curated user-facing message
And the click-to-sign-in button is rendered (not a loading state)
And no navigation occurs
And sessionStorage["pelilauta.auth.next"] is cleared
```

- **Vitest Unit Test:** `app/pelilauta/src/components/auth/LoginButton.test.ts`

#### Scenario: LoginButton surfaces server-POST errors inline on return

```gherkin
Given getRedirectResult resolves with a non-null Firebase UserCredential
But POST /api/auth/session returns not-ok
When the component mounts
Then an alert-role element displays "Login failed. Please try again."
And the click-to-sign-in button is rendered
And no navigation occurs
And sessionStorage["pelilauta.auth.next"] is cleared
```

- **Vitest Unit Test:** `app/pelilauta/src/components/auth/LoginButton.test.ts`

#### Scenario: LoginButton clears stale NEXT_KEY even when getRedirectResult is null

```gherkin
Given sessionStorage["pelilauta.auth.next"] is set from an aborted prior flow
And getRedirectResult resolves with null
When the component mounts
Then sessionStorage["pelilauta.auth.next"] is cleared
And the click-to-sign-in button is rendered
And no navigation or fetch occurs
```

- **Vitest Unit Test:** `app/pelilauta/src/components/auth/LoginButton.test.ts`

#### Scenario: LoginButton discards unsafe next values at both edges

```gherkin
Given a LoginButton is rendered with next="http://evil.example.com"
When the user clicks the button
Then sessionStorage["pelilauta.auth.next"] is set to "/" (unsafe discarded outbound)

Given sessionStorage["pelilauta.auth.next"] is "javascript:alert(1)" (tampered)
And getRedirectResult resolves with a UserCredential
And POST /api/auth/session returns ok
When the component mounts
Then window.location.assign is called with "/" (unsafe discarded on return)
```

- **Vitest Unit Test:** `app/pelilauta/src/components/auth/LoginButton.test.ts`

#### Scenario: Successful Google login (redirect round-trip)

```gherkin
Given an anonymous user on "/login?next=/"
When they click the Google login button
  And are redirected to Google and return with a successful auth
Then getRedirectResult resolves with a Firebase UserCredential on return
  And POST /api/auth/session is called with the Firebase ID token
  And the response sets a valid session cookie
  And the browser performs a full navigation to "/"
  And the destination page renders the authenticated chrome
```

- **Playwright E2E Test:** `app/pelilauta/e2e/auth-login-flow.spec.ts`

#### Scenario: Login failure is surfaced inline

```gherkin
Given an anonymous user returns to "/login" with a failed redirect result
When the component mounts and getRedirectResult rejects
Then an error message is shown on the page
  And the click-to-sign-in button is rendered
  And no navigation occurs
```

- **Playwright E2E Test:** `app/pelilauta/e2e/auth-login-flow.spec.ts`

#### Scenario: `next` parameter is validated

```gherkin
Given a request to "/login?next=http://evil.example.com"
When an authenticated visitor hits the page
Then the redirect target is "/" (the unsafe next is discarded)
```

- **Playwright E2E Test:** `app/pelilauta/e2e/auth-login-page.spec.ts`

#### Scenario: LogoutAction triggers fullLogout on click

```gherkin
Given a mounted LogoutAction
When the user clicks the sign-out button
Then session.fullLogout() is invoked exactly once
```

- **Vitest Unit Test:** `app/pelilauta/src/components/auth/LogoutAction.test.ts`

#### Scenario: LogoutAction coalesces repeat clicks while logout is in flight

```gherkin
Given a mounted LogoutAction
When the user clicks the sign-out button three times in rapid succession
Then session.fullLogout() is invoked exactly once
```

- **Vitest Unit Test:** `app/pelilauta/src/components/auth/LogoutAction.test.ts`

#### Scenario: LogoutAction surfaces the error state when sign-out fails

```gherkin
Given a mounted LogoutAction
When the user clicks the sign-out button
And session.fullLogout() transitions sessionState to "error"
Then the button is re-enabled
And an alert-role element displays "Sign-out failed. Please try again."
```

- **Vitest Unit Test:** `app/pelilauta/src/components/auth/LogoutAction.test.ts`

#### Scenario: /settings redirects anonymous visitors to /login

```gherkin
Given an anonymous request to "/settings"
When the page frontmatter runs
Then the response is a 302 to "/login?next=/settings"
```

- **Vitest Unit Test:** `app/pelilauta/src/pages/settings.test.ts`
- **Playwright E2E Test:** `app/pelilauta/e2e/auth-settings-gated.spec.ts`

#### Scenario: Sign-out from authenticated chrome

```gherkin
Given a signed-in user navigates to /settings
When they activate the sign-out affordance
Then DELETE /api/auth/session is called
  And firebase.auth().signOut() is invoked
  And the browser performs a full page reload
  And the resulting paint is anonymous SSR (no Firebase client bundle)
```

- **Playwright E2E Test:** `app/pelilauta/e2e/auth-logout.spec.ts`
