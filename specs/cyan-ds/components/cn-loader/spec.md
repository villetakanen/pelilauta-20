---
feature: CnLoader
parent_spec: specs/cyan-ds/components/spec.md
stylebook_url: https://cyan.pelilauta.social/components/cn-loader
---

# Feature: CnLoader

## Blueprint

### Context

`<cn-loader>` is the design system's canonical loading indicator. It
combines a spinning dual-ring border (motion signal: "something is
happening") with a static centered icon (context signal: "this is what
is loading"). Consumers drop it into a container or a button to
communicate async progress; no className plumbing required.

Reversed from `villetakanen/cyan-design-system-4`:
- Custom element: [`packages/cyan-lit/src/cn-loader/cn-loader.ts`](https://github.com/villetakanen/cyan-design-system-4/blob/main/packages/cyan-lit/src/cn-loader/cn-loader.ts)
- Light-dom CSS: [`packages/cyan-css/src/core/cn-loader.css`](https://github.com/villetakanen/cyan-design-system-4/blob/main/packages/cyan-css/src/core/cn-loader.css)
- Tokens: [`packages/cyan-css/src/tokens/loader.css`](https://github.com/villetakanen/cyan-design-system-4/blob/main/packages/cyan-css/src/tokens/loader.css)
- Book page: [`apps/cyan-docs/src/books/custom-elements/cn-loader.mdx`](https://github.com/villetakanen/cyan-design-system-4/blob/main/apps/cyan-docs/src/books/custom-elements/cn-loader.mdx)

### Architecture

- **Components:**
  - Custom element registration at
    `packages/cyan/src/components/cn-loader/cn-loader.svelte`,
    authored as a Svelte 5 component with
    `<svelte:options customElement="cn-loader" />`. This keeps the DS
    default (Svelte 5) while guaranteeing the tag name `<cn-loader>` —
    the button stylesheet targets `button cn-loader:first-child` and
    `button cn-loader:only-child`, which require a stable element name,
    not a Svelte-rendered wrapper.
  - Light-dom container stylesheet at
    `packages/cyan/src/core/cn-loader.css` for rules that apply to
    `<cn-loader>` based on its parent (auto-centering inside `section`,
    `article`, `cn-card`). This is separate from the shadow-DOM styles
    inside the component.
  - Token file `packages/cyan/src/tokens/cn-loader.css` (or folded into
    `semantic.css`) defining the component tokens listed below.
- **API Contract (element attributes):**
  - `noun` — `String`, default `"fox"`. The icon rendered at the loader
    centre. Forwarded to a nested `<cn-icon>`.
  - `inline` — `Boolean` attribute. When present, the loader shrinks to
    `--cn-line` (24px) on each side so it fits inside buttons and
    navigation elements. When absent, renders at `--cn-loader-size`
    (default).
- **Data Models:** N/A (presentational).
- **Dependencies:**
  - `<cn-icon>` — the centre icon is a nested `<cn-icon>` element. The
    loader forwards `noun` to it and sets the `large` attribute when
    `inline` is not set.
  - Tokens (new, must be added to the DS token layer):
    - `--cn-loader-size` — default loader square dimension; value
      `calc(var(--cn-line) * 3)` = 4.5rem (72px) (see _Migration debt_
      below about the size mismatch in cyan-4 docs).
    - `--cn-loader-line-width` — thickness of the spinning ring;
      `calc(var(--cn-grid) / 2)` = 0.25rem (4px).
    - `--cn-loader-color` — ring and icon color;
      `light-dark(var(--chroma-primary-60), var(--chroma-surface-60))`.
  - Existing tokens: `--cn-grid`, `--cn-line` (already in units.css).
- **Constraints:**
  - Tag name is `<cn-loader>`. The button stylesheet and the light-dom
    container CSS rely on this tag; renaming it is a breaking change
    across the DS.
  - The centre icon is always present — `noun` has a default so a bare
    `<cn-loader>` renders meaningfully. Consumers can override but not
    suppress it.
  - Animation respects `prefers-reduced-motion: reduce` — when the user
    has requested reduced motion the ring does not spin (stays static,
    or fades its border instead). cyan-4 omits this; v20 must include
    it.
  - Ring opacity is `0.72` and centre-icon opacity is `0.44`, so the
    ring dominates and the icon reads as a quiet label rather than a
    competing animation.
  - Ring rotation is `1.2s` linear infinite. Not driven by a
    `--cn-duration-*` token — spinner timing is purposely independent
    of UI interaction duration (`--cn-duration-ui`, 0.22s), which would
    be far too fast for a progress indicator.
  - Placed as a direct child of `section`, `article`, or `cn-card`, the
    loader is centre-aligned with vertical margin `--cn-line` —
    authored in light-dom CSS so it applies without the component
    needing to know its container.

### Book Page

- **Target path:** `app/cyan-ds/src/content/components/cn-loader.mdx`
- **Reverse-spec reference:** cyan-4 [`cn-loader.mdx`](https://github.com/villetakanen/cyan-design-system-4/blob/main/apps/cyan-docs/src/books/custom-elements/cn-loader.mdx).
- **Structure:**
  1. **Intro** — one paragraph: what the component is, why it combines
     motion + context icon.
  2. **Dual-theme demo** — the standard light/dark side-by-side grid
     showing: default loader, `inline` loader, loader inside a button
     with label ("Loading media..."), and the button variant with a
     plain `cn-icon` for contrast (making it obvious why the spinner
     matters).
  3. **Attribute reference** — table of `noun` and `inline` with types
     and defaults.
  4. **Container behaviours** — three mini-demos showing the auto-centre
     rule firing inside `<section>`, `<article>`, and `<cn-card>`.
  5. **Reduced motion** — a callout and a demo wrapped in a
     `prefers-reduced-motion: reduce` preview (emulated via a media
     query override class or the browser devtools), showing the static
     fallback state.
  6. **Token table** — `--cn-loader-size`, `--cn-loader-line-width`,
     `--cn-loader-color` with their resolved values in both themes.
- **Layout adaptations from cyan-4:** no `column-l`, no `two-col` grid,
  no Tailwind-style `p-1` / `mb-1`. Use the `Book.astro` layout and
  `--cn-*`-driven utilities only.

## Contract

### Definition of Done

- [ ] `<cn-loader>` custom element is registered and renders on SSR'd
      pages before client-side hydration (custom elements emit their
      light-DOM placeholder on the server, hydrate on the client).
- [ ] Shadow-DOM template contains the dual-ring element and a nested
      `<cn-icon>` receiving the `noun` attribute.
- [ ] `inline` attribute toggles the element between
      `--cn-loader-size` and `--cn-line` dimensions, and toggles the
      inner `<cn-icon>`'s `large` attribute correspondingly.
- [ ] Tokens `--cn-loader-size`, `--cn-loader-line-width`, and
      `--cn-loader-color` are defined on `:root` with `light-dark()`
      values where relevant.
- [ ] Light-dom stylesheet at `packages/cyan/src/core/cn-loader.css`
      auto-centres the loader when it is a direct child of `section`,
      `article`, or `cn-card`.
- [ ] Ring animation honours `prefers-reduced-motion: reduce`.
- [ ] Book page at `app/cyan-ds/src/content/components/cn-loader.mdx`
      exists and covers all scenarios below.
- [ ] Only `--cn-*` tokens are referenced; no `--color-*` or
      `--cyan-*`.

### Regression Guardrails

- The element's tag name remains `<cn-loader>` so that
  `packages/cyan/src/core/buttons.css` selectors continue to match.
- The nested `<cn-icon>` continues to be present in the shadow DOM
  whenever the element is rendered — tests that assert its existence
  protect against an accidental rewrite that moves the icon to a slot.
- `prefers-reduced-motion: reduce` disables the ring rotation (a
  regression re-enabling motion is a WCAG issue).

### Testing Scenarios

#### Scenario: Default render

```gherkin
Given a bare <cn-loader></cn-loader> is added to the DOM
When the custom element upgrades
Then its `noun` property equals "fox"
And its `inline` property equals false
And its shadow DOM contains a `.lds-dual-ring` element
And its shadow DOM contains a <cn-icon> with attribute `large`
  and `noun="fox"`
```
- **Vitest Unit Test:** `packages/cyan/src/components/cn-loader/cn-loader.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/cn-loader.spec.ts`

#### Scenario: Inline variant

```gherkin
Given a <cn-loader inline></cn-loader> element
When the element is rendered
Then its computed width equals var(--cn-line)
And its nested <cn-icon> does NOT have the `large` attribute
```
- **Vitest Unit Test:** `packages/cyan/src/components/cn-loader/cn-loader.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/cn-loader.spec.ts`

#### Scenario: Noun forwarding

```gherkin
Given a <cn-loader noun="cat"></cn-loader> element
When the element is rendered
Then its nested <cn-icon> has attribute noun="cat"
When the element's noun property is later set to "dog"
Then the nested <cn-icon> attribute updates to noun="dog"
```
- **Vitest Unit Test:** `packages/cyan/src/components/cn-loader/cn-loader.test.ts`

#### Scenario: Auto-centre inside a section

```gherkin
Given a <section> whose only child is a <cn-loader>
When the section is rendered
Then the loader has `margin: var(--cn-line) auto`
And it is horizontally centred within the section
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/cn-loader.spec.ts`

#### Scenario: Loader inside a button aligns correctly

```gherkin
Given a <button><cn-loader></cn-loader></button> (icon-only loading)
When the button is rendered
Then the loader's computed margins match the icon-only overrides
  defined in packages/cyan/src/core/buttons.css
And the button's outer bounding box stays circular
  (width equals --cn-button-size)
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/cn-loader.spec.ts`

#### Scenario: Reduced-motion fallback

```gherkin
Given the user agent reports `prefers-reduced-motion: reduce`
When a <cn-loader> is rendered
Then the `.lds-dual-ring` element's animation is `none`
  (the ring does not rotate)
And the icon and ring remain visible as a static loading glyph
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/cn-loader.spec.ts` (using
  Playwright's `emulateMedia({ reducedMotion: 'reduce' })`)
