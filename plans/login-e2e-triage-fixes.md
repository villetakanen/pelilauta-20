# Login / session e2e triage — epic-level fix plan

> Transient plan (see `plans/README.md`). Delete epics as they ship.
> Sources of truth consulted: e2e suites (`app/pelilauta/e2e/**`, `app/cyan-ds/e2e/**`),
> auth/session code (`packages/auth`, `app/pelilauta/src/pages/api/**`, `middleware.ts`),
> specs (`specs/pelilauta/session/spec.md`, `firebase/spec.md`, `netlify/spec.md`,
> `tooling/lefthook/spec.md`).

## Core problem statement

**Humans keep hitting login/session bugs that the e2e suite structurally
cannot see.** The fixture (`app/pelilauta/e2e/fixtures/auth.ts`) plants a
server `session` cookie via `/api/test/seed-session` and never signs in the
client Firebase SDK. So the whole client-side session lifecycle — SDK sign-in,
`/api/auth/session` cookie exchange, `AuthHandler` reconcile, logout, the
login→`next` redirect — runs only under human hands. Every authenticated e2e
test deliberately restricts itself to SSR-HTML assertions (documented in
`session-authenticated.spec.ts:19-23`). The result: session-management bugs
ship, humans find them, devs churn on `AuthHandler`/`reconcile` without a
contract or a regression net, repeat.

## Diagnosis (code = truth, specs = intent)

1. **The client/server session split state is unspecified and mishandled.**
   `Page.astro:80` mounts `AuthHandler` on every authenticated page.
   `reconcile()` treats "server cookie valid, client SDK signed out" as
   corruption and calls `fullLogout()` + reload
   (`packages/auth/src/components/AuthHandler.svelte:34-66`,
   `packages/auth/src/client/session.ts:59-84`). This state is *normal*, not
   corrupt: seeded e2e sessions, cleared IndexedDB, private windows, expired
   client token with live cookie. `session/spec.md` has no scenario for it —
   which is why every fix is a back-and-forth: there's no agreed answer to
   "what should happen here", so each change is a guess against the last bug.

2. **E2E cannot exercise the real login flow, so it can't regress-guard any of
   this.** Real Google OAuth is untestable by design (`netlify/spec.md`), but
   the seed route already mints a Firebase **custom token**
   (`seed-session.ts:50`) and then throws it away server-side. Returning it
   would let tests drive the *actual* client path:
   `signInWithCustomToken` → `/api/auth/session` POST → cookie → hydration →
   reconcile — the same code path a human exercises, minus the Google popup.

3. **The hot path is network-heavy, which turns logic bugs into "flaky".**
   Middleware verifies with `checkRevoked: true`
   (`resolveSession.ts:29`) — a live Google lookup on **every SSR request**.
   `loginAs` makes 2–3 live calls per invocation. Latency widens every race
   window (notably the reconcile logout), so the same bug manifests
   intermittently instead of reproducibly — the signature of this whole triage.

4. **Harness gives no diagnostics and races itself.** No `retries`, `trace`,
   or timeouts in either Playwright config; e2e runs against cold `astro dev`
   while lefthook pre-push runs `build` and `test:e2e` **in parallel**
   (`lefthook.yml`), saturating the machine the dev server is compiling on.
   When a session test fails, there's no trace to distinguish "logic bug" from
   "timeout" — feeding the back-and-forth.

5. **Secondary: data lifecycle and test hygiene.** The dedicated remote dev
   Firebase project is the settled, intentional e2e target (prod-like triage;
   no emulator — `firebase/spec.md`). But `pnpm seed:e2e` isn't wired into the
   Playwright lifecycle, seed-dependent specs hard-code doc ids/counts, ~13
   tests skip-on-empty (vacuous passes), plus `networkidle` waits,
   `waitForTimeout` guesses, a URL race in `auth-login-flow.spec.ts:38-41`,
   and a regex-parsed `Set-Cookie` re-plant with `secure: true` over http.
   Real, but not the source of the login pain.

---

## Epic 1 — Spec the session state machine, then fix reconcile  **(do first)**

The back-and-forth ends when there's a contract. Write the client×server
session state matrix into `specs/pelilauta/session/spec.md` as scenarios
(≤7, per template):

| client SDK | server cookie | intended behavior (to be decided in spec review) |
|---|---|---|
| signed in | valid, same uid | steady state — no action |
| signed in | valid, different uid | resolve conflict (likely: server wins, re-sync client) |
| signed in | missing/expired | re-mint cookie via `/api/auth/session` |
| signed out | valid | **the contested state** — recover client session (custom-token re-sign-in) or tolerate; NOT `fullLogout()` |
| signed out | missing | anonymous — no action |

Then reimplement `reconcile()` against the spec, with Vitest coverage per
branch. Tier: **high-risk** (auth path → critic + manual browser check).
This is the likely root of both the human-visible bugs and the e2e races.

## Epic 2 — Make e2e exercise the real login flow

Close the human-vs-automation gap so Epic 1 (and every future session change)
has a regression net:

- Extend `/api/test/seed-session` to (optionally) return the custom token it
  already mints. Add a fixture-mode that signs the client SDK in with it and
  drives the real path: `signInWithCustomToken` → `/api/auth/session` →
  hydrated authenticated UI. Same triple-layer dev-only guard as today.
- New e2e coverage (the flows humans currently hand-test):
  - full login: land on `/login?next=…`, authenticate, assert redirect + hydrated
    authenticated UI *after* reconcile has run (not racing it)
  - session survival: authenticated page, wait out hydration, assert session
    persists (direct regression guard for the reconcile logout)
  - logout: full teardown, back-button behavior, anonymous repaint
  - split-state scenarios from the Epic 1 matrix that are e2e-reachable
- Keep the existing cookie-only `loginAs` for tests that just need SSR auth —
  it's fast; the client-signin mode is for session-lifecycle tests.
- Spec this in `session/spec.md` (seed route contract update) with `Verifies:`
  tags so `spec:coverage` enforces it.

## Epic 3 — Take live network calls out of the hot path

- Middleware: `checkRevoked: false` (cryptographic verify only); keep
  revocation checks where they matter (`/api/auth/status`, write endpoints) or
  interval-cached. Spec the revocation contract. This shrinks every race
  window and removes a per-request Google dependency.
- Bounded retry/backoff around the `seed-session` POST in `loginAs`.
- Drop the regex `Set-Cookie` re-plant in `fixtures/auth.ts` — the request
  context already shares the cookie jar (also removes the `secure:true`-over-
  http Chromium coupling).

## Epic 4 — Harness diagnostics + gate sequencing

- Both Playwright configs: `retries` (1 local / 2 CI), pinned `workers`,
  explicit expect/action timeouts, `trace: "on-first-retry"` — so the next
  session failure is diagnosable instead of another guess cycle.
- Move pelilauta e2e to `build && preview` (test the shipped artifact; kills
  dev-server cold-compile races; matches the stale spec-file comments) — or
  keep `astro dev` with a real readiness probe. Recommendation: build+preview.
- `reuseExistingServer: !process.env.CI`.
- lefthook pre-push: sequence `test:e2e` after `build` instead of parallel;
  update `specs/tooling/lefthook/spec.md`.

## Epic 5 — Data lifecycle on the dev project (secondary)

- Wire `pnpm seed:e2e` into Playwright `globalSetup`; wipe-and-reseed per run
  is legitimate on the 100%-dev-owned project.
- Small harness spec: canonical test uids (`e2e-test-user-1`,
  `frozen-e2e-user`), their claims/docs, seed ownership + safety guard (refuse
  to run against non-dev targets).
- Convert skip-on-empty guards to failures once seeding is guaranteed.

## Epic 6 — Test hygiene sweep (secondary)

- Replace `networkidle` and `waitForTimeout` waits with state-based
  assertions; fix `auth-login-flow` URL race with `waitForURL`.
- Replace `.last()`/DOM-order/XPath selectors with testids or role locators;
  review pixel-threshold `boundingBox()` assertions.
- Mechanical, parallelizable, Trivial/Standard tier per file.

## Sequencing

1. **Epic 1** — the contract + the fix. Ends the guess-driven churn.
2. **Epic 2** — the regression net; lands right behind Epic 1 so its fix is
   the first thing pinned down by real-login e2e. (Epics 1+2 can be one
   milestone: "session management is spec'd, fixed, and machine-verified.")
3. **Epic 4** — cheap, immediate diagnostic payoff for everything after.
4. **Epic 3** — hot-path determinism.
5. **Epics 5–6** — secondary cleanups once the login story is stable.
