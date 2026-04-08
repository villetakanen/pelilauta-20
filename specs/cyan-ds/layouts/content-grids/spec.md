# Feature: Content Grids

## Blueprint

### Context
Standardize structural content layout within the `<main>` area using semantic HTML and CSS Grid. The system provides three layout patterns — `prose`, `golden`, and `triad` — all derived from golden-ratio (phi) proportions. The base unit is `1fr` (small), scaling up by powers of phi (1.618).

| Layout | Columns | Ratio | Typical use |
|--------|---------|-------|-------------|
| `prose` | 1 | `min(67ch, 100%)` centered | Article reading, single-column pages |
| `golden` | 2 | `2.618fr 1fr` | Thread view + sidebar, detail + meta |
| `triad` | 3 | `1.618fr 1fr 1fr` | Front page, dashboard |

The proportional system is internally consistent: golden's large column (2.618fr) equals triad's medium + small (1.618fr + 1fr), so a golden layout is a triad with the two right columns merged.

### Architecture
- **Content Grid CSS:** `packages/cyan/src/layouts/content-grid.css`
- **Tokens:** `packages/cyan/src/tokens/units.css`
- **Semantics:** Applied via `.cn-content-prose`, `.cn-content-golden`, `.cn-content-triad` classes on containers within `<main>`.

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
- [x] `.cn-content-golden` implements a 2-column grid with `2.618fr 1fr` proportions.
- [x] `.cn-content-triad` implements a 3-column grid with `1.618fr 1fr 1fr` proportions.
- [x] On narrow containers (< 60rem), all layouts collapse to a single stacked column with `--cn-gap` gutters.
- [x] `.cn-grid-full` spans all columns in any layout variant.
- [x] Direct siblings (consecutive grid containers) are separated by `2 * --cn-gap`.
- [x] All responsive behavior uses `@container` queries, not `@media`.

### Regression Guardrails
- Prose layout must never exceed 67ch content width regardless of container size.
- Golden and triad column ratios must remain phi-derived (2.618:1 and 1.618:1:1 respectively).
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

#### Scenario: Golden — Two-Column Ratio
```gherkin
Given a container with class .cn-content-golden
  When the container width is >= 60rem
  Then the layout must display two columns
  And the first column width must be approximately 2.618 times the second column width
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/content-grids.spec.ts`

#### Scenario: Golden — Narrow Collapse
```gherkin
Given a container with class .cn-content-golden
  When the container width is < 60rem
  Then the layout must collapse to a single stacked column with var(--cn-gap) gutters
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/content-grids.spec.ts`

#### Scenario: Triad — Three-Column Ratio
```gherkin
Given a container with class .cn-content-triad
  When the container width is >= 60rem
  Then the layout must display three columns
  And the first column width must be approximately 1.618 times the second column width
  And the second and third column widths must be equal
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/content-grids.spec.ts`

#### Scenario: Triad — Narrow Collapse
```gherkin
Given a container with class .cn-content-triad
  When the container width is < 60rem
  Then the layout must collapse to a single stacked column with var(--cn-gap) gutters
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/content-grids.spec.ts`

#### Scenario: Full Width Override
```gherkin
Given an element with class .cn-grid-full inside any content grid variant
  When the grid is active
  Then the element must span the entire grid (grid-column: 1 / -1)
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/content-grids.spec.ts`
