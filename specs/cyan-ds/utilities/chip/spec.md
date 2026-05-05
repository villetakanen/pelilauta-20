---
feature: Chip (.cn-chip, .cn-chip-list)
status: draft
maturity: design
last_major_review: 2026-05-04
parent_spec: ../spec.md
---

# Feature: Chip (`.cn-chip`, `.cn-chip-list`)

Parent: [Utilities](../spec.md)

## Blueprint

### Context

`.cn-chip` is the design-system utility for **compact, pill-shaped
tags** — navigation chips on tag pages, system labels in tag rows,
filter toggles, and read-only metadata pills. The chip decorates a
native HTML element (`<a>`, `<span>`, or `<button>`); it is layout +
typography + surface color, not a structural primitive.

`.cn-chip-list` is the canonical row-wrapper class for chip rows —
flex-wrap layout with grid-aligned gap. It exists so consumers don't
leak app-local utility classes (`flex flex-wrap gap-xs` and similar)
at the call site to lay out chip groups.

The first MVP consumer is the front-page `FeaturedTags` widget (per
`specs/pelilauta/front-page/featured-tags/spec.md` once that lands),
which renders a row of link chips routing to `/tags/{slug}`. Future
consumers include the `/tags/[tag]` page, filter toolbars, and any
tag-display surface across threads, sites, or profiles.

Reverse-specced from cyan-4
(`.tmp/cyan-design-system-4/packages/cyan-css/src/utilities/chip.css`,
the PBI at `.tmp/cyan-design-system-4/docs/pbi/beta.007-cn-chip.md`,
and the stylebook page at
`.tmp/cyan-design-system-4/apps/cyan-docs/src/books/styles/chip.mdx`).
v20 retains the utility-class shape and the native-element-decoration
pattern. Tokens are remapped from cyan-4's deprecated `--color-*`
namespace to the canonical v20 `--cn-*` namespace.

### Architecture

- **Source:** `packages/cyan/src/utilities/chip.css`. Imported from
  `packages/cyan/src/utilities/index.css` so both classes are reachable
  on every cyan-built page.
- **API contract:** authors apply `class="cn-chip"` to any of `<a>`,
  `<span>`, or `<button>` to render the pill-shaped chip surface.
  Chip-list grouping uses `class="cn-chip-list"` on a parent element
  (typically a `<div>` or `<nav>`); direct children of that element
  arrange in a flex-wrap row with grid-aligned gap. The two classes
  compose via host-side class lists.
- **Computed properties (`.cn-chip`):**
  - **Layout:** `display: inline-flex; align-items: center; justify-content: center; gap: calc(var(--cn-grid) * 0.5); vertical-align: middle;`
  - **Spacing:** `padding: calc(var(--cn-grid) * 0.5) calc(var(--cn-grid) * 2); margin: 0;`
  - **Shape:** `border-radius: 9999px; border: none;` (full-pill regardless of font size).
  - **Typography:** `font-family: inherit; font-size: var(--cn-font-size-text-small); font-weight: var(--cn-font-weight-button); line-height: var(--cn-line-height-button); letter-spacing: var(--cn-letter-spacing-button); white-space: nowrap; text-decoration: none;`
  - **Surface:** `background-color: color-mix(in oklab, var(--cn-button) 33%, transparent); color: var(--cn-on-surface);` — mirrors the v20 `button.text` variant (muted button surface).
  - **Behavior:** `cursor: default; user-select: none; transition: background-color var(--cn-duration-ui) var(--cn-easing-ui);`
- **Computed properties (`.cn-chip-list`):**
  - `display: flex; flex-wrap: wrap; gap: var(--cn-grid);`
- **Interactive states (clickable variants — `a.cn-chip`, `button.cn-chip`):**
  - `cursor: pointer;` — overrides the base `cursor: default`.
  - `:hover` — slightly stronger surface mix
    (`color-mix(in oklab, var(--cn-button) 50%, transparent)`).
    Text color unchanged.
  - `:active` — base surface mix with `filter: brightness(0.95)`.
  - `:focus-visible` — `outline: 2px solid var(--cn-focus-ring); outline-offset: 2px;`
- **Disabled state (`button.cn-chip:disabled`):** `cursor: not-allowed; opacity: 0.5; pointer-events: none;`. The disabled style reuses `opacity` rather than redefining surface color, matching v20's button-disabled patterns.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce) { .cn-chip { transition: none; } }`.
- **Constraints:**
  - **Native-element decoration.** `.cn-chip` works on `<a>`, `<span>`,
    and `<button>`. The class supplies pill styling; element semantics
    come from the consumer's tag choice (`<a>` for navigation,
    `<button>` for filter toggles, `<span>` for read-only labels).
  - **`--cn-*` tokens only.** No `--color-*` or `--cyan-*` references.
    The cyan-4 source's `--color-button-text` etc. do not carry
    forward (see §Migration Debt for the mapping table).
  - **No `!important`.** Specificity is base; consumers compose over
    the class with sibling utilities or scoped overrides.
  - **Globally available.** Both classes load on every cyan-built page
    via `packages/cyan/src/utilities/index.css` — no per-page import
    or composition step.
  - **Layout-direction agnostic at the chip level.** The chip is
    `inline-flex`; surrounding direction is the parent's concern.
    `.cn-chip-list` provides the canonical row layout when a consumer
    wants one.
  - **No app-local utility-class fallback.** Consumers who need a chip
    row use `.cn-chip-list` directly; they do not compose
    `class="flex flex-wrap"` (those classes don't exist in v20 cyan
    and would violate the apps-never-override-DS rule).

### Book Page

- **Target path:** `app/cyan-ds/src/content/styles/chip.mdx` (new) —
  `styles` is the existing collection sibling of `z-index.mdx`. There
  is no `utilities` content collection in the cyan-ds docs site.
- **Structure:**
  - One-line intent statement.
  - Live demo: a `cn-chip-list` containing four link chips, three span
    chips, two button chips (one disabled).
  - Light + dark mode rendering of the chip surface.
  - Live demo: chip-list of link chips with leading `<CnIcon>`
    children — the FeaturedTags pattern (icon + label).
  - Properties table: `.cn-chip` computed values, `.cn-chip-list`
    computed values.
  - Token reference: `--cn-button`, `--cn-on-surface`, `--cn-focus-ring`,
    `--cn-grid`, `--cn-font-size-text-small`,
    `--cn-font-weight-button`, `--cn-line-height-button`,
    `--cn-letter-spacing-button`, `--cn-duration-ui`,
    `--cn-easing-ui`.
  - Accessibility note: keyboard-focus visibility, native semantics
    preservation, reduced-motion support.

## Contract

### Definition of Done

- [ ] `packages/cyan/src/utilities/chip.css` defines exactly two
      base rulesets — `.cn-chip` and `.cn-chip-list` — plus the
      interactive and disabled state selectors (`a.cn-chip`,
      `button.cn-chip`, `:hover`, `:active`, `:focus-visible`,
      `:disabled`) and the reduced-motion media query.
- [ ] `packages/cyan/src/utilities/index.css` imports `./chip.css`.
- [ ] `.cn-chip` applied to `<a>`, `<span>`, and `<button>` produces
      a pill-shaped chip surface in both light and dark mode.
- [ ] `a.cn-chip` and `button.cn-chip` carry pointer cursor, hover
      and active state mixes, and a `:focus-visible` outline using
      `--cn-focus-ring`.
- [ ] `span.cn-chip` carries the base style with `cursor: default`
      and no hover effect.
- [ ] `button.cn-chip:disabled` renders with `opacity: 0.5`,
      `cursor: not-allowed`, and `pointer-events: none`.
- [ ] `.cn-chip-list` arranges direct children in a flex-wrap row
      with gap equal to `var(--cn-grid)`. The class composes with
      chip children (each child carrying `class="cn-chip"`).
- [ ] All tokens consumed are `--cn-*` (no `--color-*` or
      `--cyan-*`).
- [ ] `prefers-reduced-motion: reduce` disables the transition on
      `.cn-chip`.
- [ ] Stylebook page at `app/cyan-ds/src/content/styles/chip.mdx`
      exists and renders the demos in the §Book Page structure.

### Regression Guardrails

- **Token namespace.** Re-introducing `--color-*` or `--cyan-*`
  tokens in `chip.css` is a regression against the v20
  token-namespace rule.
- **No `!important`.** Adding `!important` to any chip rule is a
  regression — the utility wins by being a leaf class, not by force.
- **Native-element semantics preserved.** The chip class must NOT
  add ARIA roles, change `display` for non-flex contexts, or
  otherwise mutate the consumer element's accessibility tree. `<a>`
  stays a link; `<button>` stays a button; `<span>` stays a span.
- **`.cn-chip-list` stays layout-only.** The class supplies flex-wrap
  + gap and nothing else. Adding typography, color, or padding to
  the list class is a regression — those concerns belong to the chip
  children or the surrounding section.

### Testing Scenarios

#### Scenario: Link chip renders with pill surface and pointer cursor

```gherkin
Given an <a class="cn-chip" href="/tags/dnd5e">D&D 5e</a> in a cyan-built page
When the page is rendered
Then the link's computed border-radius produces a full-pill shape
And the computed cursor is "pointer"
And the link has no underline
And the link's text color resolves through --cn-on-surface
And the link's background resolves through a color-mix on --cn-button
```

#### Scenario: Span chip renders with default cursor and no hover effect

```gherkin
Given a <span class="cn-chip">Read-only</span> in a cyan-built page
When the page is rendered
Then the span's computed cursor is "default"
And the span carries the base background-color, identical to the chip's resting state
And hovering the span does not change its background-color
```

#### Scenario: Button chip supports the disabled state

```gherkin
Given a <button class="cn-chip" disabled>Filter</button> in a cyan-built page
When the page is rendered
Then the button's computed opacity is 0.5
And the button's computed cursor is "not-allowed"
And the button's pointer-events resolve to "none"
And the button does not respond to click events
```

#### Scenario: Chip list lays out children in a wrapping flex row

```gherkin
Given a <div class="cn-chip-list"> containing five <a class="cn-chip"> children
When the page is rendered at narrow viewport widths
Then the chips arrange in a horizontal row with var(--cn-grid) gap between them
And rows wrap when the available width is exceeded
And each chip retains its intrinsic pill shape and size
```

#### Scenario: Focus ring is visible on keyboard navigation to a chip

```gherkin
Given a series of <a class="cn-chip"> elements in a cyan-built page
When the user tabs through them with the keyboard
Then each focused chip displays an outline 2px solid in the --cn-focus-ring color
And the outline is offset 2px from the chip edge
And the outline is not visible on mouse-driven focus (per :focus-visible semantics)
```

#### Scenario: Reduced motion disables transitions

```gherkin
Given a user agent with prefers-reduced-motion: reduce active
When .cn-chip elements render
Then no transition is applied to background-color changes
And hover state changes are instantaneous
```

## Migration Debt and Decisions

### Tokens migrated from cyan-4

cyan-4's `chip.css` used the deprecated `--color-*` token family.
v20 maps each to `--cn-*`-namespace replacements:

| cyan-4 token (deprecated) | v20 mapping |
|---|---|
| `--color-button-text` (background) | `color-mix(in oklab, var(--cn-button) 33%, transparent)` — mirrors the v20 `button.text` variant |
| `--color-button-text-hover` | `color-mix(in oklab, var(--cn-button) 50%, transparent)` |
| `--color-button-text-active` | base mix + `filter: brightness(0.95)` |
| `--color-on-surface` | `--cn-on-surface` |
| `--color-on-button` (focus outline) | `--cn-focus-ring` |
| `--background-button-disabled` | dropped — v20 uses `opacity: 0.5` only |
| `--color-button-disabled` | dropped — covered by the opacity reduction |

### Decisions deferred

- **Color variant utilities.** cyan-4's PBI proposed combining
  `.cn-chip` with `.primary` / `.call-to-action`; cyan-4 itself
  never shipped those variants. v20 likewise defers — when a feature
  needs a coloured chip, the variant lands as a follow-up spec
  composing `.cn-chip` with v20's button color modifiers (`.cta`,
  `.secondary`).
- **Svelte wrapper.** The cyan-4 source is a utility class, and v20
  mirrors that shape. A `<CnChip>` Svelte component is not needed at
  MVP — Svelte-collection consumers can decorate `<a>` / `<button>`
  elements directly via `class="cn-chip"`. If a future
  Svelte-managed collection needs prop-driven render-from-props
  (icon + label as discrete props), the component lands then without
  breaking the utility class.
- **Chip with leading icon.** The FeaturedTags consumer pattern
  combines a chip with a leading `<CnIcon noun="..." size="xsmall">`
  child. The chip's `gap: calc(var(--cn-grid) * 0.5)` already
  accommodates this — no additional class is needed. The stylebook
  documents the pattern; the spec does not introduce a separate
  chip-with-icon class.

### Source provenance

- cyan-4 implementation:
  `.tmp/cyan-design-system-4/packages/cyan-css/src/utilities/chip.css`
- cyan-4 PBI:
  `.tmp/cyan-design-system-4/docs/pbi/beta.007-cn-chip.md`
- cyan-4 stylebook:
  `.tmp/cyan-design-system-4/apps/cyan-docs/src/books/styles/chip.mdx`
- v20 token reference:
  `packages/cyan/src/tokens/semantic.css` (`--cn-button`,
  `--cn-on-surface`, `--cn-focus-ring`),
  `packages/cyan/src/tokens/typography.css` (UI typography stack).
- v20 sibling utility patterns:
  `specs/cyan-ds/utilities/flex/spec.md`,
  `specs/cyan-ds/utilities/text-caption/spec.md`.
