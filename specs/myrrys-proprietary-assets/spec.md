# Feature: Myrrys Proprietary Assets

## Blueprint

### Context
This feature manages proprietary and non-free assets used by the RPG community platform. These assets include icons, original artwork, branding, and other media that are not under the project's primary open-source license.

### Architecture
- **Package:** `packages/myrrys-proprietary/` (Git Submodule)
- **Icons:** `packages/myrrys-proprietary/icons/*.svg`
- **Other Assets:** Organized by license or source (e.g., `fair-use/`, `juno-viinikka/`, etc.)
- **Integration:** Exposed as a workspace package `@myrrys/proprietary`.

### Anti-Patterns
- **No Direct Commit to Submodule:** Avoid committing changes to `packages/myrrys-proprietary` from the main repository unless it's a specific asset update intended for the subrepo.
- **No Open-Source Assets:** Do not place MIT-licensed or general community assets here. Use `@pelilauta/icons` for community-sourced icons.

## Contract

### Definition of Done
- [ ] Assets are correctly resolved by the `CnIcon` component at Tier 2.
- [ ] The submodule is tracked and initialized in the main repository.
- [ ] The `package.json` correctly defines exports for icons and other assets.

### Regression Guardrails
- **License Integrity:** Proprietary assets must NEVER be leaked into open-source packages.
- **Path Stability:** The `icons/` directory must remain the source of truth for proprietary SVGs.

### Testing Scenarios

#### Scenario: Proprietary Icon Resolution
```gherkin
Given an icon "proprietary-logo" exists in @myrrys/proprietary/icons
When the CnIcon component is rendered with noun "proprietary-logo"
Then it correctly inlines the SVG content from the proprietary package
```
- **Vitest Unit Test:** `packages/cyan/src/components/CnIcon.test.ts` (verify Tier 2 resolution logic)
