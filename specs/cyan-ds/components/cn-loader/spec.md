---
feature: CnLoader
parent_spec: specs/cyan-ds/components/spec.md
stylebook_url: https://cyan.pelilauta.social/components/cn-loader
---

# Feature: CnLoader

## Blueprint

### Context

`CnLoader` is the design system's canonical loading indicator. It
combines a spinning dual-ring border (motion signal: "something is
happening") with a static centred icon (context signal: "this is what
is loading"). Consumers drop it into a container or a button to
communicate async progress.

Reversed from `villetakanen/cyan-design-system-4`:
- Lit custom element (source): [`packages/cyan-lit/src/cn-loader/cn-loader.ts`](https://github.com/villetakanen/cyan-design-system-4/blob/main/packages/cyan-lit/src/cn-loader/cn-loader.ts)
- Light-dom CSS: [`packages/cyan-css/src/core/cn-loader.css`](https://github.com/villetakanen/cyan-design-system-4/blob/main/packages/cyan-css/src/core/cn-loader.css)
- Tokens: [`packages/cyan-css/src/tokens/loader.css`](https://github.com/villetakanen/cyan-design-system-4/blob/main/packages/cyan-css/src/tokens/loader.css)
- Book page: [`apps/cyan-docs/src/books/custom-elements/cn-loader.mdx`](https://github.com/villetakanen/cyan-design-system-4/blob/main/apps/cyan-docs/src/books/custom-elements/cn-loader.mdx)

**Note on architecture divergence from source:** cyan-4 ships this as a
Lit custom element (`<cn-loader>` with boolean attributes). v20's DS has
intentionally dropped custom elements in favour of Svelte 5 components
that render class-tagged light-DOM markup (see [cn-icon spec](../cn-icon/spec.md)).
CnLoader follows the same pattern: it's a Svelte component producing
`<span class="cn-loader">…</span>`, and every cross-component selector
uses classes (`.cn-loader`, `.cn-icon`, `.cn-card`) rather than tag
names.

### Architecture

- **Components:**
  - Svelte 5 component at
    `packages/cyan/src/components/cn-loader/CnLoader.svelte`. Renders
    light-DOM markup: a wrapper `<span class="cn-loader">` containing a
    `<span class="lds-dual-ring">` element and a nested `<CnIcon>`
    Svelte component. No shadow DOM, no custom element registration.
  - Companion global stylesheet at
    `packages/cyan/src/components/cn-loader/cn-loader.css`. Holds rules
    that can't be component-scoped because they depend on the parent
    selector — specifically auto-centring `<span class="cn-loader">`
    when it is a direct child of `<section>`, `<article>`, or
    `<article class="cn-card">`. Imported from the DS CSS entry.
  - Colocated test at
    `packages/cyan/src/components/cn-loader/CnLoader.test.ts`.
  - Token additions folded into the DS token layer (location per v20
    convention — either `packages/cyan/src/tokens/semantic.css` or a
    dedicated `tokens/cn-loader.css` file imported from the tokens
    index).
- **API Contract (Svelte props):**
  - `noun` — `string`, default `"fox"`. Forwarded to the nested
    `<CnIcon>` as its `noun` prop.
  - `inline` — `boolean`, default `false`. When `true`, the loader
    shrinks to `--cn-line` (24px) square and the nested `<CnIcon>` is
    passed `size="medium"`. When `false`, the loader renders at
    `--cn-loader-size` and the icon is passed `size="large"`.
- **Data Models:** N/A (presentational).
- **Dependencies:**
  - `CnIcon` (see [cn-icon spec](../cn-icon/spec.md)) — the centre icon
    is a `<CnIcon>` Svelte component imported from
    `packages/cyan/src/components/CnIcon.svelte`. The loader forwards
    `noun` and chooses the `size` enum value based on `inline`.
    `CnIcon` produces `<span class="cn-icon">`, which is why the button
    stylesheet targets `.cn-icon` (class), not `cn-icon` (tag).
  - Tokens (new, to be added to the DS token layer):
    - `--cn-loader-size` — default loader square dimension; value
      `calc(var(--cn-line) * 3)` = 4.5rem (72px). See _Migration debt_
      in the PR description about the size mismatch in cyan-4 docs.
    - `--cn-loader-line-width` — thickness of the spinning ring;
      `calc(var(--cn-grid) / 2)` = 0.25rem (4px).
    - `--cn-loader-color` — ring and icon color;
      `light-dark(var(--chroma-primary-60), var(--chroma-surface-60))`.
  - Existing tokens: `--cn-grid`, `--cn-line` (already in units.css).
- **Constraints:**
  - The rendered root element carries class `cn-loader`. The button
    stylesheet (`packages/cyan/src/core/buttons.css`) and the container
    auto-centre rules target `.cn-loader` as a class selector; renaming
    the class is a breaking change across the DS.
  - The centre icon is always present — `noun` has a default so a bare
    `<CnLoader />` renders meaningfully. Consumers can override but not
    suppress it.
  - Animation respects `prefers-reduced-motion: reduce` — when the user
    has requested reduced motion the ring does not rotate (stays
    static). cyan-4 omits this; v20 must include it.
  - Ring opacity is `0.72` and centre-icon opacity is `0.44`, so the
    ring dominates and the icon reads as a quiet label rather than a
    competing animation.
  - Ring rotation is `1.2s` linear infinite. Not driven by a
    `--cn-duration-*` token — spinner timing is purposely independent
    of UI interaction duration (`--cn-duration-ui`, 0.22s), which would
    be far too fast for a progress indicator.
  - Placed as a direct child of `section`, `article`, or
    `article.cn-card`, the loader is centre-aligned with vertical
    margin `--cn-line` — authored in the companion global stylesheet
    so the rule applies without the component knowing its container.

### Book Page

- **Target path:** `app/cyan-ds/src/content/components/cn-loader.mdx`
- **Reverse-spec reference:** cyan-4 [`cn-loader.mdx`](https://github.com/villetakanen/cyan-design-system-4/blob/main/apps/cyan-docs/src/books/custom-elements/cn-loader.mdx).
- **Structure:**
  1. **Intro** — one paragraph: what the component is, why it combines
     motion + context icon, and the note that consumers use it as a
     Svelte component (`<CnLoader />`) rather than a custom element
     tag.
  2. **Dual-theme demo** — standard light/dark side-by-side grid
     showing: default loader, `inline` loader, loader inside a button
     with a "Loading media…" label, and a contrasting button with a
     plain icon (to make the value of the spinner obvious).
  3. **Prop reference** — table of `noun` and `inline` with types and
     defaults.
  4. **Container behaviours** — three mini-demos showing the
     auto-centre rule firing inside `<section>`, `<article>`, and
     `<CnCard>`.
  5. **Reduced motion** — callout plus a demo emulating
     `prefers-reduced-motion: reduce` (via browser devtools in the
     demo, or a preview class in the book page), showing the static
     fallback state.
  6. **Token table** — `--cn-loader-size`, `--cn-loader-line-width`,
     `--cn-loader-color` with their resolved values in both themes.
- **Layout adaptations from cyan-4:** no `column-l`, no `two-col` grid,
  no Tailwind-style `p-1` / `mb-1`. Use the `Book.astro` layout and
  `--cn-*`-driven utilities only.

## Contract

### Definition of Done

- [ ] `CnLoader.svelte` exports a Svelte 5 component rendering
      `<span class="cn-loader">…</span>` with the dual-ring element and
      a nested `<CnIcon>` inside.
- [ ] `noun` (default `"fox"`) and `inline` (default `false`) props
      work as specified; `inline=true` toggles the dimensions to
      `--cn-line` and the nested `<CnIcon>` to `size="medium"`.
- [ ] When `inline` is `false`, the nested `<CnIcon>` receives
      `size="large"`.
- [ ] Tokens `--cn-loader-size`, `--cn-loader-line-width`, and
      `--cn-loader-color` are defined on `:root` with `light-dark()`
      values.
- [ ] Companion stylesheet at
      `packages/cyan/src/components/cn-loader/cn-loader.css` auto-centres
      the loader when it is a direct child of `section`, `article`, or
      `article.cn-card`, and is imported from the DS CSS entry.
- [ ] Ring animation honours `prefers-reduced-motion: reduce`.
- [ ] Book page at `app/cyan-ds/src/content/components/cn-loader.mdx`
      exists and covers all scenarios below.
- [ ] Only `--cn-*` tokens are referenced; no `--color-*` or
      `--cyan-*`.

### Regression Guardrails

- The rendered root element's class name remains `cn-loader` so that
  `packages/cyan/src/core/buttons.css` selectors (`.cn-loader:first-child`,
  `.cn-loader:only-child`) continue to match.
- The component continues to render a `<CnIcon>` (producing `.cn-icon`)
  as a descendant; tests that assert its existence protect against a
  rewrite that replaces the icon with a slot or plain SVG.
- `prefers-reduced-motion: reduce` disables the ring rotation (a
  regression re-enabling motion is a WCAG issue).

### Testing Scenarios

#### Scenario: Default render

```gherkin
Given a <CnLoader /> component is mounted
When rendering completes
Then the rendered DOM contains `span.cn-loader`
And the rendered DOM contains `.lds-dual-ring` inside it
And the rendered DOM contains `.cn-icon` inside it with the "fox" icon
  sized at `--cn-icon-size-large`
```
- **Vitest Unit Test:** `packages/cyan/src/components/cn-loader/CnLoader.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/cn-loader.spec.ts`

#### Scenario: Inline variant

```gherkin
Given a <CnLoader inline /> component is mounted
When rendering completes
Then `span.cn-loader`'s computed width equals `var(--cn-line)`
And the inner `.cn-icon` is sized at `--cn-icon-size-medium`
  (corresponding to `size="medium"` on CnIcon)
```
- **Vitest Unit Test:** `packages/cyan/src/components/cn-loader/CnLoader.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/cn-loader.spec.ts`

#### Scenario: Noun forwarding

```gherkin
Given a <CnLoader noun="cat" /> component is mounted
When rendering completes
Then the nested `<CnIcon>` receives `noun="cat"`
And the rendered `.cn-icon` element has `data-noun="cat"`
When the component is updated to `<CnLoader noun="dog" />`
Then the rendered `.cn-icon` element's `data-noun` updates to "dog"
```
- **Vitest Unit Test:** `packages/cyan/src/components/cn-loader/CnLoader.test.ts`

#### Scenario: Auto-centre inside a section

```gherkin
Given a <section> whose only child is a <CnLoader />
When the section is rendered
Then the `.cn-loader` has `margin: var(--cn-line) auto`
And it is horizontally centred within the section
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/cn-loader.spec.ts`

#### Scenario: Loader inside a button aligns correctly

```gherkin
Given a <button><CnLoader /></button> (icon-only loading state)
When the button is rendered
Then the `.cn-loader`'s computed margins match the icon-only overrides
  defined in `packages/cyan/src/core/buttons.css` for
  `.cn-loader:only-child`
And the button's outer bounding box stays circular
  (width equals `--cn-button-size`)
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/cn-loader.spec.ts`

#### Scenario: Reduced-motion fallback

```gherkin
Given the user agent reports `prefers-reduced-motion: reduce`
When a <CnLoader /> is rendered
Then the `.lds-dual-ring` element's animation resolves to `none`
  (the ring does not rotate)
And the icon and ring remain visible as a static loading glyph
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/cn-loader.spec.ts` (using
  Playwright's `emulateMedia({ reducedMotion: 'reduce' })`)
