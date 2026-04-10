---
feature: Elevation
parent_spec: specs/cyan-ds/utilities/spec.md
stylebook_url: /principles/elevation
---

# Feature: Elevation

Parent: [Utilities](../spec.md)

## Blueprint

### Context
Elevation utilities provide a consistent system for visual depth, distinguishing surfaces that sit "higher" (closer to the user) from ones that are "lower" (closer to the background). This is achieved through coordinated background colors and shadows, maintaining a coherent layering system across the UI.

### Architecture
- **Components:** `packages/cyan/src/utilities/elevation.css` (Target migration path for utilities in v20)
- **Data Models:** CSS Utility classes (`.elevation-0` through `.elevation-4`)
- **API Contracts:** Classes applied to structural HTML elements.
- **Dependencies:** Relies on strict cyan design tokens: `--cn-surface` for the ground plane, `--cn-surface-[1-4]` for lifted surfaces, and `--cn-shadow-elevation-[2-4]` for depth shadows. Elevation 0 is the app surface ground plane (`--cn-surface`), used to establish a surface over background imagery or non-surface content. Elevation 1 is the first visual lift, distinguished by surface color alone (no shadow). Surface mappings for dark mode follow a 20-30-30-40-50 tonal progression. Light mode follows a 99-100-100-100-80 progression; surfaces 1-3 resolve to `chroma-surface-100` (white), the ground plane to `chroma-surface-99` (near-white), and surface-4 breaks to `chroma-surface-80` (visible gray). Shadows are strictly derived from `--cn-grid` multiples (no magic numbers).

### Book Page
- **Target path:** `app/cyan-ds/src/content/principles/elevation.mdx`
- **Structure:** Show standalone elevated cards (levels 1-4) and demonstrate nested elevation rules visually.

### Anti-Patterns
- **Legacy Tokens:** Use of `--color-surface-*` and `--shadow-elevation-*` is deprecated. Must be strictly mapped to `--cn-surface-*` and `--cn-shadow-elevation-*`.
- **Shorthand Background:** Using `background:` instead of `background-color:` is an anti-pattern as it overwrites valid developer overrides like gradients or background images.
- **Shadows on Base Elevation:** Applying shadows to `.elevation-1` is forbidden. It is strictly a surface base differentiator, not a floating element.

## Contract

### Definition of Done
- [ ] CSS elevation utilities (`.elevation-0` through `.elevation-4`) are implemented using `--cn-*` tokens.
- [ ] Structural layout (nesting) visually adjusts shadows according to the relative elevation rule.

### Regression Guardrails

- **Elevation 0 Ground Plane:** `.elevation-0` MUST use `background-color: var(--cn-surface)`, never `transparent`. It is the app surface ground plane, not a reset utility.
- **Zero Magic Numbers:** Shadows must use `calc(var(--cn-grid) * multiplier)` for all offset/blur components.
- **Elevation 4 Intentional Deviancy:** Elevation 4 deliberately breaks the linear surface progression in both modes. Dark mode jumps to `chroma-surface-50` (vs the expected linear step). Light mode drops to `chroma-surface-80` (vs white for levels 1-3). This asymmetry is by design to create a visually distinct system layer and to enforce mandatory high-contrast text (WCAG AA). Do not "normalize" this to a linear curve.
- **Light-Mode Surface Contract:** The ground plane (surface-0) MUST use `chroma-surface-99` in light mode (near-white, subtly distinct from pure white surfaces). Surfaces 1-3 MUST resolve to `chroma-surface-100` (white) in light mode, maintaining elevation distinction through shadows alone. Surface 4 MUST break to a visible gray (`chroma-surface-80` light / `chroma-surface-50` dark) to signal the system layer.
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
