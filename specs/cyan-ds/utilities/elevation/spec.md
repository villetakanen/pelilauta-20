# Feature: Elevation Utilities

Parent: [Utilities](../spec.md)

## Blueprint

### Context
Elevation utilities provide a consistent system for visual depth, distinguishing surfaces that sit "higher" (closer to the user) from ones that are "lower" (closer to the background). This is achieved through coordinated background colors and shadows, maintaining a coherent layering system across the UI.

### Architecture
- **Components:** `packages/cyan/src/utilities/elevation.css` (Target migration path for utilities in v20)
- **Data Models:** CSS Utility classes (`.elevation-1` to `.elevation-4`)
- **API Contracts:** Classes applied to structural HTML elements.
- **Dependencies:** Relies on strict cyan design tokens: `--cn-surface-[1-4]` for backgrounds and `--cn-shadow-elevation-[2-4]` for depth shadows. (Elevation 1 is intentionally shadowless to signify a surface change without z-axis lift).

### Book Page
- **Target path:** `app/cyan-ds/src/pages/utilities/elevation/` (or similar utility documentation)
- **Structure:** Show standalone elevated cards (levels 1-4) and demonstrate nested elevation rules visually.

### Anti-Patterns
- **Legacy Tokens:** Use of `--color-surface-*` and `--shadow-elevation-*` is deprecated. Must be strictly mapped to `--cn-surface-*` and `--cn-shadow-elevation-*`.
- **Shorthand Background:** Using `background:` instead of `background-color:` is an anti-pattern as it overwrites valid developer overrides like gradients or background images.
- **Shadows on Base Elevation:** Applying shadows to `.elevation-1` is forbidden. It is strictly a surface base differentiator, not a floating element.

## Contract

### Definition of Done
- [ ] CSS elevation utilities (`.elevation-1` through `.elevation-4`) are implemented using `--cn-*` tokens.
- [ ] Structural layout (nesting) visually adjusts shadows according to the relative elevation rule.

### Regression Guardrails
- **Relative Elevation Engine:** Nested elevation elements (e.g., an `elevation-2` inside an `elevation-1`) must conditionally step down their visible shadow *relative* to their parent to prevent overly harsh shadows. This MUST be implemented via explicit descendant CSS combinators (e.g., `.elevation-1 .elevation-2`) and not dynamic variable `calc()`, ensuring 100% deterministic cross-browser behavior for our 4-level system.

### Testing Scenarios
All features with behavioral contracts must have corresponding automated tests mapped to their Gherkin scenarios.

#### Scenario: Standalone Elevation Application
```gherkin
Given a component has the class `elevation-2`
When it is rendered at the root level (no elevated parents)
Then it should apply the corresponding surface color and full level 2 shadow token
```
- **Vitest Unit Test:** (N/A — pure CSS)
- **Playwright E2E Test:** `app/cyan-ds/e2e/utilities/elevation.spec.ts`

#### Scenario: Relative Nested Elevation
```gherkin
Given an element has the class `elevation-2`
When it is nested inside an element with `elevation-1`
Then its box-shadow visually computes to a level 1 leap (using the level 1 shadow token)
```
- **Vitest Unit Test:** (N/A — pure CSS)
- **Playwright E2E Test:** `app/cyan-ds/e2e/utilities/elevation.spec.ts`
