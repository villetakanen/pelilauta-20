---
feature: CnBackgroundPoster
parent_spec: ../spec.md
stylebook_url: https://cyan.pelilauta.social/components/cn-background-poster
---

# Feature: CnBackgroundPoster

## Blueprint

### Context

`CnBackgroundPoster` is the singleton atmospheric-background primitive for
landing / hub / chrome pages (front page, site index, channels index,
library). It renders a decorative full-viewport image behind the page
content, dissolved into the page surface by a gradient wash so text at
any vertical position stays readable. One per page; never part of
threaded or editorial content surfaces where the image would compete
with prose.

Reversed from
[`pelilauta-17/src/components/server/ui/BackgroundPoster.astro`](.tmp/pelilauta-17/src/components/server/ui/BackgroundPoster.astro)
(component markup) and
[`cyan-design-system-4/packages/cyan-css/src/core/cn-background-poster.css`](https://github.com/villetakanen/cyan-design-system-4/blob/main/packages/cyan-css/src/core/cn-background-poster.css)
(DS styling). In cyan-4 the CSS lived under `core/` and each app wrote
its own thin Astro wrapper; in v20 the component + its styles are
co-located as a DS primitive so every consumer gets identical behaviour.

### Architecture

- **Components:**
  - `packages/cyan/src/components/CnBackgroundPoster.astro` — Astro
    component (SSR-only, no `client:` directive). Renders
    `<div id="cn-background-poster"><picture>…<img></picture></div>`
    with srcset-driven responsive source selection and owns the
    global CSS for the ID selector via a scoped `<style is:global>`
    block (the ID selector must be global so the ::before wash and
    mix-blend interactions work regardless of Astro's scope hashing).
  - Consumed via a dedicated layout slot `app-background-poster` on
    `Page` / `AppShell` so the poster mounts outside the `<main>`
    content grid and sits behind all chrome.
- **Data Models:** N/A (presentational).
- **API Contracts:**
  - **Props:** `src: string` (required — default image URL, also the
    `<img src>` fallback used below the `md` breakpoint);
    `md?: string` (optional — larger-viewport image via a
    `<source media="(min-width: 960px)" srcset={md}>` entry).
  - **Slots:** none.
  - **Markup stamped:** `<div id="cn-background-poster">` as the
    outermost element. Consumers and the DS both target this ID.
  - **Singleton:** exactly one `#cn-background-poster` per page.
    ID-based selector enforces the "one atmospheric image" contract at
    the DOM level; multiple posters on a page are a user error, not a
    supported pattern.
- **Dependencies:**
  - Tokens from `packages/cyan/src/tokens/semantic.css`:
    `--cn-surface` (bottom gradient stop — image dissolves into the
    page background), plus the chroma ramp (`--chroma-surface-*`,
    `--chroma-primary-*`) for the intermediate wash stops.
  - `color-scheme: light dark` on `:root` (already set by
    `semantic.css`) so the component's `light-dark()` branches resolve.
- **Constraints:**
  - Zero JavaScript. Pure Astro SSR; the image loads lazily
    (`loading="lazy"`) and the gradient is CSS-only.
  - Only `--cn-*` / `--chroma-*` tokens. The image's fade-to-surface
    bottom stop is `var(--cn-surface)` — no `--color-background` /
    `--cyan-*` legacy tokens.
  - **Singleton.** The element is selected by ID; there is exactly
    one per rendered page.
  - **Decorative.** `alt=""` is the contract — the poster carries no
    information content.
  - **Behind content.** `z-index: -1` (or equivalent stacking via
    `position: absolute` + content on the default stacking order) so
    the poster never intercepts pointer events.
  - **Full-bleed.** Spans `100dvw` width (dynamic viewport — respects
    mobile browser chrome retraction).
  - **Theme-aware.** The wash is painted by **two pseudo-elements**:
    - `::before` — atmospheric colour-shift layer. A
      `linear-gradient(180deg, …)` of `--chroma-primary-*` stops (10 →
      80) with `mix-blend-mode: hard-light` and `opacity: 44%` in dark
      mode. In light mode, `::before` is overridden with a different ramp
      (`--chroma-surface-90 → --chroma-primary-40 → --chroma-primary-80`)
      and `mix-blend-mode: overlay, opacity: 1`. The blend mode is the
      primary theme cue — dark hard-lights, light overlays.
    - `::after` — bottom fade. `linear-gradient(180deg, transparent 0%,
      var(--cn-surface) 95%)`. This dissolves the image into the page
      surface (matching body's `--cn-surface`) in both themes without any
      media override.
    Both branches MUST use `color-mix(in oklab, …)` (or `oklch`) — not
    `hsl` — matching the rest of v20's gradient contract (see [buttons
    spec](../../core/buttons/spec.md)).
  - **Image colour grading.** The image (`#cn-background-poster img`)
    sits at `opacity: 0.72` in both themes. There is no
    `filter: sepia(…)` anywhere — earlier drafts applied one in light
    mode; that approach was dropped. Dark mode ships the image at
    `opacity: 0.72` with no filter; light mode keeps the same `0.72`
    opacity.
  - **No `nav#rail` rule.** cyan-4's light-mode rule
    `body:has(#cn-background-poster) nav#rail { mix-blend-mode: multiply; }`
    targets a legacy cyan-4 rail nav that v20 does not ship. This
    rule is NOT ported.
  - **Hide below small breakpoint.** Below the DS's narrow-viewport
    threshold the poster is not rendered (decorative chrome is the
    first thing to cut on small screens). v20 uses `@media
    (max-width: 620px) { display: none; }` — the cyan-4 `.sm-hidden`
    utility class is replaced by a scoped media query.
  - **Chrome cedes to the poster.** When the poster is mounted
    (`body:has(#cn-background-poster)`):
    - Body background is **not** overridden — it keeps `var(--cn-surface)`
      from `AppShell.astro`. The poster's `::after` pseudo-element fades
      the image into the same `var(--cn-surface)` at its bottom, so body
      and poster meet seamlessly.
    - AppBar token overrides unchanged: `--cn-app-bar-background` and
      `--cn-app-bar-background-sticky` both `transparent`, preserving the
      sticky-scroll animation while making it interpolate between two
      transparent values.
    - Tray's `.cn-drawer` (the element that paints the rail surface) gets
      a semi-transparent surface wash: `background-color: color-mix(in
      oklab, var(--cn-surface), transparent 66%)`. The outer `.cn-tray`
      wrapper is unchanged — it's already transparent by default, so only
      the drawer needs a rule.
    - No `backdrop-filter`. The semi-transparent surface + the poster's
      wash together provide enough separation.
  - **Chrome legibility halo.** Chrome selectors (`.cn-app-bar`,
    `.cn-tray`) carry a three-stop `text-shadow` glow — `0 0 4px`,
    `0 0 8px`, `0 0 16px` (larger radii than the earlier draft). All
    three stops use `color-mix(in oklab, var(--cn-surface), transparent
    77%)` — the halo colour derives from the page surface token, NOT the
    raw chroma ramp. This ties the halo visually to whatever the page
    surface is in the current theme. `text-shadow` inherits, so
    descendant labels and icons pick it up without per-element styling.

### Layout wiring

- `packages/cyan/src/layouts/AppShell.astro` exposes a named slot
  `app-background-poster` positioned as an absolutely-placed child of
  `<body>`, rendered before `<header>` / `<main>` in DOM order so
  stacking is deterministic.
- `packages/cyan/src/layouts/Page.astro` forwards the
  `app-background-poster` slot verbatim (per the
  [Page pass-through rule](../../layouts/page/spec.md#properties)).
- Consumer pages mount the poster via
  `<CnBackgroundPoster slot="app-background-poster" src="..." md="..." />`.
  No other mounting point is supported.

### Book Page

- **Target path:** `app/cyan-ds/src/content/components/cn-background-poster.mdx`,
  rendered at URL `/components/cn-background-poster`.
- **Narrative frame:** the poster is a page-level atmospheric affordance
  — one per page, mounted via the `app-background-poster` slot on
  `Page` / `AppShell`. The book page demonstrates the visual outcome
  in both themes and documents the slot contract.
- **Structure:**
  1. **Intro** — one paragraph: what the poster does, when to use it
     (landing / hub pages), when not to (prose / thread detail pages).
  2. **Dual-theme demo** — a `ThemeSplit` block showing the poster
     with a sample image (e.g. a 1920×1080 photo) behind a short
     column of prose so both the image visibility and the bottom
     fade-to-surface are observable.
  3. **Responsive demo** — a narrow-viewport frame demonstrating that
     the poster is hidden below the small breakpoint.
  4. **Slot wiring snippet** — exact code for
     `<Page><CnBackgroundPoster slot="app-background-poster" src="..." /></Page>`.
  5. **Props table** — `src` (required), `md` (optional).
  6. **Token table** — `--cn-surface`, plus the chroma ramp stops
     consumed by the wash.
- **Live demo mechanism:** the book page does NOT mount the component
  inline in its MDX body. Instead, the `poster` frontmatter field
  (declared in `bookSchema` at `app/cyan-ds/src/content/config.ts` and
  forwarded by `Book.astro`) renders `<CnBackgroundPoster slot="app-background-poster" src={frontmatter.poster} />`
  inside the book's underlying `<Page>`. This keeps the slot-only
  mounting contract intact — `Book.astro` is simply a slot consumer
  with a frontmatter-driven convenience layer.

## Contract

### Definition of Done

- [ ] `packages/cyan/src/components/CnBackgroundPoster.astro` exists
      and renders the `<div id="cn-background-poster">` wrapper with a
      `<picture>` containing an optional `md` `<source>` and the base
      `<img>` with `loading="lazy"` and `alt=""`.
- [ ] The component's scoped stylesheet positions the element
      absolutely at top-left of the viewport, spans `100dvw`, sits
      behind page content in the stacking order, and renders a
      gradient `::before` wash that fades into `var(--cn-surface)` at
      the bottom.
- [ ] Only `--cn-*` / `--chroma-*` tokens appear in the stylesheet.
      No `--color-*`, no `--cyan-*`, no hardcoded colours or
      pixel values other than gradient percentage stops.
- [ ] `color-mix()` calls use `in oklab` or `in oklch`, never `hsl`.
- [ ] Image is rendered at `opacity: 0.72` in both themes with no
      `filter`. Light-mode branch overrides `::before` with a distinct
      gradient ramp and `mix-blend-mode: overlay`; dark-mode `::before`
      uses `mix-blend-mode: hard-light`. No `filter: sepia(…)` anywhere.
- [ ] The poster is hidden below the `620px` viewport via a scoped
      media query. No reliance on a `.sm-hidden` utility class.
- [ ] `AppShell.astro` exposes an `app-background-poster` named slot
      placed behind `<header>` and `<main>` in the layout grid;
      `Page.astro` forwards it.
- [ ] Book page at `app/cyan-ds/src/content/components/cn-background-poster.mdx`
      exists, rendered at `/components/cn-background-poster`, with
      dual-theme demo, responsive demo, slot-wiring snippet, props
      table, and token table.
- [ ] The component contains no `client:` directive, no `<script>`,
      and no consumer-side JS hooks.

### Regression Guardrails

- **Singleton invariant.** The DOM never contains more than one
  `#cn-background-poster` on the same page. Regressions that produce
  duplicate IDs would break the gradient wash (overlapping `::before`
  elements) and violate the decorative-singleton contract.
- **Behind content, always.** Any regression that puts the poster
  above content in the stacking order is visible and functional (the
  image would intercept clicks); `z-index: -1` + `position: absolute`
  MUST be preserved.
- **Gradient colour-space is `oklab` / `oklch`.** Reverting to `hsl`
  mixing re-introduces banding in the mid-stops and diverges from
  the v20 gradient contract shared with buttons.
- **Decorative `alt=""`.** Accessibility regression if a regression
  adds a non-empty `alt` to a decorative image — screen readers
  would announce a meaningless filename.
- **No `nav#rail` interaction.** v20 does not ship a rail nav; any
  port of cyan-4's `body:has(#cn-background-poster) nav#rail { mix-blend-mode: multiply }`
  is dead code and must not reappear.
- **Slot-only mounting.** The component may only be mounted via the
  `app-background-poster` slot on `Page` / `AppShell`. Pages that
  drop it as a direct child of `<main>` break the stacking / full-bleed
  contract.

### Testing Scenarios

#### Scenario: Singleton mounts via the layout slot

```gherkin
Given a page composed with `<Page>` that passes
  `<CnBackgroundPoster slot="app-background-poster" src="/a.webp" />`
When the page is server-rendered
Then the DOM contains exactly one element with id `cn-background-poster`
And that element is a sibling of (not a descendant of) `<main>`
And the rendered `<img>` has `alt=""` and `loading="lazy"`
```
- **Vitest Unit Test:** `packages/cyan/src/components/CnBackgroundPoster.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/cn-background-poster.spec.ts`

#### Scenario: Responsive source selection

```gherkin
Given a `CnBackgroundPoster` rendered with `src="/sm.webp"` and `md="/md.webp"`
Then the rendered `<picture>` contains a `<source>` with
  `media="(min-width: 960px)"` and `srcset="/md.webp"`
And the fallback `<img>` has `src="/sm.webp"`
```
- **Vitest Unit Test:** `packages/cyan/src/components/CnBackgroundPoster.test.ts`

#### Scenario: Hidden on narrow viewports

```gherkin
Given a page with `CnBackgroundPoster` mounted
When the viewport width is less than 620px
Then the computed `display` of `#cn-background-poster` is `none`
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/cn-background-poster.spec.ts`

#### Scenario: Theme-aware treatment

```gherkin
Given a `CnBackgroundPoster` mounted on a page
When the document color-scheme resolves to dark
Then the `<img>` computed `opacity` is 0.72
And the computed `filter` is `none`
And `#cn-background-poster::before` uses `mix-blend-mode: hard-light`

When the document color-scheme resolves to light
Then the `<img>` computed `opacity` is still 0.72 (unchanged between themes)
And the computed `filter` is `none` (no sepia or other filter applied)
And the light-mode branch overrides `#cn-background-poster::before` with
  a distinct `linear-gradient` ramp and `mix-blend-mode: overlay`
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/cn-background-poster.spec.ts`

#### Scenario: Gradient wash uses token-driven OKLab stops

```gherkin
Given the CnBackgroundPoster stylesheet is loaded
When the stylesheet text is inspected
Then every `color-mix(...)` call uses `in oklab` or `in oklch`
  (never `in hsl`)
And the bottom stop of the wash is `var(--cn-surface)`
  (never `--color-background` or a hardcoded colour)
```
- **Vitest Unit Test:** `packages/cyan/src/components/CnBackgroundPoster.test.ts`
  (parses the scoped stylesheet text from the `.astro` source and
  asserts selector / token invariants — same pattern as
  `packages/cyan/src/core/buttons.test.ts`)

#### Scenario: Chrome backgrounds and halo under the poster

```gherkin
Given the CnBackgroundPoster stylesheet is loaded
When the stylesheet text is inspected
Then `body:has(#cn-background-poster)` overrides `--cn-app-bar-background`
  and `--cn-app-bar-background-sticky` to `transparent` (body background
  itself is NOT overridden — it keeps `var(--cn-surface)` from AppShell)
And `body:has(#cn-background-poster) .cn-drawer` declares
  `background-color: color-mix(in oklab, var(--cn-surface), transparent 66%)`
And chrome selectors `.cn-app-bar` and `.cn-tray` carry a multi-stop
  `text-shadow` using `color-mix(in oklab, var(--cn-surface), transparent 77%)`
  stops for label legibility over the image
```
- **Vitest Unit Test:** `packages/cyan/src/components/CnBackgroundPoster.test.ts`
