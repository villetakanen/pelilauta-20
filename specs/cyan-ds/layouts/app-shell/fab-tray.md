---
feature: AppShell FAB Tray
status: draft
maturity: design
last_major_review: 2026-05-20
parent_spec: ./spec.md
---

# Feature: AppShell FAB Tray

## Blueprint

### Context
The FAB (Floating Action Button) Tray is a Design System primitive container placed within `AppShell`. It provides a standardized, fixed viewport position in the bottom-right corner of the page to present primary contextual triggers (like starting a thread, creating a character, or uploading an asset) without interfering with main content layouts.

### Architecture
- **Components:** 
  - `AppShell` ([packages/cyan/src/layouts/AppShell.astro](file:///Users/ville.takanen/dev/pelilauta-20/packages/cyan/src/layouts/AppShell.astro))
  - `Page` ([packages/cyan/src/layouts/Page.astro](file:///Users/ville.takanen/dev/pelilauta-20/packages/cyan/src/layouts/Page.astro))
- **Slots:**
  - `fab-tray` — Slot to accept one or more floating action buttons.
- **CSS Styles:**
  - Placed globally or inside AppShell's structural styling. Renders fixed relative to the viewport.
  - Positioning: `bottom: var(--cn-gap, 1rem); right: var(--cn-gap, 1rem);`.
  - Stacking direction: flex-column, stack upwards with gap `var(--cn-grid, 0.5rem)`.
  - Z-index: `var(--cn-z-fab, 2000)` to float above typical content but sit beneath dialog/modal layers.

## Contract

### Definition of Done
- [ ] `AppShell.astro` defines a `<nav class="cn-fab-tray">` element wrapping `<slot name="fab-tray" />`.
- [ ] `.cn-fab-tray` positions elements dynamically in the bottom-right corner using fixed viewport values.
- [ ] `Page.astro` layout forwards the `fab-tray` slot transparently to `AppShell`.
- [ ] Multiple items added to the tray stack vertically from bottom to top with standard grid spacing.

### Regression Guardrails
- **No Absolute Page Positioning:** Individual pages must never define local CSS position or margins to float action buttons. All placement is governed by the Design System `.cn-fab-tray` wrapper.
- **Z-Index Boundaries:** FAB tray must stay above `<main>` content scrolling but remain below active popover/dialog layers.

## Testing Scenarios

#### Scenario: FAB tray positions elements in the bottom-right corner
```gherkin
Given a page layout using Page.astro with content in the "fab-tray" slot
When the page is rendered
Then the fab-tray container is styled with position: fixed
And it has bottom and right properties set to var(--cn-gap)
And it has z-index set to var(--cn-z-fab)
```

#### Scenario: Multiple FAB items stack vertically
```gherkin
Given a page rendering two buttons in the "fab-tray" slot
When the page is rendered
Then the fab-tray container aligns them in a vertical column
And has flex-direction set to column
And has a gap set to var(--cn-grid)
```
