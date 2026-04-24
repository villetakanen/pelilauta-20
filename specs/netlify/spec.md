---
feature: Netlify Deployment
---

# Feature: Netlify Deployment

## Blueprint

### Context

Pelilauta-20 deploys two Astro apps to two separate Netlify sites: the main app at `pelilauta.social` (`app/pelilauta`) and the Living Style Book at `ds.pelilauta.social` (`app/cyan-ds`). Each app is a workspace package in the same pnpm monorepo and must build via a filtered build command so a deploy doesn't drag the sibling along. Per-app `netlify.toml` files keep each site's config version-controlled and symmetric, sidestepping the dashboard/repo drift that a single root config would create when the second site lands.

### Architecture

- **Configuration files:**
  - `app/pelilauta/netlify.toml` — main-site build/runtime config.
  - `app/cyan-ds/netlify.toml` — DS-site build/runtime config.
  - No root `netlify.toml` — two-site monorepos diverge cleanly only when each app owns its own config.
- **Netlify site naming convention:** `pelilauta-<surface>-<stage>.netlify.app` where `<surface>` is the app slug (`social` for the main app, `cyan-ds` for the design system) and `<stage>` is `next` for pre-production and omitted for production. Canonical pre-prod names: `pelilauta-social-next.netlify.app` and `pelilauta-cyan-ds-next.netlify.app`. Once custom domains (`pelilauta.social`, `ds.pelilauta.social`) are wired up, the `.netlify.app` names become internal redirect targets.
- **Per-Netlify-site dashboard settings:** **Base directory** = the app subdirectory (`app/pelilauta` or `app/cyan-ds`). Netlify resolves all paths in `netlify.toml` relative to this base. Build command and publish dir come from the toml.
- **Build pipeline:**
  - `pnpm install` runs from the workspace root (pnpm walks up to find `pnpm-workspace.yaml`).
  - Build command is `pnpm --filter <app-name> build`, where `<app-name>` matches the app's `package.json` `name` field (`pelilauta` or `cyan-ds`).
  - Publish directory is the **full path from the repo root** — `app/pelilauta/dist` or `app/cyan-ds/dist`. Netlify's `packagePath` (set from dashboard Base directory) controls where commands run and where `netlify.toml` is read from, but `publish` paths are resolved relative to the repo root.
  - `@astrojs/netlify` adapter emits the SSR function to `.netlify/functions-internal/` inside the app dir; Netlify auto-detects it regardless of `publish`.
- **External Node modules in the SSR function:** `app/pelilauta/netlify.toml` declares `[functions.ssr] external_node_modules = ["firebase-admin"]`. This pairs with `vite.ssr.external` in `app/pelilauta/astro.config.mjs`: Vite keeps firebase-admin out of the SSR chunk (to avoid the `__dirname` ESM crash from grpc-js), and Netlify's function bundler then ships the package files alongside the function so `require('firebase-admin')` resolves at runtime. Both sides are load-bearing — removing either reintroduces either the bundling crash (drop Vite external) or a `Cannot find package 'firebase-admin'` runtime error (drop the Netlify `external_node_modules`). See `specs/pelilauta/firebase/spec.md` §SSR Safety.
- **Runtime environment:**
  - `NODE_VERSION = "22"` — pinned. Astro 6.1+ requires `>=22.12.0`.
  - `PNPM_VERSION = "10"` — pinned to match local toolchain.
- **Environment variables (Firebase):** the full set of `PUBLIC_*` and `SECRET_*` vars listed in `specs/pelilauta/firebase/spec.md` §Environment Variables MUST be set on every Netlify site that hosts an app reading from Firebase. The DS site (`app/cyan-ds`) does not currently read Firestore, so it does not need the `SECRET_*` set; this may change if future DS pages embed live data.
- **Authorized domains in Firebase Auth:** every Netlify deploy URL (production and any branch deploys exposing the login flow) must be listed in the target Firebase project's **Authentication → Settings → Authorized domains**. Without this entry, `signInWithRedirect` rejects with `auth/unauthorized-domain`. The `PUBLIC_authDomain` env var must reference a Firebase project that has the deploy URL in this list.
- **Secrets scanning (load-bearing):** Netlify's built-in **strict-prefix scanner** is the enforcer of the v20 invariant that no `SECRET_*` env-var value ever appears in a published artifact (see `specs/pelilauta/firebase/spec.md` §Regression Guardrails). If scanning finds a `SECRET_*` value in the build output, the deploy fails — and that is the expected, correct behavior. A scanner-flagged `SECRET_*` value is a real leak, not a false positive; the fix is to hunt down the leaking read path (usually an `import.meta.env.SECRET_*` reference that should be `process.env.SECRET_*`), not to suppress the scanner.
- **`SECRETS_SCAN_OMIT_KEYS` usage:** the `netlify.toml` `SECRETS_SCAN_OMIT_KEYS` list MAY include `PUBLIC_*` keys that Netlify's UI has flagged as "sensitive" (Netlify sometimes marks PUBLIC_-prefixed vars as sensitive by dashboard convention). It MUST NOT include any `SECRET_*` key — doing so removes the enforcement the firebase spec depends on.
- **Smart-detection scanning is disabled on the pelilauta site.** Netlify's secondary "smart detection" mode is pattern-based (e.g. flags any `AIza...` string as a likely Google API key). Firebase Web API keys (`PUBLIC_apiKey`) intentionally match that pattern — per Google's documentation, Firebase API keys are public by design and access control is via Firebase Security Rules + App Check, not key secrecy. Smart detection produces only false positives for this project. It is disabled via `SECRETS_SCAN_SMART_DETECTION_ENABLED = "false"` in `app/pelilauta/netlify.toml`. The strict-prefix scan still runs and still enforces the v20 `SECRET_*` invariant. If the project later adds third-party integrations whose API keys should be genuinely private (AWS, GitHub, etc.), re-enable smart detection with `SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES` carrying the Firebase key as an allowlisted value.
- **Constraints:**
  - `SECRET_e2e_seed_secret` MUST NOT be set on any production Netlify site. The seed route (`/api/test/seed-session`) has three defense layers (`import.meta.env.DEV` check, env-var presence check, header match); a missing env var on prod is the second layer's safety net. Setting this in production env defeats defense-in-depth.
  - Each Netlify site builds exactly one app via `pnpm --filter`. Building the whole workspace (`pnpm build` from root) wastes CI time and creates ambiguity over which app's `dist` should be published.
  - `netlify.toml` files live inside each app's directory, never at the repo root. A root toml only configures one site and forces the second site to live entirely in dashboard config, which drifts.

## Contract

### Definition of Done

- [ ] `app/pelilauta/netlify.toml` exists with `[build] command = "pnpm --filter pelilauta build"`, `publish = "app/pelilauta/dist"`, and `[build.environment] NODE_VERSION = "22"`, `PNPM_VERSION = "10"`.
- [ ] The pelilauta Netlify site has Base directory set to `app/pelilauta` in the dashboard.
- [ ] All `PUBLIC_*` Firebase env vars from `specs/pelilauta/firebase/spec.md` §Environment Variables are set on the pelilauta Netlify site.
- [ ] All `SECRET_*` Firebase service-account env vars from the same spec are set on the pelilauta Netlify site.
- [ ] `SECRET_e2e_seed_secret` is NOT set on the pelilauta Netlify site (verified by inspecting the site's environment configuration).
- [ ] The pelilauta Netlify deploy URL (and any branch-preview URLs that need login) is listed under Firebase Auth → Authorized domains in the target Firebase project.
- [ ] `pnpm --filter pelilauta build` exits 0 from the Netlify build environment (Node 20, pnpm 10), producing a publishable `dist/` and SSR function.
- [ ] A real Google sign-in completes against the deployed site: click → Google OAuth → return → authenticated SSR chrome → logout returns to anonymous paint.
- [ ] `app/cyan-ds/netlify.toml` exists with `[build] command = "pnpm --filter cyan-ds build"`, `publish = "app/cyan-ds/dist"`, and matching `NODE_VERSION` / `PNPM_VERSION` pins.
- [ ] The DS Netlify site has Base directory set to `app/cyan-ds` in the dashboard (to be provisioned as `pelilauta-cyan-ds-next.netlify.app`).

### Regression Guardrails

- No `netlify.toml` exists at the repo root. The per-app pattern is preserved as the workspace gains apps.
- `SECRET_e2e_seed_secret` is never set on a production Netlify site. This is a defense-in-depth contract; the route is also gated by `import.meta.env.DEV` and a header check, but missing env on prod is the layer that catches a misconfigured dev build leak.
- Each app's `netlify.toml` build command uses the explicit `--filter <app-name>` form. Removing the filter would cascade into building the sibling app on every deploy.
- `PUBLIC_authDomain` and the Firebase project's Authorized Domains list stay in sync. A change to `PUBLIC_authDomain` (e.g. switching to a custom auth domain) requires updating the Authorized Domains entries.

### Testing Scenarios

#### Scenario: pelilauta netlify.toml drives a clean filtered build

```gherkin
Given app/pelilauta/netlify.toml exists with build command "pnpm --filter pelilauta build"
When the build command is executed from the repo root with Node 20 and pnpm 10
Then exit code is 0
And app/pelilauta/dist contains a built site
And app/pelilauta/.netlify/functions-internal contains an SSR function
And app/cyan-ds is not built (sibling app is excluded by the filter)
```

- **CI verification:** the existing `pnpm build` script in the repo root already runs `pnpm --filter './app/*' build`, which exercises both apps in CI. The Netlify-specific filtered command is verified by Netlify's build job itself; failure surfaces as a red deploy. No additional Vitest mapping — this is a build-pipeline contract, not a unit-testable function.

#### Scenario: Seed route is closed in production builds

```gherkin
Given a production Astro build (import.meta.env.DEV === false)
When POST /api/test/seed-session is called with any payload
Then the response is 404 before any env var or body parsing occurs
```

- **Vitest Unit Test:** `app/pelilauta/src/pages/api/test/seed-session.test.ts` (existing scenario from `specs/pelilauta/session/spec.md`).
- **Production verification:** confirmed by deploying and curling `https://<deploy-url>/api/test/seed-session` — must return 404. This complements the env-var-must-be-unset guardrail above.

#### Scenario: Authenticated chrome appears on the deployed site

```gherkin
Given the deployed Netlify site is reachable
And the deploy URL is listed in Firebase Auth → Authorized domains
When a user navigates to /login on the deployed site and signs in with Google
Then the OAuth flow completes via signInWithRedirect (no popup)
And the post-handshake reload renders authenticated SSR chrome
And the ProfileButton shows the user's avatar from the Google profile picture
```

- **Manual smoke check** — runs once per deploy. Equivalent automation requires a real Google account credential and authorized-domain provisioning, which is out of scope for the test suite. The Vitest + Playwright coverage in `specs/pelilauta/auth/spec.md` exercises the same code paths against mocked Firebase and the cookie-plant fixture; this scenario verifies the deployment-config bindings, not the code logic.

#### Scenario: SECRET_e2e_seed_secret is unset on production sites

```gherkin
Given a production Netlify site environment configuration
When the environment variable list is inspected
Then SECRET_e2e_seed_secret is not present
```

- **Manual verification per deploy** — checked when env vars are set up for a new Netlify site, and re-verified before any production rotation. No automated check; a missing env var doesn't fail the build, so no deploy-time hook catches an accidental setting. The seed route's runtime behavior (404 in prod regardless) is the safety net.
