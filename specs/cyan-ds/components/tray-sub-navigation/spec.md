# Feature: Tray Sub-Navigation

## Blueprint

### Context
The `TrayLinkGroup` and `TrayLink` components form the sub-navigation system of the `Tray` sidebar. They are used to group and display secondary links hierarchically under a primary `TrayButton` category. They provide both visual structure and accessible navigation groups.

### Architecture
- **Components:**
  - `packages/cyan/src/components/TrayLinkGroup.astro` (SSR/CSS) — The container (`<ul>`).
  - `packages/cyan/src/components/TrayLink.astro` (SSR/CSS) — The individual link (`<li><a>`).
- **Data Models:**
  - `TrayLinkGroup Props`: `ariaLabel?`: string (Default: "Secondary Navigation").
  - `TrayLink Props`: `href`: string (Required), `label`: string (Required), `active?`: boolean.
- **Rules of Association:**
  - `TrayLink` MUST always be nested inside a `TrayLinkGroup` for correct semantic list structure and indentation.
- **Dependencies:**
  - Consumes `--cn-grid` and `--cn-space-*` for spacing and indentation.
  - Consumes `--cn-text-*` and `--cn-surface-*` for link states (hover, active).
  - Uses `@container` queries to hide sub-navigation when the `Tray` is in rail mode.

### Book Page
- **Target path:** `app/cyan-ds/src/pages/components/tray.mdx`
- **Structure:** A "Sub-navigation" section demonstrating nested groups and links, including how they collapse in rail mode.

### Anti-Patterns
- **Stand-alone TrayLink:** Never use `TrayLink` outside of a `TrayLinkGroup`. It lacks the necessary padding and list container when used alone.
- **JS-Driven Hiding:** Do not use JavaScript to hide the group; use the CSS container query mechanism to ensure deterministic behavior based on the tray's state.

## Contract

### Definition of Done
- [ ] `TrayLinkGroup` renders a `<ul>` with accessible labeling.
- [ ] `TrayLink` renders an `<li>` containing an `<a>` with `aria-current="page"` when active.
- [ ] Hierarchical indentation is derived from `TrayLinkGroup` padding.
- [ ] Entire group is hidden via CSS when container width < 64px.

### Regression Guardrails
- `TrayLink` must handle long text via `text-overflow: ellipsis`.
- The rounded "pill" background of `TrayLink` must not exceed its parent container bounds.
- Active states must use `--cn-*` tokens.

### Testing Scenarios

#### Scenario: Hierarchical Indentation
```gherkin
Given a TrayLink nested within a TrayLinkGroup
Then the link's text must be indented relative to the primary navigation icons
And the indentation value MUST be grid-derived (e.g. multiples of --cn-grid)
```
- **Vitest Unit Test:** `packages/cyan/src/components/TraySubNav.test.ts`

#### Scenario: Active State Feedback
```gherkin
Given a TrayLink with active="true"
Then it must have aria-current="page"
And have a distinct background surface contrast using --cn-surface-contrast tokens
```
- **Vitest Unit Test:** `packages/cyan/src/components/TrayLink.test.ts`

#### Scenario: Rail Mode Invisibility
```gherkin
Given a TrayLinkGroup inside a tray container
When the tray is collapsed to its Rail Mode width (e.g. 64px or less)
Then the TrayLinkGroup MUST have 'display: none'
And no partial text or icons from the sub-menu should be visible
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/tray-navigation.spec.ts`
