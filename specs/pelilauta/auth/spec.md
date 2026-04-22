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
  - `components/auth/LoginButton.svelte` — CSR island that triggers `signInWithPopup(auth, GoogleAuthProvider)`, then `POST /api/auth/session` with the resulting ID token, then triggers a full page reload to `next` (or `/`). This button is the only CSR that `login.astro` ships.
    - **Styling contract:** Uses the DS `cta` button class and DS tokens (`--cn-grid`, `--cn-color-error`, `--cn-font-size-text-small`). The component MAY define a local `<style>` block only for layout composition (flex stacking of the button + error message); it MUST NOT redefine button, icon, or typography styles — those are DS concerns.
    - **Error-code mapping:** Firebase popup errors are mapped to curated user-facing messages before display. The mapping table lives inline in the component:
      - `auth/popup-closed-by-user` → "Sign-in popup was closed. Please try again."
      - `auth/popup-blocked` → "Popup was blocked by the browser."
      - `auth/network-request-failed` → "Network error. Please check your connection."
      - Fallback (any other error, including POST failure) → "Login failed. Please try again."
    - **`next` sanitization:** Defense in depth. The component calls `sanitizeNext(next)` before redirect, falling back to `/` for any value that is not a same-origin relative path. Page-level validation in `login.astro` remains the primary defense. Both call the shared `sanitizeNext` utility from `src/utils/sanitizeNext.ts`.
  - `components/auth/LogoutAction.svelte` (or equivalent) — small CSR island mounted wherever the authenticated chrome exposes "Sign out". Calls `logout()` from the session module; full-page-reload fan-out is session's responsibility.

- **API contracts consumed** (owned by [session/](../session/spec.md)):
  - `POST /api/auth/session` — converts a Firebase ID token into a session cookie.
  - `DELETE /api/auth/session` — clears the session cookie.

- **Dependencies:**
  - [`@pelilauta/firebase/client`](../firebase/spec.md) — `getAuth()`, `GoogleAuthProvider`, `signInWithPopup`.
  - [`session/`](../session/spec.md) — all state, cookie, and token plumbing.
  - [`ProfileButton`](../../cyan-ds/components/profile-button/spec.md) — the AppBar-slot button that points anonymous users here.

- **Constraints:**
  - `/login` is SSR-anonymous-only. Authenticated visitors are redirected away, not shown the page.
  - `LoginButton` is the only CSR island on `/login`. No `AuthHandler`, no session store, no Firebase Firestore client is bundled into the login page — it is an auth endpoint, not an authenticated surface.
  - After a successful login, navigation is a **full page reload** (not `router.push`). This is load-bearing: the reload is what flips the destination page from anonymous-SSR to authenticated-SSR, paid for by the newly-set cookie.
  - The `next` parameter is whitelisted to same-origin relative paths (no open-redirect vector).

### Out of Scope (deferred to future specs)

- **EULA acceptance / profile creation flow.** v17 routes new users through `/onboarding` to accept the EULA and create a profile before they're considered "complete". v20 Login MVP accepts any successful Google sign-in as a valid session; the user can browse and see anonymous-equivalent content plus whatever authenticated chrome is unlocked by the cookie. Write actions that require a populated profile will short-circuit at the API route level until the onboarding spec lands.
- **Additional identity providers.** Only Google sign-in is in scope for the Login MVP. Email/password, GitHub, Apple, and anonymous-upgrade flows are deferred — each will get its own scenario extension when prioritised.
- **Session recovery UX (expired cookie during an in-flight action).** Session's `authedFetch` handles the 401 → refresh → retry path silently. Cases where token repair fails mid-action produce a forced logout; there is no "please sign in again to continue this action" modal in MVP.
- **Password reset, account deletion, email verification.** Not applicable to Google-only sign-in at this stage; will be specced alongside any future email/password provider.
- **DS primitives.** `login.astro` temporarily uses a local `<style>` block with a `/* DEFERRED */` marker comment; escalate to a cyan DS hero primitive (tracked in `specs/cyan-ds/components/cn-hero/spec.md`, pending) before shipping to prod.

### Anti-Patterns

- **Rendering `/login` as an authenticated shell.** The page must stay anonymous; otherwise it boots the session store and `AuthHandler` for a user who has no session yet, defeating the SEO/CSR split.
- **Using `router.push` after login instead of full reload.** Without the reload, the destination page was already SSRed as anonymous and would not pick up the new cookie until the next navigation — creating a brittle half-hydrated state.
- **Returning the ID token to the client as a response body.** The token came *from* the client; there is no reason to echo it. Response bodies contain `{ uid }` at most.
- **Embedding logout logic here.** `logout()` lives in session; this spec only describes where the "sign out" affordance appears in the UI.

## Contract

### Definition of Done

- [ ] `/login` renders as an anonymous SSR page with no Firebase SDK bundle beyond the login button's own needs.
- [ ] A valid `session` cookie on an incoming request to `/login` produces a `302` redirect to `next` (validated) or `/`.
- [ ] `LoginButton` performs `signInWithPopup`, posts the resulting ID token to `/api/auth/session`, and triggers a full page reload on success.
- [ ] Sign-out UI is present in authenticated chrome and calls into session's `logout()`.
- [ ] Login-failure feedback is surfaced inline on `/login` (error message, button re-enabled).

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

#### Scenario: LoginButton triggers popup and posts ID token on success

```gherkin
Given a mounted LoginButton with next="/threads"
And signInWithPopup resolves with a Firebase user
And POST /api/auth/session returns ok
When the user clicks the button
Then signInWithPopup is called with GoogleAuthProvider
And user.getIdToken() is called
And fetch posts the ID token to "/api/auth/session"
And window.location.assign is called with "/threads"
```

- **Vitest Unit Test:** `app/pelilauta/src/components/auth/LoginButton.test.ts`

#### Scenario: LoginButton surfaces popup errors inline

```gherkin
Given signInWithPopup rejects (popup dismissed, blocked, or network)
When the user clicks the button
Then an alert-role element displays a curated user-facing message
And the button is re-enabled
And no navigation occurs
```

- **Vitest Unit Test:** `app/pelilauta/src/components/auth/LoginButton.test.ts`

#### Scenario: LoginButton surfaces server-POST errors inline

```gherkin
Given signInWithPopup resolves successfully
But POST /api/auth/session returns not-ok
When the user clicks the button
Then an alert-role element displays "Login failed. Please try again."
And the button is re-enabled
And no navigation occurs
```

- **Vitest Unit Test:** `app/pelilauta/src/components/auth/LoginButton.test.ts`

#### Scenario: LoginButton discards unsafe next values

```gherkin
Given a LoginButton is rendered with next="http://evil.example.com"
And the login flow succeeds
When the user clicks the button
Then window.location.assign is called with "/" (the unsafe next is discarded)
```

- **Vitest Unit Test:** `app/pelilauta/src/components/auth/LoginButton.test.ts`

#### Scenario: Successful Google login

```gherkin
Given an anonymous user on "/login?next=/"
When they click the Google login button
  And complete the popup flow successfully
Then POST /api/auth/session is called with the Firebase ID token
  And the response sets a valid session cookie
  And the browser performs a full navigation to "/"
  And the destination page renders the authenticated chrome
```

- **Playwright E2E Test:** `app/pelilauta/e2e/auth-login-flow.spec.ts`

#### Scenario: Login failure is surfaced inline

```gherkin
Given an anonymous user on "/login"
When the Google popup is dismissed or fails
Then an error message is shown on the page
  And the login button is re-enabled
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

#### Scenario: Sign-out from authenticated chrome

```gherkin
Given a signed-in user on any authenticated page
When they activate the sign-out affordance
Then session.logout() is invoked
  And the resulting paint is anonymous SSR (no Firebase client bundle)
```

- **Playwright E2E Test:** `app/pelilauta/e2e/auth-logout.spec.ts`
