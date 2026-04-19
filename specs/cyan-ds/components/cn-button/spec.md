---
feature: CnButton
parent_spec: specs/cyan-ds/components/spec.md
stylebook_url: https://cyan.pelilauta.social/components/cn-button
---

# Feature: CnButton

## Blueprint

### Context

Native `<button>` and anchor-as-button (`<a class="button">`) elements in every
Pelilauta app must share one consistent, tokenized visual language without
requiring consumers to wrap them in a component. CnButton is the atomic CSS
layer that styles those elements globally so that any raw `<button>` or
`a.button` renders correctly even before JavaScript hydrates.

Reversed from `packages/cyan-css/src/core/buttons.css` in
[`villetakanen/cyan-design-system-4`](https://github.com/villetakanen/cyan-design-system-4/blob/main/packages/cyan-css/src/core/buttons.css).

### Architecture

- **Components:**
  - Global stylesheet (target) `packages/cyan/src/core/buttons.css` imported
    from the DS CSS entry. The `core/` directory is the home for atomic
    styles that apply to raw HTML elements globally (buttons, forms,
    preflight, typography resets) — as opposed to `components/`, which
    holds scoped Svelte/Astro components. No wrapper component exists for
    buttons: consumers use semantic HTML (`<button>`, `<a class="button">`)
    directly. This keeps the button layer 100% SSR-compatible and
    progressive (ADR-001): an HTML button on an unhydrated page is already
    a correctly-styled DS button.
- **Data Models:** N/A (presentational).
- **API Contracts (CSS surface consumers may rely on):**
  - **Selectors:** `button`, `a.button` (base); `.text`, `.cta` (variants);
    `.secondary` (ancestor context).
  - **Inner slot elements:** a single leading `.cn-icon` or `.cn-loader`
    (rendered by the `CnIcon` / `CnLoader` Svelte components —
    class-tagged `<span>` markup, not custom-element tags) followed by a
    label; or a single icon/loader with no label (icon-only button). No
    other layout assumptions.
  - **States:** `:hover`, `:active`, `:disabled`.
- **Dependencies:**
  - Tokens from `packages/cyan/src/tokens/units.css`: `--cn-grid`,
    `--cn-button-size` (38px — button inner height), `--cn-button-physical-size`
    (56px — grid-aligned row including margins), `--cn-icon-size-small`.
  - Tokens from `packages/cyan/src/tokens/semantic.css`:
    - Surfaces: `--cn-button`, `--cn-button-light`, `--cn-button-cta`.
    - Foregrounds (new — must be added): `--cn-on-button` for the default
      and `.secondary` surfaces; `--cn-on-button-cta` for `.cta`. Every
      `--cn-button*` container is paired with an `--cn-on-button*`
      foreground — the `.text` variant continues to use `--cn-on-surface`
      since it sits on surface, not on a button color.
    - Interaction wash: `--cn-hover` (exists) and `--cn-active` (new).
      `--cn-active` mirrors `--cn-hover`'s `light-dark(color-mix(in
      oklch, var(--chroma-surface-50), transparent …), …)` structure
      with one opacity step deeper (~20% light / ~30% dark, roughly 2×
      the hover visibility). Both are applied via overlay
      pseudo-elements, never via `filter: brightness()`.
    - Shadow: `--cn-shadow-button-hover` (new — aliases
      `--cn-shadow-elevation-2`, kept as a named token so theme authors
      can retune button elevation without touching the global scale).
    - Focus: `--cn-focus-ring`.
    - Motion: `--cn-duration-ui` and `--cn-easing-ui` (new — shared with
      every future interactive component; referenced here instead of the
      literal `0.22s ease-in-out` from the source).
  - Typography tokens (UI Scale, `button` role — see
    [tokens/typography spec](../../tokens/typography/spec.md#ui-scale)):
    `--cn-font-family` (shared with body), `--cn-font-size-button`
    (aliased to `--cn-font-size-text-small`), `--cn-font-weight-button`
    (500), `--cn-letter-spacing-button`, `--cn-line-height-button`
    (unitless — not the same as the geometric `--cn-button-size` height).
  - `CnIcon` Svelte component (see [cn-icon spec](../cn-icon/spec.md))
    — produces `<span class="cn-icon">` in the light DOM. Buttons target
    this by class (`.cn-icon`), not by element tag.
  - `CnLoader` Svelte component (see [cn-loader spec](../cn-loader/spec.md))
    — produces `<span class="cn-loader">` in the light DOM. The canonical
    loading-state pattern is a disabled button containing a `<CnLoader />`
    (optionally followed by a label `<span>`), not a static icon.
    `packages/cyan/src/core/buttons.css` targets this via
    `.cn-loader:first-child:not(:only-child)` and `.cn-loader:only-child`
    so the spinner aligns correctly in both forms.
- **Constraints:**
  - Zero JavaScript. Styling is pure CSS; the button works before hydration.
  - Only `--cn-*` tokens are referenced; no `--color-*` or `--cyan-*`.
  - Pill shape is derived from button height (`border-radius` = half of
    `--cn-button-size`), so changing the height token keeps the pill correct.
  - Total vertical footprint (including margin) equals
    `--cn-button-physical-size` so buttons sit on the 8-px grid in stacks.
  - Icon-only buttons remain square in outer bbox — padding collapses
    symmetrically so the pill becomes a circle.
  - Disabled buttons reject pointer events entirely (not just visually dimmed).
  - Hover and active feedback is applied as an **overlay wash**
    (`--cn-hover` / `--cn-active`) composed over the button surface via a
    pseudo-element, not as `filter: brightness()` on the button itself.
    The label and icon colors remain locked to their `--cn-on-button*`
    token so legibility does not drift with state.
  - The CTA variant class is `.cta` (not `.call-to-action`). The cyan-4
    source contained a `.secondary button.call-to-action` rule that never
    matched anything — v20 standardises on the short name in every
    selector.

### Book Page

- **Target path:** `app/cyan-ds/src/content/components/cn-button.mdx`
- **Reverse-spec reference:** cyan-4 book page
  [`apps/cyan-docs/src/books/styles/buttons.mdx`](https://github.com/villetakanen/cyan-design-system-4/blob/main/apps/cyan-docs/src/books/styles/buttons.mdx)
  and its demo component
  [`apps/cyan-docs/src/components/demo/ButtonDemo.astro`](https://github.com/villetakanen/cyan-design-system-4/blob/main/apps/cyan-docs/src/components/demo/ButtonDemo.astro).
- **Narrative frame:** the page opens by stating that the DS styles raw
  `<button>` and `<a class="button">` directly (no component wrapper) and
  that the styling is accessibility-first — correct touch targets and
  `:focus-visible` handling come for free.
- **Structure:**
  1. **Intro** — one paragraph explaining that consumers write semantic
     HTML and the DS styles it. No API surface to learn beyond three
     class modifiers (`.text`, `.cta`, `.secondary`).
  2. **Dual-theme demo (headline)** — a
     [`ThemeSplit`](../../living-style-books/theme-split/spec.md) block
     wraps the full button demo so a reviewer sees both themes
     side-by-side without toggling OS/browser mode. The slotted
     content mirrors cyan-4's `ButtonDemo`: icon-only / label /
     icon+label rows, disabled / text / loading rows, oversized-icon
     rows (proving the forced-small override), and a `.secondary`
     ancestor row with default + text + CTA buttons nested inside.
     Interactive behaviours (focus, hover, active) are not demoed here
     because `ThemeSplit` renders static HTML duplicated into both
     panes — JS-hydrated demos, if ever needed, live outside the
     split block.
  3. **Stretched button** — a single button in a `width: 100%` parent,
     demonstrating that the button fills the flex/grid cell rather than
     staying intrinsic-width. Label: "buttons stretch with their
     container; they don't wrap text."
  4. **Icon sizing override** — two stacked demos:
     (a) icons *outside* a button at default / large / xlarge,
         all visibly different sizes;
     (b) the same three icons *inside* buttons, all clamped to
         `--cn-icon-size-small`.
     One sentence of explanation between them — this is the single most
     surprising behaviour of the component.
  5. **Button types** — one subsection per variant, each with a minimal
     HTML snippet and a live render:
     - Icon-only (square pill, touch-target preserved).
     - Standard (default).
     - Icon + text.
     - `.text` (minimal / secondary actions).
     - `.cta` (prominent / primary actions — show both an icon-only CTA
       and a text CTA; cyan-4 showed only the icon-only case, which is
       misleading).
     - Disabled.
     - Loading — see _Open sub-decision_ below.
  6. **Link buttons** — `<a class="button">`, `<a class="button text">`,
     `<a class="button cta">` to show that any anchor can adopt button
     styling.
  7. **Guidelines** — short prose list on when to pick which variant:
     default for standard actions, `.text` for secondary / low-prominence,
     `.cta` used sparingly for the page's single most-important action,
     contrast and touch-target reminders, and use loading states for
     async work.
  8. **Token table** — the `--cn-*` tokens the button reads, grouped by
     _surfaces & foregrounds_ (gradient stops + `--cn-on-button*`),
     _interaction_ (`--cn-hover`, `--cn-active`, `--cn-shadow-button-hover`,
     `--cn-duration-ui`, `--cn-easing-ui`), _typography_ (the UI Scale
     `button` role) and _geometry_ (`--cn-button-size`,
     `--cn-button-physical-size`, `--cn-icon-size-small`). One row per
     token with its role so theme authors see the override surface.
- **Layout adaptations from cyan-4:**
  - cyan-4 wraps the page in `<article class="column-l">` — v20 uses
    whatever article / column class the `Book.astro` layout already
    provides. Do not copy `column-l`.
  - cyan-4 uses inline `style="..."` and Tailwind-style `p-2` utilities
    for scaffolding. v20 uses `--cn-*`-driven utility classes or DS
    layouts; no inline styles and no Tailwind utilities in the book
    page.
- **Loading state pattern (resolved):** the loading state is
  `<button disabled><CnLoader /></button>` for icon-only buttons and
  `<button disabled><CnLoader /><span>Loading...</span></button>` for
  labelled buttons. `CnLoader` renders `<span class="cn-loader">`, and
  `buttons.css` targets `.cn-loader:first-child:not(:only-child)` and
  `.cn-loader:only-child` to align it. cyan-4's book page showed a
  static icon instead, which contradicted the CSS's loader-specific
  margin rules; v20 chooses the spinner pattern so async progress is
  visible, and the `.cn-loader` selectors in `buttons.css` stay.

## Contract

### Definition of Done

- [ ] `packages/cyan/src/core/buttons.css` ships and is imported from
      the DS CSS entry point.
- [ ] `packages/cyan/src/core/` directory exists and is the home for
      globally-applied atomic CSS.
- [ ] Stylesheet references only `--cn-*` tokens. No `--color-*`, `--cyan-*`,
      `filter: brightness()`, or hardcoded colors / durations.
- [ ] `semantic.css` defines `--cn-on-button`, `--cn-on-button-cta`,
      `--cn-active`, `--cn-shadow-button-hover`, `--cn-duration-ui`, and
      `--cn-easing-ui` before this stylesheet is authored.
- [ ] A bare `<button>` rendered in any consumer app adopts DS styling
      without further opt-in.
- [ ] `.text`, `.cta`, `.secondary` variants render as documented in the book.
- [ ] A `.cn-icon` element inside a button renders at
      `--cn-icon-size-small` regardless of the `size` prop passed to
      the enclosing `CnIcon` component.
- [ ] Icon-only buttons render as a circular pill of `--cn-button-size`
      diameter.
- [ ] Disabled buttons are visually and interactively inert
      (`pointer-events: none`, 50% opacity, `cursor: not-allowed`).
- [ ] Book page at `app/cyan-ds/src/content/components/cn-button.mdx` exists
      and demonstrates all variants + states.

### Regression Guardrails

- Pill shape remains correct after `--cn-button-size` changes (border-radius
  must be derived, not a frozen pixel value).
- Button row height (with margin) stays grid-aligned to
  `--cn-button-physical-size`.
- No `--color-*` or `--cyan-*` token ever reappears in this file.
- `:disabled` always blocks clicks — regressions here allow submitting
  forms that should be inert.
- Icon sizing inside buttons stays locked to `--cn-icon-size-small`; do
  not let an icon's own size token leak through.

### Testing Scenarios

#### Scenario: Bare button adopts DS styling

```gherkin
Given the DS stylesheet is loaded on a page
When a consumer renders `<button>Save</button>` with no extra classes
Then the button displays the default gradient surface, pill border-radius,
  UI-scale typography, and hover/active transitions
And no `--color-*` or `--cyan-*` custom property is read by the button
```
- **Vitest Unit Test:** `packages/cyan/src/core/buttons.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/cn-button.spec.ts`

#### Scenario: CTA variant

```gherkin
Given a button with class `cta`
When it is rendered
Then its background derives from `--cn-button-cta` blended toward
  `--cn-button`
And its text color contrasts against that surface at WCAG AA
```
- **Vitest Unit Test:** `packages/cyan/src/core/buttons.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/cn-button.spec.ts`

#### Scenario: Text variant

```gherkin
Given a button with class `text`
When it is rendered
Then it has no filled surface (transparent / surface-colored background)
And its label color matches `--cn-on-surface`
```
- **Vitest Unit Test:** `packages/cyan/src/core/buttons.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/cn-button.spec.ts`

#### Scenario: Disabled state is inert

```gherkin
Given a button with the `disabled` attribute
When a user clicks it
Then no click event fires
And the cursor displays `not-allowed`
And opacity is reduced to 0.5
```
- **Vitest Unit Test:** `packages/cyan/src/core/buttons.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/cn-button.spec.ts`

#### Scenario: Icon inside button is forced small

```gherkin
Given a button containing a `<CnIcon size="medium" />`
  (or any size other than small)
When the button is rendered
Then the resulting `.cn-icon` element's computed width and height
  equal `--cn-icon-size-small`
```
- **Vitest Unit Test:** `packages/cyan/src/core/buttons.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/cn-button.spec.ts`

#### Scenario: Icon-only button is circular

```gherkin
Given a button whose only child is a `<CnIcon />` (rendering `.cn-icon`)
When the button is rendered
Then the rendered bounding box is square
  (width equals `--cn-button-size`)
And the border-radius makes it visually circular
```
- **Vitest Unit Test:** `packages/cyan/src/core/buttons.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/cn-button.spec.ts`

#### Scenario: Secondary context re-tints nested buttons

```gherkin
Given an ancestor element with class `secondary`
When a default `<button>` is rendered inside it
Then the button surface derives from the `--chroma-primary-*` ramp
  rather than the default `--cn-button` surface
```
- **Vitest Unit Test:** `packages/cyan/src/core/buttons.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/cn-button.spec.ts`

#### Scenario: Anchor-as-button

```gherkin
Given an `<a class="button" href="/x">Go</a>` element
When it is rendered
Then it displays identical visuals to a `<button>` (shape, typography, states)
And `text-decoration` is suppressed
```
- **Vitest Unit Test:** `packages/cyan/src/core/buttons.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/cn-button.spec.ts`
