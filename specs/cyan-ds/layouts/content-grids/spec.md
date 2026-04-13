# Feature: Content Grids

## Blueprint

### Context
Standardize structural content layout within the `<main>` area using semantic HTML and CSS Grid. The system provides three layout patterns — `prose`, `golden`, and `triad` — all derived from golden-ratio (phi) proportions. The base unit is `1fr` (small), scaling up by powers of phi (1.618).

| Layout | Columns | Contract | Typical use |
|--------|---------|----------|-------------|
| `prose` | 1 | `min(67ch, 100%)` centered | Article reading, single-column pages |
| `golden` | 2 | **Grid-based** two-mode layout. **Mode 1** (container fits `gap + 67ch + gap + 67ch/2.618 + gap`) — five fixed tracks, block sized to its content (`width: fit-content`) and centered via `margin-inline: auto`. **Mode 2** (below threshold) — shares the base 3-track grid `gap \| 1fr \| gap`; children stack in column 2 with `--cn-gap` row spacing. | Thread view + sidebar, detail + meta |
| `triad` | 3 | **Grid-based** two-mode layout. **Mode 1** (container fits `gap + 67ch/1.618 + gap + 67ch/2.618 + gap + 67ch/2.618 + gap`) — one medium (`67ch/1.618`) + two small (`67ch/2.618`) columns with gaps, block sized to content and centered. **Mode 2** (below threshold) — shares the base 3-track grid; children stack in column 2 with `--cn-gap` row spacing. | Front page, dashboard |

### The phi family (sizing vocabulary)

All fixed-track widths in the grid primitives come from a three-step phi-family scale, keyed off the 67ch readability cap:

| Name | Value | Used by |
|---|---|---|
| **Large** | `67ch` | Prose cap, Golden primary |
| **Medium** | `67ch / 1.618` ≈ 41ch | Triad medium |
| **Small** | `67ch / 2.618` ≈ 26ch | Golden sidebar, Triad secondaries |

The scale is internally consistent: `67ch / 1.618 + 67ch / 2.618 = 67ch`, so **golden's large column equals triad's medium + small** (the original "triad is a split golden" invariant).

Ratios are expressed as **upper bounds** on fixed tracks — not `fr`-proportional to container width. When the container is too narrow to accommodate the block's natural width, the layout collapses to a 100%-wide stack.

### Architecture
- **Content Grid CSS:** `packages/cyan/src/layouts/content-grid.css`
- **Tokens:** `packages/cyan/src/tokens/units.css`
- **Semantics:** Applied via `.cn-content-prose`, `.cn-content-golden`, `.cn-content-triad` classes on containers within `<main>`.

### Implementation Note: Container Query Constraints

Some values in `content-grid.css` are intentionally expressed as **magic numbers** rather than through `var(--cn-*)` tokens. This is a limitation of CSS, not a design choice:

- **`var()` is not permitted inside `@container` size conditions.** Custom properties resolve against an element; `@container` conditions are evaluated at the stylesheet level with no element context. Writing `@container (min-width: var(--cn-gap))` is invalid CSS.
- **Affected:**
  - Golden wide-mode threshold: `@container (min-width: calc(3rem + 67ch + 67ch / 2.618))` — `3rem` = three `--cn-gap` contributions.
  - Triad wide-mode threshold: `@container (min-width: calc(4rem + 67ch / 1.618 + (67ch / 2.618) * 2))` — `4rem` = four `--cn-gap` contributions.
  - Both assume `--cn-gap` resolves to `1rem`.
- **Invariant to uphold:** if `--cn-gap` ever changes away from `1rem`, both thresholds must be updated by hand to stay synchronized. Track-side CSS (inside the rule body) continues to use `var(--cn-gap)` as usual — this constraint only affects the `@container (...)` condition itself.

### Book Page
- **Target path:** `app/cyan-ds/src/content/principles/content-grids.mdx`
- **Category:** Foundational Principle
- **Structure:**
  - **Prose Demo:** Centered 67ch column with gutters visualized.
  - **Golden Demo:** Two-column split showing 2.618fr : 1fr proportions.
  - **Triad Demo:** Three-column split showing 1.618fr : 1fr : 1fr proportions.
  - **Collapse Behavior Demo:** Showing how layouts stack on narrow containers.
  - **Full Width Demo:** `.cn-grid-full` override spanning all columns.
  - **Vertical Rhythm Guide:** Spacing between consecutive grid sections.

### Future: Listing Layouts
Two listing-specific layout patterns — **card-grid** and **list-grid** — are planned but deferred. Both will build on these content grid primitives and add:
- A filter panel (top bar or sidebar)
- A listing area (3-column card grid or golden-ratio main/detail list)
- A footer panel (pagination, load-more)

These will be specified separately once the base content grids are implemented.

### Anti-Patterns
- **No Wrapper Components:** Do not create a `ContentGrid.astro` component; use global CSS selectors and utility classes to keep the HTML semantic and clean.
- **No Fixed Widths:** Never use fixed pixel widths for columns. Use `ch` for readability (prose) or `fr` units with golden-ratio proportions for multi-column layouts.
- **No Nested Content Grids:** Elements inside a grid column should utilize their own internal flex/grid logic, not nest another content grid.
- **No media queries:** Use `@container` queries exclusively for responsive behavior.

## Contract

### Definition of Done
- [x] `main` element (`.cn-app-main`) has `container-type: inline-size`.
- [x] `.cn-content-prose` implements the centered 67ch readability grid (3-column: elastic | `min(67ch, 100%)` | elastic).
- [x] `.cn-content-golden` implements a **grid-based** two-mode layout (consistent with prose/triad). **Mode 1** — `@container (min-width: calc(3rem + 67ch + 67ch / 2.618))` (see *Implementation Note: Container Query Constraints* for why `3rem` is a literal), `grid-template-columns: var(--cn-gap) 67ch var(--cn-gap) calc(67ch / 2.618) var(--cn-gap); width: fit-content; margin-inline: auto; row-gap: 0;` with primary at `grid-column: 2` and sidebar at `grid-column: 4`. Because the threshold uses `ch`, it tracks the block's actual rendered width; tracks are fixed (no `minmax`) so widths do not shrink — the mode flips cleanly the instant the container fits. **Mode 2** (below threshold): base 3-track grid `var(--cn-gap) 1fr var(--cn-gap)` with both children at `grid-column: 2` and `row-gap: var(--cn-gap)`.
- [x] `.cn-content-triad` implements a **grid-based** two-mode layout. **Mode 1** — `@container (min-width: calc(4rem + 67ch / 1.618 + (67ch / 2.618) * 2))` (see *Implementation Note: Container Query Constraints* for why `4rem` is a literal), seven fixed tracks `var(--cn-gap) calc(67ch / 1.618) var(--cn-gap) calc(67ch / 2.618) var(--cn-gap) calc(67ch / 2.618) var(--cn-gap)`, `width: fit-content; margin-inline: auto; row-gap: 0;` with children at `grid-column: 2, 4, 6`. **Mode 2** (below threshold): base 3-track grid `var(--cn-gap) 1fr var(--cn-gap)` with children stacked in column 2 and `row-gap: var(--cn-gap)`.
- [x] On narrow containers (below each primitive's own threshold), layouts collapse to a single stacked column with `--cn-gap` gutters. Prose/Triad (and structural `section`/`article`) switch at `60rem`; Golden switches at `calc(3rem + 67ch + 67ch / 2.618)`; Triad switches at `calc(4rem + 67ch / 1.618 + (67ch / 2.618) * 2)`.
- [x] `.cn-grid-full` spans all columns in any layout variant.
- [x] Direct siblings (consecutive grid containers) are separated by `2 * --cn-gap`.
- [x] All responsive behavior uses `@container` queries, not `@media`.

### Regression Guardrails
- Prose layout must never exceed 67ch content width regardless of container size.
- Golden and Triad track widths must remain phi-derived, expressed as fixed ch-based caps (Large = `67ch`, Medium = `67ch / 1.618`, Small = `67ch / 2.618`) — not `fr` proportions to container width.
- Invariant: `67ch / 1.618 + 67ch / 2.618 = 67ch` (golden large = triad medium + small).
- Gutters on narrow containers must equal `--cn-gap` (16px).

### Testing Scenarios

#### Scenario: Prose — Desktop Readability Centering
```gherkin
Given a container with class .cn-content-prose
  When the container width is >= 60rem
  Then direct children must be centered
  And they must have a maximum width of 67ch
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/content-grids.spec.ts`

#### Scenario: Prose — Mobile Gutter Safety
```gherkin
Given a container with class .cn-content-prose
  When the container width is < 60rem
  Then the content must have exactly var(--cn-gap) padding from the left and right edges
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/content-grids.spec.ts`

#### Scenario: Golden — Two-Column Large + Small
```gherkin
Given a container with class .cn-content-golden
  When the container width is >= calc(3rem + 67ch + 67ch/2.618)
  Then the layout must display two columns
  And the first column width must be approximately 67ch (large)
  And the second column width must be approximately 67ch / 2.618 (small)
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/content-grids.spec.ts`

#### Scenario: Golden — Narrow Collapse
```gherkin
Given a container with class .cn-content-golden
  When the container width is < calc(3rem + 67ch + 67ch/2.618)
  Then the layout must collapse to a single stacked column with var(--cn-gap) gutters
  And the two children must stack vertically with var(--cn-gap) between them
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/content-grids.spec.ts`

#### Scenario: Triad — Three-Column Medium + Small + Small
```gherkin
Given a container with class .cn-content-triad
  When the container width is >= calc(4rem + 67ch/1.618 + (67ch/2.618) * 2)
  Then the layout must display three columns
  And the first column width must be approximately 67ch / 1.618 (medium)
  And the second and third column widths must each be approximately 67ch / 2.618 (small)
  And the second and third column widths must be equal
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/content-grids.spec.ts`

#### Scenario: Triad — Narrow Collapse
```gherkin
Given a container with class .cn-content-triad
  When the container width is < calc(4rem + 67ch/1.618 + (67ch/2.618) * 2)
  Then the layout must collapse to a single stacked column with var(--cn-gap) gutters
  And the three children must stack vertically with var(--cn-gap) between them
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/content-grids.spec.ts`

#### Scenario: Full Width Override
```gherkin
Given an element with class .cn-grid-full inside any content grid variant
  When the grid is active
  Then the element must span the entire grid (grid-column: 1 / -1)
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/content-grids.spec.ts`
