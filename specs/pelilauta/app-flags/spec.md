---
feature: App flags
status: approved
last_major_review: 2026-07-07
parent_spec: ../spec.md
---

# Feature: App flags

## Blueprint

### Context

Deploy-time switches that turn whole sub-app verticals on or off per environment, so a deployment (e.g. a demo) can expose a subset of the platform. A disabled sub-app is absent from every rendered surface and its routes resolve to 404 — indistinguishable from a feature that does not exist.

### Architecture

- **Components:**
  - `app/pelilauta/src/utils/appFlags.ts` — `isAppEnabled(app: AppFlag): boolean`, the single read point. `AppFlag = 'threads' | 'sites' | 'tags' | 'profiles'`.
  - Consumers: front-page composition (`app/pelilauta/src/pages/index.astro` and its `components/front-page/*` streams), sub-app route frontmatter, and any nav/footer surface that links into a sub-app.
- **Configuration:**
  - One env var per sub-app: `PUBLIC_app_threads`, `PUBLIC_app_sites`, `PUBLIC_app_tags`, `PUBLIC_app_profiles`.
  - **Default-on:** a flag is disabled only by the literal value `"false"`; unset or any other value means enabled. Production ships with no flag vars set and is unaffected.
  - Flags are read at request time from `import.meta.env` but vary only per deployment — never per request, per viewer, or per session.
- **Flag → surface map:**
  - `threads` — `/threads/**` and `/channels/**` routes, front-page `TopThreadsStream`, the create-thread FAB (both anonymous and authenticated variants).
  - `sites` — front-page `TopSitesStream` (the `/sites` route does not exist yet; the flag gates it when it lands).
  - `tags` — `/tags/**` routes, front-page `FeaturedTags`.
  - `profiles` — `/profiles/**` routes (see [`../profiles/profile-page/spec.md`](../profiles/profile-page/spec.md)).
- **Constraints:**
  - Flag evaluation is SSR-only; no flag state ships to the client and no island branches on a flag at runtime. Anonymous renders stay byte-identical across viewers (cache-shareability per `AGENTS.md` §Server architecture).
  - A disabled sub-app's routes return HTTP 404 with the site's not-found rendering — not a redirect, not an empty page.
  - Domain packages stay flag-agnostic: `packages/threads`, `packages/profiles`, etc. never read flags. Composition (host pages/layouts) decides what mounts. Cross-vertical citations rendered by an enabled app (e.g. `ProfileLink` inside a thread) are not flag-gated; only owned surfaces and routes are.
  - API routes under `/api/**` are not flag-gated; flags gate presentation surfaces only.

### Out of Scope

- Per-user or percentage rollouts, runtime toggles, A/B testing. Flags are deploy-time environment configuration only.
- Hiding write *capabilities* inside an enabled app (e.g. read-only threads). A sub-app is on or off.

## Contract

### Definition of Done

- [ ] `isAppEnabled()` exists as the single flag read point; no surface reads `PUBLIC_app_*` env vars directly.
- [ ] With no flag vars set, every surface renders exactly as before the feature existed.
- [ ] `PUBLIC_app_threads=false` removes the front-page threads stream and create-thread FAB, and `/threads/**` + `/channels/**` return 404.
- [ ] `PUBLIC_app_sites=false` removes the front-page sites stream.
- [ ] `PUBLIC_app_tags=false` removes the front-page featured-tags block, and `/tags/**` returns 404.
- [ ] No enabled surface renders a link into a disabled sub-app.

### Regression Guardrails

- **Default-on.** An unset flag never disables anything; only the literal `"false"` does. A typo in a flag value fails open, never dark.
- **404, not redirect.** Disabled routes resolve to not-found; no `Location` headers based on flags.
- **No client-side flag state.** Flags never appear in island props, stores, or client bundles.

### Testing Scenarios

#### Scenario: Unset flags leave every surface enabled

```gherkin
Given no PUBLIC_app_* environment variable is set
When the front page renders
Then the threads stream, sites stream, featured tags, and create-thread FAB are all present
```

#### Scenario: Disabled threads app disappears from the front page

```gherkin
Given PUBLIC_app_threads is "false"
When the front page renders anonymously
Then no threads stream and no create-thread FAB is rendered
And no anchor into /threads or /channels is present
```

#### Scenario: Disabled threads app routes resolve to 404

```gherkin
Given PUBLIC_app_threads is "false"
When a request targets a /threads/{threadKey} or /channels route
Then the response status is 404
```

#### Scenario: Disabled sites app hides the sites stream

```gherkin
Given PUBLIC_app_sites is "false"
When the front page renders
Then no sites stream and no anchor to /sites is present
```

#### Scenario: Enabled apps are unaffected by other apps' flags

```gherkin
Given PUBLIC_app_threads is "false" and PUBLIC_app_profiles is unset
When a request targets an existing profile page route
Then the response status is 200
```
