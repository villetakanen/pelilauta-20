---
feature: SiteCard Component
status: draft
maturity: design
last_major_review: 2026-05-04
parent_spec: ./spec.md
---

# Feature: SiteCard Component

> Reverse-spec'd from
> `.tmp/pelilauta-17/src/components/server/ui/SiteCard.astro`. The
> v18 implementation is an Astro component using the lit-based
> `<cn-card>` custom element; v20 ports it to a Svelte 5
> component composed against `CnCard.svelte` so it can render
> inside both Astro pages and Svelte-managed collections.

## Blueprint

### Context

`SiteCard` is the canonical preview projection of a `Site` —
the shape every sites surface uses to summarise a site in a list
or grid. It is reused independently of any single rendering
surface; current consumers include the front-page top-sites
stream and the future `/sites` directory, with profile views,
search results, and any "list of sites" surface joining as they
land. The card sits alongside `MembershipBadge` (a sibling
component owned by [`membership-badge.md`](./membership-badge.md))
and composes it conditionally inside its actions slot.

### Architecture

- **Component:** `packages/sites/src/components/SiteCard.svelte`
  — Svelte 5 component, authored with runes (`$props`,
  `$derived`). SSR-pure: no top-level browser globals, no async
  work in the component body.
- **DS composition:** wraps `CnCard` from `@pelilauta/cyan` and
  uses cyan icon nouns via `CnIcon`. Applies no app-local
  utility classes, no inline styles, no `<style>` block. Missing
  primitives escalate to `packages/cyan/`.
- **Render-from-props:** the component receives prepared data
  as discrete props and renders synchronously. The hosting
  page's Astro frontmatter (or the calling Svelte component) is
  responsible for resolving cover URLs, srcsets, system nouns,
  and the flow-time label upstream.

#### Props

```ts
interface SiteCardProps {
  // Identity / link
  key: string;                   // routes to /sites/{key}
  name: string;                  // linked card title
  description?: string;          // body paragraph; omitted when absent

  // Eyebrow / system noun
  systemNoun: string;            // pre-resolved cyan icon noun
                                 // (caller invokes systemToNoun(site.system))

  // Cover image
  coverUrl?: string;             // pre-resolved single-src URL
                                 // (raw posterURL in dev; netlifyImage(...) in prod)
  coverSrcset?: string;          // pre-resolved srcset string
                                 // (generateSrcset(...) in prod; undefined in dev)
  coverSizes?: string;           // pre-resolved sizes hint
                                 // (e.g. "(max-width: 768px) 100vw, 450px")

  // Footer
  flowTimeLabel: string;         // pre-resolved flow-time string
                                 // (caller invokes flowTimeLabel(site.flowTime, locale))

  // Membership badge (passed through to MembershipBadge)
  owners: readonly string[];     // for the conditional badge
  players: readonly string[];    // for the conditional badge

  // Authentication state — controls whether MembershipBadge mounts
  isAuthenticated: boolean;      // resolved from Astro.locals.session by the caller
}
```

The card consumes `owners` and `players` as data passthroughs
for the badge — it does not branch on them itself; that decision
lives inside `MembershipBadge`.

The `isAuthenticated` flag is the binary "session present"
signal resolved by the page's Astro frontmatter (via
`Astro.locals.session`). When `false`, the card emits no
`client:*` directive in its actions slot. When `true`, the card
emits `<MembershipBadge owners={owners} players={players}
client:idle />`. This split is what lets the front page keep its
shared SSR cache (binary on session-presence, not per-uid) and
its anonymous-zero-JS contract.

#### Markup contract

The card composes `CnCard` with the following slot layout:

- **Title** — `name` rendered as the linked card title; the
  link target is `/sites/{key}`.
- **Cover** — `<img>` with `src={coverUrl}`,
  `srcset={coverSrcset}` (when defined), `sizes={coverSizes}`
  (when defined), and an empty `alt` (decorative — the title is
  the link). When `coverUrl` is undefined, no `<img>` renders;
  the card layout collapses naturally.
- **Eyebrow** — `<CnIcon noun={systemNoun} />` placed in the
  card's eyebrow slot. The eyebrow renders even when the system
  is unknown (`systemToNoun` returns `"homebrew"` as the
  fallback noun, so the eyebrow is always populated).
- **Body** — `description` rendered as a single `<p>`. When
  `description` is undefined or empty, no body paragraph
  renders.
- **Actions slot** — a `<div>` with two children:
  1. `MembershipBadge` (only emitted when
     `isAuthenticated === true`, per the §Props rule above).
  2. `<p>{flowTimeLabel}</p>` — the flow-time footer string,
     always rendered.

The card surfaces no owner identity as text — there is no
byline, no nick, no avatar image, no profile link. The
membership badge is a per-viewer self-membership signal, not a
byline. See [`membership-badge.md`](./membership-badge.md) for
the badge contract.

#### Constraints

- **SSR-safe.** No browser globals at module evaluation, no
  async work in the component body. Renders synchronously when
  given props.
- **Render-from-props.** The card does no data fetching, no
  schema parsing, no markdown transforms, no date formatting,
  and no image-URL transforms. All of those happen upstream.
- **Apps never override the DS.** No `<style>` blocks, no
  inline `style="..."` attributes, no app-local utility
  classes. Layout, typography, and spacing compose cyan
  primitives (`CnCard`'s slots and tokens). Missing primitives
  escalate to `packages/cyan/`.
- **Anonymous render is zero-JS.** When `isAuthenticated` is
  `false`, the card's rendered HTML contains no `client:*`
  directive anywhere. This preserves the front-page
  anonymous-SSR contract for any consuming page that follows
  the same rule.
- **i18n-agnostic at the component level.** The card receives
  pre-resolved strings (`flowTimeLabel`, `description`, `name`)
  as props. It does not import locale data and does not call
  `t(...)`. Any locale-bound string is the caller's
  responsibility.

### Dependencies

- `@pelilauta/cyan` — `CnCard.svelte`, `CnIcon.svelte`.
- `@pelilauta/sites` (sibling exports) —
  `MembershipBadge.svelte` from `./components`. The card
  imports the sibling component directly (intra-package
  import); the sibling's contract is owned by
  [`membership-badge.md`](./membership-badge.md).

### Consumers (initial)

- [`../front-page/top-sites-stream/spec.md`](../front-page/top-sites-stream/spec.md)
  — front-page latest-sites column (small, tertiary).
- The future `/sites` directory page (parent spec
  [`./spec.md`](./spec.md) §Routes) — will reuse the same card.
- Any future surface that lists sites (profile views, search
  results, "my sites" dashboards) — same.

## Contract

### Definition of Done

- [ ] `packages/sites/src/components/SiteCard.svelte` exists and
      exports a Svelte 5 component matching the §Props
      interface above.
- [ ] The card composes `CnCard` from `@pelilauta/cyan`. It
      contains no `<style>` block, no inline `style="..."`
      attribute, and no app-local utility classes anywhere in
      its template.
- [ ] When `coverUrl` is provided, the card renders an `<img>`
      with `src={coverUrl}` and (when defined) `srcset`,
      `sizes`. When `coverUrl` is undefined, no `<img>` renders.
- [ ] The card eyebrow renders `<CnIcon noun={systemNoun} />`
      whether or not the noun is the `"homebrew"` fallback.
- [ ] When `description` is a non-empty string, a single body
      `<p>` renders it; otherwise no body paragraph renders.
- [ ] The card's title link points to `/sites/{key}`.
- [ ] The actions slot always renders `<p>{flowTimeLabel}</p>`.
- [ ] The actions slot renders
      `<MembershipBadge owners={owners} players={players} client:idle />`
      if-and-only-if `isAuthenticated === true`. When
      `isAuthenticated === false`, no `client:*` directive
      appears anywhere in the card's rendered HTML.
- [ ] The card is SSR-pure: rendering on the server with valid
      props produces the expected HTML without throwing on
      `window` / `document` / browser-only APIs.
- [ ] The card is type-safe: `pnpm check:types` passes against
      the `SiteCardProps` shape.

### Regression Guardrails

- The component MUST NOT call `getProfile`, import from
  `@pelilauta/profiles`, or render an owner byline. Adding a
  byline is a different feature on a different surface; this
  card's role is preview, not citation.
- The component MUST NOT call `markdownToHTML`,
  `markdownToPlainText`, `netlifyImage`, `generateSrcset`, or
  `flowTimeLabel`. All of those are upstream concerns; the
  card consumes their pre-resolved outputs as props.
- The component MUST NOT inline data fetching of any kind. Any
  Firestore read inside the card is a regression.
- Adding a `<style>` block, inline `style="..."`, or app-local
  utility class anywhere in the template is a regression
  against the apps-never-override-DS rule.
- Removing the conditional `client:idle` on
  `MembershipBadge` — i.e. mounting the badge on
  unauthenticated requests — is a regression against the
  anonymous-zero-JS contract.

### Testing Scenarios

#### Scenario: Renders title, cover, eyebrow, body, footer

```gherkin
Given valid SiteCardProps with coverUrl, coverSrcset, coverSizes,
  systemNoun, description, flowTimeLabel, name, key, owners=[],
  players=[], isAuthenticated=false
When SiteCard renders
Then the card title is "name" linked to "/sites/{key}"
And an <img> renders with src={coverUrl}, srcset={coverSrcset},
  sizes={coverSizes}, alt=""
And the eyebrow contains a <CnIcon> with noun={systemNoun}
And the body renders a single <p> with text equal to description
And the actions slot contains <p>{flowTimeLabel}</p>
And no MembershipBadge or other client:* directive appears in the rendered HTML
```

#### Scenario: Site without posterURL renders without a cover image

```gherkin
Given valid SiteCardProps with coverUrl=undefined, coverSrcset=undefined,
  coverSizes=undefined
When SiteCard renders
Then no <img> element appears in the card
And the eyebrow, title, body, and footer still render
And the layout collapses naturally (no broken-image placeholder)
```

#### Scenario: Site without description renders without a body paragraph

```gherkin
Given valid SiteCardProps with description=undefined
When SiteCard renders
Then no body <p> renders below the title
And the title, eyebrow, cover, and footer still render
```

#### Scenario: Authenticated render emits a single MembershipBadge island

```gherkin
Given valid SiteCardProps with isAuthenticated=true,
  owners=["u-alice"], players=["u-bob"]
When SiteCard renders
Then exactly one <MembershipBadge owners={["u-alice"]} players={["u-bob"]} client:idle />
  is emitted inside the card's actions slot
And the badge appears alongside the flow-time footer paragraph
```

#### Scenario: Anonymous render emits no client:* directive

```gherkin
Given valid SiteCardProps with isAuthenticated=false
When SiteCard renders
Then no client:* directive appears anywhere in the rendered HTML for this card
And no MembershipBadge mount marker appears in the rendered HTML
```

#### Scenario: Card composes only DS primitives

```gherkin
Given the rendered HTML of a SiteCard
When the rendered output is inspected
Then the root element is the CnCard primitive (not a bare <div> or <article>)
And no element carries a class attribute referencing an app-local or v18-style utility
  ("flex flex-col", "downscaled", "toolbar", etc.)
And no inline style="..." attribute appears in the card's subtree
```
