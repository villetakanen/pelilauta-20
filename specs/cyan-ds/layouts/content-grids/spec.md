# Feature: Content Grids (Semantic Layout)

## Blueprint

### Context
Standardize structural content layout within the `<main>` area using semantic HTML and CSS Grid, ensuring optimal readability (67ch) and adaptive gutters (8px grid) without component overhead.

### Architecture
- **Content Grid CSS:** `packages/cyan/src/layouts/content-grid.css` (Standard centering)
- **Dashboard Grid CSS:** `packages/cyan/src/layouts/dashboard-grid.css` (Utility-heavy views)
- **Tokens:** `packages/cyan/src/tokens/units.css`
- **Semantics:** Global rules targeting `main > section` and `main > article`.

### Anti-Patterns
- **No Wrapper Components:** Do not create a `ContentGrid.astro` component; use global CSS selectors to keep the HTML semantic and clean.
- **No Fixed Widths:** Never use fixed pixel widths. Use `ch` for readability or `rem`-based grid units for density.

## Contract

### Definition of Done
- [ ] `main` element has `container-type: inline-size`.
- [ ] `main > section` and `main > article` implement the 3-column "Holy Grail" grid.
- [ ] Central column calculates `min(67ch, 100%)` for content readability on desktop.
- [ ] Mobile/Narrow views enforce 16px (`--cn-gap`) gutters.

### Testing Scenarios

#### Scenario: Desktop Readability Centering
```gherkin
Given a <section> within a <main> container
  When the container width is 1200px (>= 60rem)
  Then the direct children of the section must be centered
  And they must have a maximum width of 67ch
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/content-grids.spec.ts`

#### Scenario: Mobile Gutter Safety
```gherkin
Given a <section> within a <main> container
  When the container width is 400px (< 60rem)
  Then the content column must have exactly var(--cn-gap) padding from the left and right edges
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/content-grids.spec.ts`

#### Scenario: Semantic Grid Override (Full Width)
```gherkin
Given a <div> with the class .cn-grid-full inside a <section>
  When the grid is active
  Then the div must span the entire 3-column layout (grid-column: 1 / -1)
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/content-grids.spec.ts`
