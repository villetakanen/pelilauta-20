---
feature: Auth Package (@pelilauta/auth)
parent_spec: ../spec.md
---

# Feature: Auth Package (@pelilauta/auth)

## Blueprint

### Context

`@pelilauta/auth` is the workspace package that owns the CSR auth machinery shared by every authenticated surface in the host: the session store, the bearer-token fetch wrapper, the SSR-safe claims projection, and the four Svelte islands that drive login, logout, the profile button, and token refresh. Before this package existed, the same machinery lived under `app/pelilauta/src/{stores,utils,components/auth}/` — a layout that violated the host-owns-seams / packages-own-domain rule and meant every future feature package needing `authedFetch` would have to reach back into the host.

Mirrors the structural pattern of [`packages/firebase`](../firebase/spec.md): infrastructure code grouped by execution context, not by feature vertical. Behavioral specs for what the package contains continue to live in [`auth/spec.md`](../auth/spec.md) (login/logout UX) and [`session/spec.md`](../session/spec.md) (identity boundary, cookie lifecycle, token repair).

### Architecture

- **Location:** `packages/auth/` (workspace package, not independently published — shares the v20 release cycle).
- **Sub-exports:**
  - `./server` — SSR-safe pure helpers and types. Zero `firebase/client` imports. Consumed by `app/pelilauta/src/layouts/Page.astro` from frontmatter (no `client:` directive).
  - `./client` — CSR-only nanostore atoms, `logout()` / `fullLogout()`, and `authedFetch`. Imports `@pelilauta/firebase/client`. Anonymous-reachable host modules use `import type` only — see §Constraints.
  - `./components` — Svelte 5 islands. Mounted by the host with `client:load` directives.

#### Module Structure (final shape, after stages 1–5 land)

```
packages/auth/
  package.json              → name @pelilauta/auth, sub-export map per above
  vitest.config.ts          → mirrors packages/threads/vitest.config.ts; envPrefix [PUBLIC_, SECRET_]; envDir ../..
  tsconfig.json             → extends root
  src/
    server/
      index.ts              → barrel; re-exports projectProfile + types
      projectProfile.ts     → projectProfileFromClaims(claims) — pure claims → SessionProfile
      types.ts              → SessionState, SessionProfile, SessionContext
    client/
      index.ts              → barrel; re-exports session atoms, mutators, authedFetch
      session.ts            → nanostore atoms (sessionState, uid, profile); logout(), fullLogout()
      authedFetch.ts        → bearer-token wrapper; one-shot 401 → token-repair → retry
    components/
      index.ts              → barrel; re-exports the four islands below
      AuthHandler.svelte    → onAuthStateChanged loop, token refresh, fullLogout fan-out on irrecoverable drift
      AuthChrome.svelte     → CSR ProfileButton mount; reads profile/sessionState; SSR-seeded ssrProfile prop
      LoginButton.svelte    → Google signInWithRedirect + getRedirectResult handshake
      LogoutAction.svelte   → Sign-out button; calls fullLogout()
```

#### What stays in `app/pelilauta/`

The host owns composition, routing, and the SSR/server-endpoint surfaces:

- `middleware.ts` — SSR cookie verification → `Astro.locals.uid` / `claims`
- `layouts/Page.astro` — auth-aware composition seam (mounts `AuthHandler` + `AuthChrome` only when `Astro.locals.uid` is non-null)
- `pages/login.astro`, `pages/settings.astro` — host-specific routes
- `pages/api/auth/session.ts` — `POST` / `DELETE` / `GET` cookie endpoints
- `pages/api/auth/status.ts` — oracle endpoint
- `pages/api/test/seed-session.ts` — dev-only E2E seed route
- `utils/authenticatedPageGuard.ts` — page-frontmatter helper for anonymous-redirect guards

#### Dependencies

- `@pelilauta/firebase` — `getAuth()` + `firebase/auth` re-exports (`GoogleAuthProvider`, `signInWithRedirect`, `getRedirectResult`, `onAuthStateChanged`) consumed by `./client` and `./components`.
- `@pelilauta/utils` — `logError`, `logDebug`.
- `nanostores` — atoms in `./client`.
- `svelte` — `./components`.

#### Consumed by

- `app/pelilauta/` — the only consumer at extraction time.
- Future feature packages performing authenticated writes (e.g. threads Stage-3, replies, reactions) will import `authedFetch` from `@pelilauta/auth/client`. Establishing this dependency direction up-front is the primary motivation for extracting now.

#### SSR Safety

- `./server` MUST NOT import `firebase/client`, the `./client` barrel, or any Svelte component. It exists to be importable from `.astro` frontmatter without dragging the client SDK into the SSR bundle.
- `./client` and `./components` MAY import `firebase/client`. Anonymous-reachable host modules (e.g. `pages/login.astro`, `pages/index.astro`'s anonymous branch) MUST use `import type` only when reaching into `./client` — value imports defeat the "anonymous surfaces ship zero CSR for auth" guardrail in [`session/spec.md`](../session/spec.md) §Anti-Patterns.
- The session store has no `localStorage` persistence. State derives from the SSR cookie (verified in middleware) and the Firebase client SDK's own IndexedDB persistence; the package adds no third source of truth.

#### Constraints

- **Behavior is owned by `auth/` and `session/` specs.** This spec covers the package shell, sub-export contracts, and dependency direction. Behavioral contracts for login UX, error mapping, redirect semantics, cookie lifecycle, token repair, and the `fullLogout` partial-failure rules live in the existing sibling specs.
- **No new public API in the move.** Every export from `./server`, `./client`, `./components` corresponds 1:1 to a symbol that existed in the host before extraction. New surfaces (rate-limiting, alternate providers, store mutators) require their own spec amendment.
- **No i18n in this package yet.** Login error messages remain inline strings in `LoginButton`. A `./i18n` sub-export is a follow-up tracked separately.
- **`authenticatedPageGuard.ts` does not move.** It is a host-frontmatter helper that returns redirect tuples; it has no client-side surface and no future consumers outside the host.

## Contract

### Definition of Done

DoD is split across five ship stages corresponding to GitHub issues #20–#24 of [epic #19](https://github.com/villetakanen/pelilauta-20/issues/19). Each stage MUST leave login + `/settings` round-trip green. Stages are cumulative.

#### Stage 1 — Scaffold (issue #20)

- [x] `packages/auth/` exists as a pnpm workspace package named `@pelilauta/auth`, picked up by `pnpm-workspace.yaml`.
- [x] All three sub-exports declared in `package.json`: `./server`, `./client`, `./components`. Empty barrels permitted at this stage.
- [x] `src/{server,client,components}/index.ts` exist with a one-line comment naming the sub-export's intent.
- [x] Workspace dependencies declared: `@pelilauta/firebase`, `@pelilauta/utils`. Dev deps sufficient for `vitest run` against Svelte components (`svelte`, `@sveltejs/vite-plugin-svelte`, `@testing-library/svelte`, `jsdom`, `vitest`).
- [x] `vitest.config.ts` mirrors the `envPrefix` / `envDir` / browser-conditions convention used by `packages/threads/vitest.config.ts`. `passWithNoTests: true` until content lands. The `@cyan` alias is dropped — `@pelilauta/auth` has no design-system import surface in any future stage.
- [x] No file outside `packages/auth/` imports from `@pelilauta/auth/*` yet.
- [x] `pnpm check` and `pnpm test` green.

> Note: workspace packages in this repo do not carry per-package `tsconfig.json` files (verified across `packages/threads`, `packages/firebase`, `packages/utils`). The root `tsconfig.json` covers all packages; workspace-namespaced imports resolve through pnpm symlinks + `package.json` `exports`, not through tsconfig path aliases.

#### Stage 2 — Move pure helpers (issue #21)

- [ ] `app/pelilauta/src/utils/projectProfile.ts` is moved to `packages/auth/src/server/projectProfile.ts`, including its colocated test.
- [ ] `SessionProfile` and `SessionState` types are moved to `packages/auth/src/server/types.ts` and re-exported from `app/pelilauta/src/stores/session.ts` so the host's existing imports continue to resolve.
- [ ] `./server` barrel exports `projectProfileFromClaims`, `SessionProfile`, `SessionState`.
- [ ] `app/pelilauta/src/layouts/Page.astro` (and any other host module that referenced `utils/projectProfile`) imports from `@pelilauta/auth/server`.
- [ ] `packages/auth/src/server/` has zero `firebase/client` imports.
- [ ] `app/pelilauta/src/utils/projectProfile.ts` is deleted.

#### Stage 3 — Move CSR core (issue #22)

- [ ] `app/pelilauta/src/stores/session.ts` is moved to `packages/auth/src/client/session.ts`, including its colocated test.
- [ ] `app/pelilauta/src/utils/authedFetch.ts` is moved to `packages/auth/src/client/authedFetch.ts`, including its colocated test.
- [ ] `./client` barrel exports `sessionState`, `uid`, `profile`, `logout`, `fullLogout`, `authedFetch`.
- [ ] All host consumers (auth components, tests) import from `@pelilauta/auth/client`.
- [ ] `app/pelilauta/src/stores/session.ts` and `app/pelilauta/src/utils/authedFetch.ts` are deleted.
- [ ] Anonymous-reachable host modules use `import type` (not value imports) when referencing `./client` symbols.

#### Stage 4 — Move authenticated chrome (issue #23)

- [ ] `AuthHandler.svelte` and `AuthChrome.svelte` are moved from `app/pelilauta/src/components/auth/` to `packages/auth/src/components/`, including their colocated tests.
- [ ] `./components` barrel exports both.
- [ ] `app/pelilauta/src/layouts/Page.astro` imports them from `@pelilauta/auth/components`.
- [ ] Anonymous paint of `/` ships zero auth-component CSR (verified by absence in the rendered HTML and bundle).

#### Stage 5 — Move login/logout UI (issue #24)

- [ ] `LoginButton.svelte` and `LogoutAction.svelte` are moved from `app/pelilauta/src/components/auth/` to `packages/auth/src/components/`, including their colocated tests.
- [ ] `./components` barrel exports both alongside the chrome components.
- [ ] `app/pelilauta/src/pages/login.astro` and `app/pelilauta/src/pages/settings.astro` import them from `@pelilauta/auth/components`.
- [ ] `app/pelilauta/src/components/auth/` is deleted.
- [ ] [`auth/spec.md`](../auth/spec.md) §Host components and [`session/spec.md`](../session/spec.md) §Host components are updated to point at the new package paths.

### Regression Guardrails

- The login round-trip (`/login` → Google → return → `POST /api/auth/session` → reload) MUST be green at every stage merge, not only after Stage 5.
- The `/settings` sign-out round-trip (`DELETE /api/auth/session` → Firebase `signOut()` → atoms cleared → reload) MUST be green at every stage merge.
- `packages/auth/src/server/` MUST NOT import `firebase/client`, `nanostores` (which is fine in `./client` but not under `./server`), or any Svelte component. Anything importable from `.astro` frontmatter must remain SSR-safe.
- Anonymous-reachable host modules MUST NOT value-import from `@pelilauta/auth/client`. `import type` only. A regression here re-introduces auth SDK code into the anonymous bundle.
- Sub-export contracts in `package.json` are append-only across stages — Stage 3 adds to `./client`, Stage 4/5 add to `./components`. Stages MUST NOT remove or rename a sub-export between the milestone they introduce it and the package reaching final shape.

### Testing Scenarios

#### Scenario: Workspace resolves the package

```gherkin
Given packages/auth/package.json declares name "@pelilauta/auth" with sub-exports ./server, ./client, ./components
When pnpm install runs at the workspace root
Then @pelilauta/auth is resolved as a workspace package
And `pnpm --filter @pelilauta/auth test` exits 0
```

- **Vitest Unit Test:** N/A — verified by `pnpm install` and `pnpm test` running green in CI. No dedicated test file at Stage 1.

#### Scenario: Server entry is SSR-safe

```gherkin
Given packages/auth/src/server/index.ts is imported in a Node SSR context with no globals
When the module is evaluated
Then no firebase/client modules are loaded into the module graph
And projectProfileFromClaims(claims) returns a SessionProfile with nick from claims.name and avatarURL from claims.picture
```

- **Vitest Unit Test:** `packages/auth/src/server/projectProfile.test.ts` (lands in Stage 2; ports the existing `app/pelilauta/src/utils/projectProfile.test.ts`).

#### Scenario: Session atoms move without breaking consumers

```gherkin
Given Stage 3 has landed
And app/pelilauta/src/components/auth/* still consume sessionState, uid, profile, logout, fullLogout
When the host build runs
Then every value import resolves to @pelilauta/auth/client
And no path under app/pelilauta/src/ references stores/session or utils/authedFetch
```

- **Vitest Unit Test:** `packages/auth/src/client/session.test.ts` (ported from `app/pelilauta/src/stores/session.test.ts`).
- **Vitest Unit Test:** `packages/auth/src/client/authedFetch.test.ts` (ported from `app/pelilauta/src/utils/authedFetch.test.ts`).

#### Scenario: Anonymous paint ships no auth CSR

```gherkin
Given Stage 4 has landed
And an anonymous request to "/" is rendered by Astro SSR
When the rendered HTML is inspected
Then no <script> tag references AuthHandler or AuthChrome
And the client bundle for the anonymous route does not include @pelilauta/auth/components
```

- **Playwright E2E Test:** `app/pelilauta/e2e/anonymous-bundle-shape.spec.ts` (extends the existing anonymous-paint suite to assert the post-extraction bundle shape).

#### Scenario: Login round-trip is preserved end-to-end

```gherkin
Given Stage 5 has landed
And LoginButton, LogoutAction, AuthHandler, AuthChrome live under @pelilauta/auth/components
When an anonymous user signs in via Google on "/login?next=/"
Then sessionStorage["pelilauta.auth.next"] is set then cleared per auth/spec.md
And POST /api/auth/session sets the session cookie
And the destination paint mounts AuthChrome with the user's nick
```

- **Playwright E2E Test:** `app/pelilauta/e2e/auth-login-flow.spec.ts` (existing — must remain green; no rewrite required, only import-path resolution).

#### Scenario: Sign-out round-trip is preserved end-to-end

```gherkin
Given Stage 5 has landed
And LogoutAction lives under @pelilauta/auth/components
When a signed-in user clicks the sign-out affordance on /settings
Then DELETE /api/auth/session is called
And firebase signOut runs
And the next paint is anonymous SSR with no auth CSR mounted
```

- **Playwright E2E Test:** `app/pelilauta/e2e/auth-logout.spec.ts` (existing — must remain green).

#### Scenario: Server barrel rejects client-side imports

```gherkin
Given packages/auth/src/server/index.ts is the source of truth for ./server exports
When a static-analysis sweep enumerates every import in src/server/
Then no import path matches "firebase/auth", "firebase/firestore", "firebase/app"
And no import path resolves to packages/auth/src/client
And no import path ends in ".svelte"
```

- **Vitest Unit Test:** `packages/auth/src/server/import-discipline.test.ts` (lands in Stage 2; reads server source files and asserts the import set).
