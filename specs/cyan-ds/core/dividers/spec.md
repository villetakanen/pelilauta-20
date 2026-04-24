---
feature: Dividers
parent_spec: specs/cyan-ds/core/spec.md
stylebook_url: https://cyan.pelilauta.social/core/dividers
---

# Feature: Dividers

## Blueprint

### Context

Native `<hr>` elements need one consistent Pelilauta visual — a thin,
muted, grid-aligned horizontal rule — so any HTML document (MDX pages,
editorial copy, long threads) gets a correct-looking separator with no
extra markup or classes. Following the same pattern as
[buttons](../buttons/spec.md), the DS styles the raw HTML element
directly; there is no `CnDivider` component and no wrapper class.

### Architecture

- **Components:**
  - Global stylesheet (target) `packages/cyan/src/core/dividers.css`,
    imported from the DS CSS entry via `packages/cyan/src/core/index.css`.
- **Data Models:** N/A (presentational).
- **API Contracts (CSS surface consumers may rely on):**
  - **Selector:** `hr` (global).
  - **States:** none (dividers are non-interactive).
- **Dependencies:**
  - `--cn-border` (`tokens/semantic.css`) — line colour. Theme-aware via
    `light-dark()`; already defined.
  - `--cn-line` (`tokens/units.css`) — vertical margin, `3 × --cn-grid`.
    Already defined.
- **Constraints:**
  - Zero JavaScript.
  - Only `--cn-*` tokens; no `--color-*` / `--cyan-*` and no hardcoded
    pixel or colour values.
  - **The line is a 1px `background-color` block, not `border-top`.**
    Border-based horizontal rules inherit browser defaults (double-line
    styles, inset/outset 3D shading, unexpected print behaviour); a
    background-painted block is deterministic across UAs.
  - Full width of the containing block (`width: 100%`). Consumer apps
    constrain span via parent layout, not via per-divider overrides.
  - Top and bottom margin equal `--cn-line` so adjacent prose keeps the
    8-px grid rhythm.

### Book Page

- **Target path:** `app/cyan-ds/src/content/core/dividers.mdx`, rendered
  at URL `/core/dividers` — mirrors the source path
  (`packages/cyan/src/core/dividers.css`) and this spec's location.
- **Narrative frame:** the DS styles `<hr>` directly; consumers write
  semantic HTML.
- **Structure:**
  1. **Intro** — one sentence stating that `<hr>` is the single
     "subtle semantic separation" primitive.
  2. **Dual-theme demo** — a `ThemeSplit` block wraps a prose fragment
     (`<p>` above, `<hr />`, `<p>` below) so the rule's contrast is
     visible in both themes.
  3. **Token table** — `--cn-border` (colour), `--cn-line` (margin).

## Contract

### Definition of Done

- [ ] `packages/cyan/src/core/dividers.css` ships and is imported from
      the DS CSS entry point (`packages/cyan/src/core/index.css`).
- [ ] Stylesheet references only `--cn-*` tokens. No `--color-*`,
      `--cyan-*`, or hardcoded pixel / colour values.
- [ ] A bare `<hr>` in any consumer app renders as a 1-px
      `--cn-border`-coloured line with `--cn-line` top and bottom
      margin.
- [ ] The line is painted via `background-color` on a 1-px-tall block;
      no `border-*` shorthand applies.
- [ ] Book page at `app/cyan-ds/src/content/core/dividers.mdx` exists
      and demonstrates the divider in both themes.

### Regression Guardrails

- The divider is styled by `background-color`, never by `border-top` /
  `border-bottom`. Reverting to border-based styling re-introduces the
  browser default double-line / inset shading and is a visible
  regression.
- No hardcoded line colour (`#`, `rgb(...)`, `oklch(...)`) or margin
  pixel values — always a `--cn-*` token.
- Full-width by default; a `max-width` declaration here would break
  intrinsic spanning behaviour.

### Testing Scenarios

#### Scenario: Bare hr adopts DS styling

```gherkin
Given the DS stylesheet is loaded on a page
When a consumer renders `<hr />` with no extra classes
Then the element's computed `height` is 1px
And its computed `border-style` is `none` (all four sides)
And its computed `background-color` is non-transparent and resolves
  from `--cn-border`
And its computed top and bottom margins equal `--cn-line`
  (24px at the default grid)
```

- **Vitest Unit Test:** `packages/cyan/src/core/dividers.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/core/dividers.spec.ts`
