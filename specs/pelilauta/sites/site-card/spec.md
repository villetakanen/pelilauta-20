---
feature: SiteCard Component
status: draft
maturity: design
last_major_review: 2026-05-04
parent_spec: ../spec.md
---

# Feature: SiteCard Component

> Reverse-spec'd from
> `.tmp/pelilauta-17/src/components/server/ui/SiteCard.astro`. v18
> uses Astro + the lit-based `<cn-card>`; v20 ports it to a Svelte 5
> component composed against `CnCard.svelte` so the same card can
> render statically inside Astro pages (front-page, `/sites`) **and**
> inside hydrated Svelte collections (`/library/sites` filterable
> grid). The conditional `MembershipBadge` mount is owned by the
> consumer, not the card — see §Authentication wiring below.

## Blueprint

### Context

`SiteCard` is the canonical preview projection of a `Site` —
the shape every sites surface uses to summarise a site in a list
or grid. It is reused independently of any single rendering
surface; current consumers are the front-page top-sites stream,
the `/sites` directory, and `/library/sites` (sites the viewer
is a member of). Profile views, search results, and any other
"list of sites" surface will reuse the same card. The card
composes `MembershipBadge` (a sibling component owned by
[`../membership-badge/spec.md`](../membership-badge/spec.md))
inside its actions area when the consumer signals an
authenticated viewer.

### Architecture

- **Component:** `packages/sites/src/components/SiteCard.svelte`
  — Svelte 5 component, authored with runes (`$props`,
  `$derived`). SSR-pure: no top-level browser globals, no async
  work in the component body.
- **DS composition:** wraps `CnCard` from `@pelilauta/cyan` and
  composes `CnIcon` only via CnCard's built-in `noun` prop.
  Renders no app-local utility classes, no inline styles, no
  `<style>` block. Missing primitives escalate to
  `packages/cyan/`.
- **Render-from-props:** the component receives prepared data
  as discrete props and renders synchronously. The hosting
  page's Astro frontmatter (or the calling Svelte component) is
  responsible for resolving cover URLs/srcsets, the system
  noun, the system label, the system href, and the date label
  upstream.

#### Props

```ts
interface SiteCardProps {
  // Identity / link
  key: string;                   // routes to /sites/{key}
  name: string;                  // linked card title
  description?: string;          // body paragraph; omitted when absent

  // System (eyebrow link + icon)
  systemNoun: string;            // pre-resolved cyan icon noun
                                 // (caller invokes systemToNoun(site.system))
  systemLabel: string;           // pre-resolved localized system name
                                 // (t('sites:site.systems.{system}'),
                                 //  fallback to raw site.system slug)
  systemHref: string;            // pre-resolved tag-route target
                                 // (`/tags/${site.system}`)

  // Cover image
  coverUrl?: string;             // pre-resolved single-src URL
                                 // (raw posterURL in dev; netlifyImage(...) in prod)
  coverSrcset?: string;          // pre-resolved srcset string
                                 // (generateSrcset(...) in prod; undefined in dev)
  coverSizes?: string;           // pre-resolved sizes hint
                                 // (e.g. "(max-width: 768px) 100vw, 450px")

  // Footer
  dateLabel: string;             // pre-resolved date label
                                 // (caller invokes dateLabel(site.flowTime, locale))

  // Membership badge
  isAuthenticated: boolean;      // resolved from Astro.locals.session by the caller
  owners: readonly string[];     // for the conditional badge
  players: readonly string[];    // for the conditional badge
}
```

#### Markup contract — CnCard prop wiring

SiteCard composes `CnCard` by passing props through; CnCard owns
the markup. The wiring is:

| SiteCard prop | CnCard surface | Rendered HTML (when present) |
|---|---|---|
| `name` | `title` | `<h4 class="title"><a href={href}>{name}</a></h4>` |
| `key` | `href={`/sites/${key}`}` | wraps `title` in the link; cover too (`tabindex="-1"`) |
| `coverUrl` | `cover` | `<img src srcset sizes alt="" loading="lazy">` + tint overlay; omitted when undefined |
| `coverSrcset` | `srcset` | passes to the `<img>` |
| `coverSizes` | `sizes` | passes to the `<img>` |
| `description` | `description` | `<p class="description">{description}</p>`; omitted when undefined or empty |
| `systemNoun` | `noun` | corner overlay `<CnIcon noun size="large">` (with cover) or title-prefix `<CnIcon noun size="small">` (without cover) |
| (snippet) | `eyebrow` | `<a href={systemHref}>{systemLabel}</a>` (always rendered) |
| (snippet) | `actions` | `<p>{dateLabel}</p>` always; `<MembershipBadge owners players />` when `isAuthenticated === true` |

The card surfaces no owner identity as text — there is no
byline, no nick, no avatar image, no profile link. The
membership badge is a per-viewer self-membership signal, not a
byline. See [`../membership-badge/spec.md`](../membership-badge/spec.md)
for the badge contract.

#### Authentication wiring

Because SiteCard is Svelte, it cannot emit `client:*` directives
on its child components — that's Astro template syntax. The
conditional-CSR mount of `MembershipBadge` therefore happens at
the **consumer**, not inside SiteCard:

- **Astro consumers (TopSitesStream, `/sites`):** the page
  applies `client:idle` to the `<SiteCard>` tag itself when
  `isAuthenticated === true`, and omits it otherwise. SiteCard's
  template renders `{#if isAuthenticated}<MembershipBadge … />{/if}`;
  on anonymous renders the conditional short-circuits at SSR,
  emits no badge HTML, and ships zero JS. On authenticated
  renders the whole card hydrates and the badge runs as part of
  it.
- **Svelte-collection consumers (`/library/sites`):** the
  collection itself is already hydrated, so SiteCard hydrates
  with it. No `client:*` is needed; the badge is just a normal
  Svelte child.

The card's API (`isAuthenticated`, `owners`, `players`) is
identical in both cases. Only the consumer's mount mechanism
differs.

### Dependencies

- `@pelilauta/cyan` — `CnCard.svelte` (`CnIcon` composed
  transitively via CnCard's `noun` prop).
- `@pelilauta/sites` (sibling exports) —
  `MembershipBadge.svelte` from `./components`. Intra-package
  import; the sibling's contract is owned by
  [`../membership-badge/spec.md`](../membership-badge/spec.md).

### Constraints

- **SSR-safe.** No browser globals at module evaluation, no
  async work in the component body. Renders synchronously when
  given props.
- **Render-from-props.** The card does no data fetching, no
  schema parsing, no markdown transforms, no date formatting,
  no image-URL transforms, and no `t(...)` calls. All of those
  happen upstream.
- **Apps never override the DS.** No `<style>` blocks, no
  inline `style="..."`, no app-local utility classes. Layout,
  typography, spacing, and link styling come from CnCard's
  primitive surface.
- **Anonymous render is zero-JS by consumer contract.** When
  the consumer renders SiteCard with `isAuthenticated === false`
  and no `client:*` directive, the SSR HTML carries no badge
  and ships no JS for this card.

### Consumers (initial)

- [`../../front-page/top-sites-stream/spec.md`](../../front-page/top-sites-stream/spec.md)
  — front-page latest-sites column (Astro consumer, mixed
  audience, per-card `client:idle` only when authenticated).
- The `/sites` public directory page (parent spec
  [`../spec.md`](../spec.md) §Authoring DoD — TBD route) —
  same Astro pattern as the front page.
- The `/library/sites` member-sites page (TBD route, hosts
  the cards inside a hydrated Svelte collection for
  sort/filter — owns its own mount contract; SiteCard renders
  identically).

## Contract

### Definition of Done

- [ ] `packages/sites/src/components/SiteCard.svelte` exists and
      exports a Svelte 5 component matching the §Props
      interface.
- [ ] The card composes `CnCard` from `@pelilauta/cyan` and
      contains no `<style>` block, no inline `style="..."`
      attribute, and no app-local utility classes anywhere in
      its template.
- [ ] CnCard prop wiring matches the table in §Markup contract:
      `title`, `href`, `cover`/`srcset`/`sizes`, `description`,
      `noun`, plus `eyebrow` and `actions` snippets.
- [ ] The eyebrow snippet renders
      `<a href={systemHref}>{systemLabel}</a>`, always present.
- [ ] The actions snippet always renders `<p>{dateLabel}</p>`.
- [ ] The actions snippet renders `<MembershipBadge owners players />`
      if-and-only-if `isAuthenticated === true`. The card's
      template contains no `client:*` directive (consumer
      owns that decision).
- [ ] The card is SSR-pure: rendering on the server with valid
      props produces the expected HTML without throwing on
      `window` / `document` / browser-only APIs.

### Regression Guardrails

- The component MUST NOT call `getProfile`, import from
  `@pelilauta/profiles`, or render an owner byline.
- The component MUST NOT call `markdownToHTML`,
  `markdownToPlainText`, `netlifyImage`, `generateSrcset`,
  `dateLabel`, `systemToNoun`, or `t(...)`. All of those are
  upstream concerns.
- The component MUST NOT inline data fetching of any kind. Any
  Firestore read inside the card is a regression.
- The component template MUST NOT contain a `client:*`
  directive on `MembershipBadge` or any other child. Mount
  decisions belong to the consumer (Astro page or Svelte
  collection).

### Testing Scenarios

#### Scenario: Renders title, cover, eyebrow link, body, footer

```gherkin
Given valid SiteCardProps with coverUrl, coverSrcset, coverSizes,
  systemNoun, systemLabel, systemHref, description, dateLabel,
  name, key, owners=[], players=[], isAuthenticated=false
When SiteCard renders
Then the card title is "name" linked to "/sites/{key}"
And an <img> renders with src={coverUrl}, srcset={coverSrcset},
  sizes={coverSizes}, alt=""
And the card composes CnCard with noun={systemNoun} (so the icon
  appears as the corner overlay when cover is present)
And the eyebrow contains <a href={systemHref}>{systemLabel}</a>
And a single <p> with text equal to description renders
And the actions area contains <p>{dateLabel}</p>
And no MembershipBadge appears in the rendered HTML
```

#### Scenario: Site without posterURL renders without a cover image

```gherkin
Given valid SiteCardProps with coverUrl=undefined, coverSrcset=undefined,
  coverSizes=undefined
When SiteCard renders
Then no <img> element appears in the card
And the eyebrow link, title (with inline noun icon), description,
  and footer still render
```

#### Scenario: Site without description renders without a body paragraph

```gherkin
Given valid SiteCardProps with description=undefined
When SiteCard renders
Then no <p class="description"> renders below the title
And the title, eyebrow link, cover, and footer still render
```

#### Scenario: Authenticated render emits a MembershipBadge inside actions

```gherkin
Given valid SiteCardProps with isAuthenticated=true,
  owners=["u-alice"], players=["u-bob"]
When SiteCard renders
Then exactly one <MembershipBadge owners={["u-alice"]} players={["u-bob"]} />
  is emitted inside the card's actions area
And the badge appears alongside the date-label paragraph
And the rendered template contains no client:* directive
```

#### Scenario: Anonymous render emits no badge

```gherkin
Given valid SiteCardProps with isAuthenticated=false
When SiteCard renders
Then no MembershipBadge element appears anywhere in the card's
  rendered HTML
And no client:* directive appears anywhere in the rendered template
```

#### Scenario: Card composes only DS primitives

```gherkin
Given the rendered HTML of a SiteCard
When the rendered output is inspected
Then the root element is the CnCard primitive (not a bare <div> or <article>
  authored by SiteCard)
And no element carries a class attribute referencing an app-local or
  v18-style utility ("flex flex-col", "downscaled", "toolbar", etc.)
And no inline style="..." attribute appears in the card's subtree
```
