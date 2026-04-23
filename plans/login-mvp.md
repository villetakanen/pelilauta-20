# Login MVP — atomic increments

Ship order for session + auth + firebase accessors. Each item is one PR / one
commit. Each one compiles, tests pass, and merges without depending on a later
item to make sense.

Specs: [`session`](../specs/pelilauta/session/spec.md),
[`auth`](../specs/pelilauta/auth/spec.md),
[`firebase`](../specs/pelilauta/firebase/spec.md).

---

## 1. Firebase session-cookie accessors

- **What:** Add `createSessionCookie` and `verifySessionCookie` to `@pelilauta/firebase/server` as thin wrappers over `firebase-admin`.
- **Files:** `packages/firebase/src/server/sessionCookie.ts` + export from `server/index.ts`.
- **Tests:** `packages/firebase/src/server/sessionCookie.test.ts` — three scenarios from firebase spec (wrap-create, wrap-verify, reject-invalid).
- **Deps:** none.
- **Unblocks:** everything.

## 2. SSR middleware

- **What:** Read the `session` cookie, verify it, populate `Astro.locals.uid` / `Astro.locals.claims` / `Astro.locals.sessionState`. No redirects.
- **Files:** `app/pelilauta/src/middleware.ts`, `app/pelilauta/src/env.d.ts` (types on `App.Locals`).
- **Tests:** `app/pelilauta/src/middleware.test.ts` — valid cookie and missing cookie scenarios from session spec.
- **Deps:** 1.
- **Unblocks:** every SSR page that wants to know who the user is.

## 3. `/api/auth/session` endpoint

- **What:** POST (set cookie from ID token), DELETE (clear cookie), GET (verify cookie, return `{ uid, claims }`).
- **Files:** `app/pelilauta/src/pages/api/auth/session.ts`.
- **Tests:** `app/pelilauta/src/pages/api/auth/session.test.ts` — set-cookie-on-login and clear-cookie-on-logout scenarios.
- **Deps:** 1.
- **Unblocks:** any login/logout client.

## 4. `/api/auth/status` shim

- **What:** GET that verifies the cookie and returns `{ loggedIn, uid, claims }` as-is. No Firestore reads, no claim backfill (that is the onboarding spec's job).
- **Files:** `app/pelilauta/src/pages/api/auth/status.ts` + test.
- **Deps:** 1.
- **Unblocks:** AuthHandler reconciliation (item 9).

## 5. Session store

- **What:** Nanostore atoms for `sessionState`, `uid`, `profile`. CSR-only. No `localStorage`.
- **Files:** `app/pelilauta/src/stores/session.ts` + test.
- **Tests:** state transitions (`initial → loading → active → error`), no persisted atoms.
- **Deps:** none (pure client-side atoms).
- **Unblocks:** AuthHandler, ProfileButton wiring.

## 6. `authedFetch` + token repair

- **What:** Single entry point for API writes. Attaches Bearer, retries 401 once with forced token refresh, calls `logout()` on repeated failure.
- **Files:** `app/pelilauta/src/utils/authedFetch.ts` + test.
- **Tests:** retry-once-on-401 and give-up-after-one scenarios from session spec.
- **Deps:** 5 (calls into session store for logout).
- **Unblocks:** every future write-capable feature.

## 7. LoginButton component

- **What:** CSR Svelte island. `signInWithPopup` → `getIdToken` → POST `/api/auth/session` → full page reload to `next`.
- **Files:** `app/pelilauta/src/components/auth/LoginButton.svelte` + test.
- **Deps:** 3.
- **Unblocks:** /login page.

## 8. `/login` page

- **What:** Anonymous-only SSR page. Redirect away if cookie is valid. Validate `next` as same-origin relative. Mount only `LoginButton` as CSR.
- **Files:** `app/pelilauta/src/pages/login.astro` + test for redirect + `next` validation.
- **Tests:** authenticated-redirect and unsafe-next-discarded scenarios from auth spec.
- **Deps:** 2, 7.
- **Unblocks:** end-to-end login flow.

## 9. AuthHandler component

- **What:** CSR island. Owns `onAuthStateChanged`, token-refresh lifecycle, reconciliation via `/api/auth/status`. Only mounted when SSR says the user is active.
- **Files:** `app/pelilauta/src/components/auth/AuthHandler.svelte` + test.
- **Deps:** 4, 5.
- **Unblocks:** authenticated chrome.

## 10. ProfileButton wiring in AppBar

- **What:** Pass `uid` / `profile` from `Astro.locals` (SSR) into the existing `ProfileButton` DS component. Anonymous = login link; authenticated = avatar link. No skeleton flash because SSR already knows.
- **Files:** `app/pelilauta/src/layouts/*.astro` or wherever AppBar is composed; possibly a thin `AuthChrome.astro` wrapper that renders `ProfileButton` + mounts `AuthHandler` conditionally.
- **Deps:** 2, 9.
- **Unblocks:** logout UI has somewhere to live.

## 11. LogoutAction

- **What:** Small CSR affordance in authenticated chrome that calls `logout()`. `logout()` itself lives in session store module (DELETE cookie + Firebase signOut + full reload).
- **Files:** `app/pelilauta/src/components/auth/LogoutAction.svelte`, plus `logout()` helper in `stores/session.ts`.
- **Deps:** 3, 5, 10.
- **Unblocks:** logout E2E.

## 12. E2E: anonymous SSR contract

- **What:** Playwright check that `/` as anonymous ships no Firebase client bundle and no AuthHandler island marker.
- **Files:** `app/pelilauta/e2e/session-anonymous.spec.ts`.
- **Deps:** 2, 10.

## 13. Firebase client: swap popup re-exports for redirect

- **What:** Replace `signInWithPopup` re-export in `packages/firebase/src/client/index.ts` with `signInWithRedirect` + `getRedirectResult` from `firebase/auth`. Keep `GoogleAuthProvider` and `onAuthStateChanged`.
- **Why:** Popup-based sign-in is unreliable on iOS Safari and in-app webviews — critical MVP gap found during login-flow review (2026-04-23). v17 used `signInWithRedirect`. See auth spec §Anti-Patterns and §Architecture.
- **Files:** `packages/firebase/src/client/index.ts`. No new test — the client index is a thin re-export surface; coverage comes via LoginButton's unit test (item 14) exercising the mocked exports.
- **Deps:** none.
- **Unblocks:** 14.

## 14. Pivot LoginButton to signInWithRedirect flow

- **What:** Refactor `LoginButton.svelte` to the two-phase redirect flow specified in `specs/pelilauta/auth/spec.md`:
  - **Click phase:** `sanitizeNext(next)` → write to `sessionStorage["pelilauta.auth.next"]` → `signInWithRedirect(auth, GoogleAuthProvider)`.
  - **Mount phase:** `getRedirectResult(auth)` on mount; on non-null result show "completing sign-in…" state, `getIdToken()` → POST `/api/auth/session` → full reload to restored+re-sanitized `next`; on rejection surface curated error and render the CTA button; always clear the `sessionStorage` key before exiting either branch.
  - Update the inline error-code map: drop `auth/popup-closed-by-user` and `auth/popup-blocked`; add `auth/account-exists-with-different-credential`; keep `auth/network-request-failed` and the generic fallback.
- **Files:** `app/pelilauta/src/components/auth/LoginButton.svelte`, `app/pelilauta/src/components/auth/LoginButton.test.ts`.
- **Tests:** rewrite the existing five scenarios to match the redirect flow per `auth/spec.md` §Testing Scenarios (click-snapshots-next, completes-handshake-on-return, redirect-errors-inline, server-POST-errors-inline, unsafe-next-discarded-at-both-edges).
- **Deps:** 13.
- **Unblocks:** 15.

## 15. E2E: login + logout roundtrip

- **What:** Playwright flow — visit `/login`, sign in with a seeded test user, verify authenticated chrome appears after reload, sign out, verify anonymous paint returns. Also land the shared auth fixture that plants a valid `session` cookie so `auth-logout.spec.ts` can be unskipped.
- **Files:** `app/pelilauta/e2e/auth-login-flow.spec.ts`, `app/pelilauta/e2e/auth-logout.spec.ts` (unskip), `app/pelilauta/e2e/session-authenticated.spec.ts`, plus a shared fixture (likely `app/pelilauta/e2e/fixtures/auth.ts`).
- **Deps:** 2, 3, 8, 9, 10, 11, 14.
- **Needs:** a seeded E2E test account in the dev Firebase project. Redirect-flow E2E may require Playwright context configuration for the OAuth redirect to a headless test IdP or a bypass harness — evaluate when the task starts.

---

## Deferred (not MVP)

- Onboarding flow (EULA, profile creation). Separate spec.
- Additional identity providers. Separate extension.
- Firestore security rules spec. Separate spec.
- Per-feature write API routes (threads, replies, etc.). Each owns its spec.

## When this plan is done

Delete this file. The specs are the authority from that point forward.
