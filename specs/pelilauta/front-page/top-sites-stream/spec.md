---
feature: Top Sites Stream
status: draft
maturity: design
last_major_review: 2026-05-04
parent_spec: ../spec.md
---

# Feature: Top Sites Stream

> Reverse-spec'd from
> `.tmp/pelilauta-17/src/components/server/FrontPage/TopSitesStream.astro`
> + `.tmp/pelilauta-17/src/components/server/ui/SiteCard.astro`. The
> per-card rendering contract has been factored out into the
> Sites package's own component spec
> ([`../../sites/site-card/spec.md`](../../sites/site-card/spec.md)) — this
> stream spec covers only the front-page-specific composition.
> v20 has no implementation yet; this spec captures the
> carry-forward contract.

## Blueprint

### Context

The Top Sites Stream is the small (tertiary) region of the
front-page triad. It surfaces the most recently active community
sites — campaign pages, libraries, character keepers — as a
vertical list of preview cards, completing the front page's
"what is the community working on" snapshot alongside threads
(medium, primary) and the syndicate stream (small, secondary
blog-roll).

This widget owns only its front-page composition: the heading,
the show-more link, the error and empty states, and the per-card
`client:idle` decision that turns each authenticated `<SiteCard>`
into a hydrated island. The `SiteCard` component, the
`MembershipBadge` component, the `Site` schema, the `getSites`
accessor, the image-optimisation helpers, and the flow-time
formatter are each spec'd separately and consumed here as
discrete props.

### Architecture

- **Component:**
  `app/pelilauta/src/components/front-page/TopSitesStream.astro`
  — Astro component, server-rendered in the page's frontmatter,
  mounted into the secondary small column of `cn-content-triad`
  on the front page. Mirrors `TopThreadsStream.astro`'s shape
  (per
  [`../top-threads-stream/spec.md`](../top-threads-stream/spec.md)).

- **Sub-components consumed (each owned by its own spec):**
  - [`SiteCard`](../../sites/site-card/spec.md) from
    `@pelilauta/sites/components` — the per-row preview card.
    The stream calls `SiteCard` once per site, threading
    pre-resolved props.
  - [`MembershipBadge`](../../sites/membership-badge/spec.md) —
    consumed transitively via `SiteCard`. SiteCard renders the
    badge inside its actions area only when `isAuthenticated`
    is `true`; this stream's frontmatter is the surface that
    decides whether each card is hydrated at all (the
    `client:idle` directive lives on the `<SiteCard>` tag, per
    [`../../sites/site-card/spec.md`](../../sites/site-card/spec.md)
    §Authentication wiring). No `client:*` directive ever
    decorates `<MembershipBadge>` itself.
  - `CnCard` from `@pelilauta/cyan` — DS card primitive,
    consumed transitively via `SiteCard`.

- **Data sources** (all resolved in the Astro frontmatter):
  - **Sites:** the most recent **5** non-hidden sites, sorted
    by `flowTime` descending. Read in-process via
    `getSites(5, { order: 'flowTime', public: true })` from
    `@pelilauta/sites/server` — see the accessor contract in
    [`../../sites/spec.md`](../../sites/spec.md). The
    component does NOT issue an HTTP fetch to its own API
    route — that is the v20 "read in-process" rule, mirroring
    `TopThreadsStream`.
  - **Per-card derived values:** for each site the
    frontmatter computes the `SiteCard` props
    (`coverUrl`, `coverSrcset`, `coverSizes`, `systemNoun`,
    `systemLabel`, `systemHref`, `dateLabel`) and threads
    `owners` and `players` through directly. Cover URLs come
    from `@pelilauta/utils/images` (per
    [`../../images/spec.md`](../../images/spec.md));
    `systemNoun` from `systemToNoun` (per
    [`../../sites/spec.md`](../../sites/spec.md)
    §Accessor Surfaces); `systemLabel` from
    `t('sites:site.systems.{system}')` with fallback to the
    raw `site.system` slug; `systemHref` as
    `` `/tags/${site.system}` ``; `dateLabel` from
    `@pelilauta/utils/dates` (per
    [`../../dates/spec.md`](../../dates/spec.md)).
  - **Session presence:** the frontmatter reads
    `Astro.locals.session` and threads its boolean truthiness
    into each `SiteCard` as `isAuthenticated`. This is the
    only auth-aware decision the stream owns; the badge
    component itself reads the viewer's uid post-hydration.

- **i18n:**
  - Host-owned app keys: `pelilauta:action.showMore`
    (show-more link, shared with `TopThreadsStream`);
    `pelilauta:error.fetch` (error block, shared with
    `TopThreadsStream`).
  - Sites-owned key: `sites:title` (stream `<h2>` heading,
    shared with the `/sites` directory `<h1>`). Owned by the
    Sites i18n surface — see
    [`../../sites/i18n/spec.md`](../../sites/i18n/spec.md).
  - All resolved through the host-bound `t` from
    `app/pelilauta/src/i18n.ts`. **No `@pelilauta/profiles`
    dependency** — the card carries no owner identity, so no
    `profiles:*` key is consumed.

- **Constraints:**
  - **Anonymous render = no CSR.** When
    `Astro.locals.session` is falsy, every `SiteCard` is
    rendered with `isAuthenticated={false}` and the widget
    emits no viewer-state-dependent `client:*` directives in
    its subtree (per the parent front-page contract: visual
    islands that preserve cache-shareability are permitted, but
    this widget currently has none).
  - **Authenticated render = SSR shell + per-card `<SiteCard>`
    island.** When `Astro.locals.session` is truthy, every
    `<SiteCard>` is emitted with `isAuthenticated={true}` and
    `client:idle` on the `<SiteCard>` tag itself. The card
    hydrates as a single island; `MembershipBadge` runs as a
    child of that hydration scope and renders the per-viewer
    indicator post-hydration. The hydrated subtree per card is
    the only client JS this widget contributes to the front
    page.
  - **Cache key.** The page response splits on session
    presence (binary), not on uid value — anonymous responses
    are shareable across all anonymous viewers, and
    authenticated responses are shareable across all
    authenticated viewers. The SSR never resolves badge state
    per-uid.
  - **Read in-process.** The component reads via the shared
    accessor module (`@pelilauta/sites/server`). No
    `fetch(${Astro.url.origin}/api/sites...)` in the
    component — there is no `/api/sites.json` HTTP surface in
    the MVP (see [`../../sites/spec.md`](../../sites/spec.md)).
  - **Bounded result set.** The list contains at most 5
    sites. Older sites are reachable via the show-more link.
  - **Empty state non-erroneous.** Zero non-hidden sites
    renders the empty list with the show-more link still
    present, status 200.
  - **Error isolation.** A failure in the sites accessor
    renders the localised error block
    (`pelilauta:error.fetch`) in place of the list; the rest
    of the front page is unaffected and returns 200.
  - **Hidden filter.** Only sites with `hidden === false`
    appear in the stream. The accessor enforces this; the
    widget does not re-filter.
  - **Apps never override the DS.** No `<style>` blocks, no
    inline `style=""`, no app-local utility classes in
    `TopSitesStream.astro`. Layout composes DS primitives via
    `SiteCard` and the surrounding triad column.

#### Sections

| Section | Triad position | Content | Priority |
|---|---|---|---|
| Top Sites Stream | Small (tertiary) | Up to 5 `SiteCard` components representing recently active community sites + show-more link to `/sites` | P1 |

## Contract

### Definition of Done

- [ ] `TopSitesStream.astro` exists at the path above and is
      mounted into the secondary small column of the
      front-page triad on
      `app/pelilauta/src/pages/index.astro`.
- [ ] Renders up to 5 non-hidden sites sorted by `flowTime`
      descending via
      `getSites(5, { order: 'flowTime', public: true })` from
      `@pelilauta/sites/server`. The component issues no HTTP
      fetch to its own API route.
- [ ] For each site, the frontmatter resolves the discrete
      `SiteCard` props upstream (`coverUrl`, `coverSrcset`,
      `coverSizes`, `systemNoun`, `systemLabel`, `systemHref`,
      `dateLabel`) and threads `owners`, `players`, `name`,
      `key`, `description` through. The card does no data
      fetching, no transforms, no formatting. (Per-card
      rendering rules:
      [`../../sites/site-card/spec.md`](../../sites/site-card/spec.md).)
- [ ] The frontmatter reads `Astro.locals.session` once and
      threads its boolean truthiness into every `SiteCard` as
      `isAuthenticated`.
- [ ] When `Astro.locals.session` is falsy, the rendered
      subtree contains no `client:*` directive anywhere.
- [ ] When `Astro.locals.session` is truthy, each `<SiteCard>`
      is emitted with `client:idle` on the `<SiteCard>` tag
      itself. SiteCard renders MembershipBadge inside its
      actions area as a normal Svelte child — no `client:*`
      decorates `<MembershipBadge>`. (Per-card rules:
      [`../../sites/site-card/spec.md`](../../sites/site-card/spec.md)
      §Authentication wiring; per-viewer badge rules:
      [`../../sites/membership-badge/spec.md`](../../sites/membership-badge/spec.md).)
- [ ] The widget does not call `getProfile(...)` and does not
      import from `@pelilauta/profiles`.
- [ ] A visible `<h2>` region heading appears above the list,
      labelled by `sites:title`.
- [ ] A show-more link to `/sites` is always present,
      regardless of result count or error state, labelled by
      `pelilauta:action.showMore`.
- [ ] On data-fetch failure, a localised error block
      (`pelilauta:error.fetch`) replaces the list; the rest of
      the front page renders normally and the response status
      is 200. The failure is logged via the host's logger.
- [ ] No `<style>` blocks, no inline styles, no utility/local
      classes in `TopSitesStream.astro`.
- [ ] No use of `fetch(Astro.url.origin + ...)` — data is
      loaded via the shared accessor module.
### Regression Guardrails

- The result-set ceiling stays at 5 unless the parent
  front-page spec changes the triad layout.
- The show-more link points to `/sites` (the directory route
  owned by the Sites package).
- Errors are caught, logged, and replaced with the localised
  error block; front-page rendering returns 200.
- An empty site list renders successfully (status 200) with
  the show-more link still present. The hidden-site filter is
  enforced inside the accessor; the widget does not re-filter
  client-side.
- **Read-in-process discipline.** Replacing the in-process
  accessor with an HTTP self-fetch is a regression — the
  component must not depend on its own API route resolving
  before SSR completes.
- **Anonymous render stays CSR-free.** Threading
  `isAuthenticated={true}` to a card on an anonymous request,
  or emitting a viewer-state-dependent `client:*` directive on
  an anonymous render, is a regression against the front-page
  anonymous-SSR contract.
- **No per-uid SSR.** The SSR must not resolve badge state
  (e.g. "is this viewer in owners?") server-side. The decision
  lives inside the CSR `MembershipBadge` island; the stream
  passes only the binary session-presence and the membership
  arrays.
- **No owner byline.** The card never surfaces an owner's
  name, nick, avatar-image, or link. Adding a byline (whether
  SSR via `ProfileLink` or CSR) is a regression against this
  spec.
- **Hidden filter.** Sites with `hidden === true` MUST NOT
  appear in the stream under any circumstance. Removing or
  weakening the accessor's `hidden === false` predicate is a
  regression.

### Testing Scenarios

#### Scenario: Renders the most recent 5 non-hidden sites as cards

```gherkin
Given getSites(5, { order: 'flowTime', public: true }) returns 5 non-hidden sites
  sorted by flowTime descending (drawn from a larger pool that includes hidden sites)
When the front page is rendered
Then the Top Sites Stream contains exactly 5 SiteCard elements
And each card links to "/sites/{key}" for its site
And the cards appear in flowTime-descending order
And no card represents a site with hidden === true
```

#### Scenario: Empty site list renders without error

```gherkin
Given getSites(5, { order: 'flowTime', public: true }) returns zero sites
When the front page is rendered
Then the Top Sites Stream renders no SiteCard elements
And the show-more link to /sites is still present
And no error block is shown
And the response status is 200
```

#### Scenario: Data-fetch failure shows the localised error block

```gherkin
Given getSites(5, { order: 'flowTime', public: true }) throws
When the front page is rendered
Then the Top Sites Stream contains the localised error message for "pelilauta:error.fetch"
And the show-more link to /sites is still present
And the response status is 200
And the rest of the front page renders normally
```

#### Scenario: Anonymous render mounts no badge island

```gherkin
Given the request carries no authenticated session cookie
And getSites(5, { order: 'flowTime', public: true }) returns 5 sites
When the front page is rendered
Then every SiteCard receives isAuthenticated={false}
And the rendered HTML for the Top Sites Stream subtree contains no client:* directive
And no MembershipBadge mount marker is present in the SSR HTML
```

#### Scenario: Authenticated render hydrates each SiteCard as an island

```gherkin
Given the request carries an authenticated session cookie
And getSites(5, { order: 'flowTime', public: true }) returns 5 sites
When the front page is rendered
Then every <SiteCard> in the SSR HTML carries Astro's hydration
  marker for client:idle and receives isAuthenticated={true}
And no client:* attribute appears on any <MembershipBadge> element
  (the directive lives on the SiteCard boundary, not the badge)
And inside each SiteCard's actions area the SSR HTML contains
  MembershipBadge's empty placeholder (the badge's $uid is null
  at SSR; per-viewer state resolves only after hydration)
And no SSR-side resolution of badge state occurs (the SSR HTML
  does not encode "is current viewer in owners" or "is current
  viewer in players")
```

#### Scenario: SSR cache splits on session presence, not on uid

```gherkin
Given two authenticated viewers with different uids
When each requests the front page
Then their SSR HTML for the Top Sites Stream is byte-identical
  (per-viewer badge resolution happens after hydration, inside MembershipBadge)
And the response is shareable across all authenticated viewers

Given an anonymous viewer and an authenticated viewer
When each requests the front page
Then the two responses differ — every <SiteCard> in the
  authenticated response carries the client:idle hydration
  marker; the anonymous response carries none
And each cohort's response is still shareable across viewers
  within that cohort
```

> Per-card rendering scenarios (cover, eyebrow, body, footer,
> badge slot composition) live in
> [`../../sites/site-card/spec.md`](../../sites/site-card/spec.md). Per-viewer
> badge scenarios (owner viewer, player viewer, stranger
> viewer, reactive session updates) live in
> [`../../sites/membership-badge/spec.md`](../../sites/membership-badge/spec.md).

## Migration Debt and Decisions

### v18 patterns that do not carry forward to v20

1. **`packages/sites` lands first (resolved).** v18 keeps the
   Site schema, accessor, and `SiteCard.astro` scattered across
   `src/schemas/`, `src/firebase/client/site/`, and
   `src/components/server/ui/`. v20 ships a tier-4
   `packages/sites` vertical (matching `packages/threads` /
   `packages/profiles`) *before* this stream's implementation
   begins. See [`../../sites/spec.md`](../../sites/spec.md).
2. **Custom element `<cn-card>`.** v18 used the lit-based
   custom element. v20's `SiteCard` composes
   `CnCard.svelte`. Detail in
   [`../../sites/site-card/spec.md`](../../sites/site-card/spec.md).
3. **App-local utility classes.** v18 markup uses
   `flex flex-col`, `flex items-center mt-2`, `grow`,
   `downscaled`, `toolbar`, `button`. None exist in v20 cyan;
   v20 composes DS primitives instead. Per-card detail in
   [`../../sites/site-card/spec.md`](../../sites/site-card/spec.md).
4. **`netlifyImage` / `generateSrcset` helpers.** v18's
   `src/utils/images/netlifyImage.ts` ports to
   `packages/utils/src/images/`. Spec:
   [`../../images/spec.md`](../../images/spec.md). This
   sub-spec consumes the helpers but does not own their
   contract.
5. **`SiteOwnerToken` CSR island → `MembershipBadge`.** v18's
   `<SiteOwnerToken {site} client:only="svelte"/>` renders an
   `avatar` icon for viewers in `owners`. v20's
   `MembershipBadge` carries that pattern forward, expands it
   to also signal players (`uid ∈ players AND uid ∉ owners` →
   `meeple` icon), and only mounts on authenticated requests.
   Spec:
   [`../../sites/membership-badge/spec.md`](../../sites/membership-badge/spec.md).
6. **HTTP self-fetch in the widget.** v18 calls
   `fetch(${Astro.url.origin}/api/sites?limit=5)` inside its
   own frontmatter. v20 reads in-process via the shared
   accessor and ships no `/api/sites.json` HTTP surface at
   MVP (see [`../../sites/spec.md`](../../sites/spec.md));
   the v18 route has no v20 consumer in scope. If a future
   client (mobile app, CSR pagination) needs a JSON surface,
   it gets specced then.
7. **`OnboardingCard` mounted at the top of the stream.** v18
   embeds `<OnboardingCard client:only="svelte"/>` at the top
   of the sites column — a "log in to create a site" pitch
   that conditionally renders based on `$uid`. v20 does NOT
   carry this inside `TopSitesStream`. See Open Decisions #2.
8. **`actions:showMore` i18n namespace.** v18 reads the
   show-more label from a flat top-level `actions:` namespace.
   v20 has consolidated host-owned UX strings under
   `pelilauta:action.*`. Carry forward the v20 namespace.
9. **`toDisplayString` 72-hour relative threshold.** v18's
   relative time caps at 72 hours and falls back to ISO
   afterwards. v20 widens to 7 days inside a dedicated
   `dateLabel` formatter. Spec:
   [`../../dates/spec.md`](../../dates/spec.md).
10. **`hidden`-only public filter.** v18 filters via
    `where('hidden', '==', false)` only. The v20 accessor
    contract uses the modern `{ public: true }` API ergonomic
    (mirroring `getThreads({ public })`); the implementation
    maps `public: true` to the v17 `hidden === false`
    predicate at the storage layer, preserving the data
    contract verbatim.

### Resolved decisions

1. **Sites package landing order — package-first** (Migration
   Debt #1). See
   [`../../sites/spec.md`](../../sites/spec.md).
2. **OnboardingCard placement — not in this stream.** Deferred
   to a later round as a separate front-page concern (likely a
   first-class hero/onboarding region, server-side conditional
   on the session cookie, no CSR island).
3. **Membership badges on the front-page card — present;
   contract owned by**
   [`../../sites/membership-badge/spec.md`](../../sites/membership-badge/spec.md).
   Owner badge (`avatar`), player badge (`meeple`), strangers
   render nothing. CSR-only, mounted only on authenticated
   requests via the `isAuthenticated` prop on `SiteCard`.
4. **Image-helper home —
   [`../../images/spec.md`](../../images/spec.md)** in
   `packages/utils/src/images/`.
5. **Show-more link target — `/sites`** owned by the Sites
   package's directory route (deferred to a TBD sub-spec per
   [`../../sites/spec.md`](../../sites/spec.md) §Authoring DoD;
   the link 404s at MVP).
6. **`flowTime` label format — own util, relative if < 7 days
   else absolute.** Spec:
   [`../../dates/spec.md`](../../dates/spec.md).
7. **System-noun mapping home — Sites domain.** Spec:
   [`../../sites/spec.md`](../../sites/spec.md) §Accessor
   Surfaces (`systemToNoun`).
8. **Membership badge icon nouns — `avatar` (owner), `meeple`
   (player).** Detail:
   [`../../sites/membership-badge/spec.md`](../../sites/membership-badge/spec.md).
9. **Authenticated-mount mechanism — `Astro.locals.session`.**
   The stream's frontmatter reads it once and threads the
   binary truthiness into each card as `isAuthenticated`.
10. **Parent-spec guardrail update — parent updated.** The
    parent `front-page/spec.md`'s "zero client-side
    JavaScript" guardrail has been rewritten to "anonymous =
    zero JS; authenticated = SSR shell + allow-listed
    `client:*` islands."

### Source provenance

- v18 widget: `.tmp/pelilauta-17/src/components/server/FrontPage/TopSitesStream.astro`
- v18 card: `.tmp/pelilauta-17/src/components/server/ui/SiteCard.astro`
- v18 schema: `.tmp/pelilauta-17/src/schemas/SiteSchema.ts`
- v18 API route (NOT carried forward; no v20 consumer in scope):
  `.tmp/pelilauta-17/src/pages/api/sites/index.ts`
- v18 image helpers: `.tmp/pelilauta-17/src/utils/images/netlifyImage.ts`
- v18 system-noun helpers:
  `.tmp/pelilauta-17/src/utils/schemaHelpers.ts`,
  `.tmp/pelilauta-17/src/schemas/nouns.ts`
- v18 owner-badge island (carried forward expanded as
  `MembershipBadge`):
  `.tmp/pelilauta-17/src/components/svelte/sites/SiteOwnerToken.svelte`
- v18 player-derivation precedent:
  `.tmp/pelilauta-17/src/components/svelte/sites/SitePlayersTool.svelte`
- v18 onboarding card (NOT carried forward inside this
  widget):
  `.tmp/pelilauta-17/src/components/svelte/frontpage/OnboardingCard.svelte`
- v18 mount point: `.tmp/pelilauta-17/src/pages/index.astro`
  (inside the front-page's secondary small column, no
  `server:defer`)
