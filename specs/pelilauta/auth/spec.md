---
feature: Authentication (Login MVP)
parent_spec: ../spec.md
---

# Feature: Authentication (Login MVP)

## Blueprint

### Context
Pelilauta requires secure user authentication to authorize content creation and personalized experiences. The Login MVP implements the foundational "Login with Google" flow, session management via cookies, and a reactive session store for UI state.

### Architecture
- **Host components:**
  - `app/pelilauta/src/pages/login.astro` — The login landing page.
  - `app/pelilauta/src/components/auth/LoginButton.svelte` — Triggers the Firebase Google Auth flow.
  - `app/pelilauta/src/components/auth/AuthHandler.svelte` — Invisible component in the `AppShell` that listens to `onAuthStateChanged` and synchronizes with the server session.
- **API Routes:**
  - `app/pelilauta/src/pages/api/auth/session.ts` — GET (verify), POST (login), DELETE (logout).
- **Stores:**
  - `app/pelilauta/src/stores/session.ts` — NanoStore atom for current auth user, UID, and session state.
- **Dependencies:**
  - `@pelilauta/firebase/client` — for Google Auth provider and `onAuthStateChanged`.
  - `@pelilauta/firebase/server` — for verifying ID tokens via `firebase-admin`.
- **Constraints:**
  - **Cookie-based sessions:** Server-side rendering (SSR) must be able to identify the user via a `session` cookie for data fetching.
  - **Progressive Enhancement:** The UI must handle the "initial" loading state gracefully to avoid layout shifts.

## Contract

### Definition of Done
- [ ] Users can login via Google on the `/login` page.
- [ ] Successful login sets a secure `session` cookie via the API.
- [ ] `AuthHandler` correctly synchronizes Firebase client state with the server session.
- [ ] Users can logout, which clears both the Firebase client state and the server cookie.
- [ ] The `AppShell` reflects the login state (e.g. Profile link vs Login link).
- [ ] Login state is persisted across page reloads via the balance of the `session` cookie and Nanostores.

### Regression Guardrails
- Session tokens MUST be verified on the server using `firebase-admin`.
- Client-side auth state MUST NOT be used as the sole authority for SSR data fetching.

### Testing Scenarios

#### Scenario: Successful Login with Google
```gherkin
Given the user is on the "/login" page
When the user clicks "Login with Google"
  And completes the Google Auth flow
Then the user is redirected to the home page
  And the "session" cookie is present
  And the session store state is "active"
```
- **Playwright E2E Test:** `app/pelilauta/e2e/auth.spec.ts`

#### Scenario: Logout
```gherkin
Given the user is logged in
When the user clicks "Logout"
Then the "session" cookie is removed
  And the session store state is "initial"
  And the user is redirected to the home page
```
- **Playwright E2E Test:** `app/pelilauta/e2e/auth.spec.ts`

#### Scenario: SSR session verification
```gherkin
Given a request arrives at "/" with a valid "session" cookie
When Astro renders the page
Then the user's UID is available in the page frontmatter
```
- **Vitest Unit Test:** `app/pelilauta/src/pages/api/auth/session.test.ts`
