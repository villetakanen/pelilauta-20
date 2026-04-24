---
feature: Card Grid
parent_spec: specs/cyan-ds/layouts/content-grids/spec.md
---

# Feature: Card Grid

## Blueprint

### Context

A responsive card-flow layout for use inside any element — typically a column in a content-triad or content-golden grid. When the parent is wide enough to fit two "small" cards side by side (each `~26ch`, the phi-family small), cards arrange in a 2–3 column wrapping grid. When not, cards stack at full width. This is the inner layout primitive that replaces ad-hoc flex/grid wiring for card-heavy regions like the front page.

### Architecture

- **CSS:** `packages/cyan/src/layouts/card-grid.css` — a single utility class `.cn-card-grid`.
- **Tokens:** Uses `--cn-gap` for gap. Card column sizing derived from the phi-family "small" value (`67ch / 2.618`).
- **Technique:** CSS Grid with `auto-fill` and `minmax()`. The `min` of `minmax` is the small card floor (`calc(67ch / 2.618)`); the `max` is `1fr`. This lets the browser fill 2–3 columns when the parent is wide enough, and collapse to 1 column when it isn't — all without container queries or media queries.
- **Dependencies:**
  - `--cn-gap` from `packages/cyan/src/tokens/units.css`
  - Consumed by content-grid columns (triad, golden) and any standalone element.
  - `CnCard` is the expected child, but the layout is content-agnostic — any block-level child works.
- **Constraints:**
  - All responsive behavior is intrinsic (grid `auto-fill`) — no `@container` or `@media` queries.
  - The class applies to the parent element, not to children. Children receive no special classes.
  - Children stretch to fill their grid cell (`align-self: stretch` is the grid default).

## Contract

### Definition of Done

- [ ] `.cn-card-grid` class exists in `packages/cyan/src/layouts/card-grid.css`.
- [ ] Uses `display: grid` with `grid-template-columns: repeat(auto-fill, minmax(calc(67ch / 2.618), 1fr))` and `gap: var(--cn-gap)`.
- [ ] In a parent wide enough for 2+ small columns plus gap, cards arrange side by side and wrap.
- [ ] In a parent narrower than 2 small columns plus gap, cards stack at full width.
- [ ] Imported in the DS stylesheet so it's globally available (same pattern as `content-grid.css`).
- [ ] Book page demonstrates the layout in isolation and inside a triad column.

### Regression Guardrails

- Card column floor must remain `calc(67ch / 2.618)` — the phi-family small value. Changing it breaks visual consistency with triad/golden column widths.
- Gap must be `var(--cn-gap)`, not a hardcoded value.
- The class must not set `container-type` on itself — it may be nested inside an element that already manages containment.

### Testing Scenarios

#### Scenario: Cards arrange side by side in a wide parent

```gherkin
Given an element with class .cn-card-grid
And the element is at least calc(67ch / 2.618 * 2 + var(--cn-gap)) wide
When 4 card children are present
Then cards arrange in a 2-column wrapping grid
And the gap between cards equals var(--cn-gap)
```

- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/card-grid.spec.ts`

#### Scenario: Cards stack in a narrow parent

```gherkin
Given an element with class .cn-card-grid
And the element is narrower than calc(67ch / 2.618 * 2 + var(--cn-gap))
When 4 card children are present
Then cards stack vertically at full width
And the gap between cards equals var(--cn-gap)
```

- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/card-grid.spec.ts`

#### Scenario: Three columns in a large parent

```gherkin
Given an element with class .cn-card-grid
And the element is at least calc(67ch / 2.618 * 3 + var(--cn-gap) * 2) wide
When 6 card children are present
Then cards arrange in a 3-column wrapping grid
```

- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/card-grid.spec.ts`
