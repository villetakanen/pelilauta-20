# Feature: Hamburger Button
Parent: [Tray](../tray/spec.md)

The `HamburgerButton` is a specialized, interactive toggle for the `Tray`. It is a functional component that encapsulates both the navigation's expanded state (`type="checkbox"`) and its visual representation.

## Blueprint

### Context
It provides a deterministic way to toggle the `Tray` without JavaScript. Because there is only one "Hamburger" per `Tray`, this component serves as the localized state source for the parent navigation domain.

### Architecture
- **Component:** `packages/cyan/src/components/HamburgerButton.astro` (Astro + CSS).
- **Implementation:** 
  - Renders an `<input type="checkbox" class="cn-tray-toggle">`. 
  - Uses a `<label>` (wrapping the input) to provide the legacy "two-bar" indicator and its "morphing-to-X" animation.
- **Visuals:** 
  - **Indicator:** Two thick bars (`calc(var(--cn-grid) / 2)`) with rounded ends, rather than the traditional three-line hamburger.
  - **Animation:** Animates from parallel lines to a centered "X" via `translate3d` and `rotate` transitions when `:checked`.
  - **No-Logo:** No background branding or fox icons; maintains a minimal, functional aesthetic.
  - Uses `appearance: none` if the input is rendered as the primary hit area, or a classic hidden input + label pattern for accessibility.

### Relationship to Tray
- **State Source:** The `Tray` component responds to the state of this button using `.cn-tray:has(.cn-tray-toggle:checked)`.
- **ID Coupling:** While we strive to avoid brittle IDs, a shared ID is used internally between the `HamburgerButton` and the `Tray`'s **Scrim** to allow the Scrim to clear the checkbox state on click. This ID is an internal implementation detail of the `Tray` component and does not need to be managed by the end-user.

### Placement
- **Mobile (< 621px):** `position: fixed` at `top: var(--cn-grid)` and `left: var(--cn-grid)`.
- **Rail & Expanded (>= 621px):** Must be horizontally centered within the surface of the Tray or Icon Rail.
  - Calculation: Horizontal offset should align the button's center with the Tray/Rail's center line.
  - Visual Invariant: Vertical alignment should match the spacing of other primary navigation elements (`TrayButton`).
- **Z-Index:** Must be higher than the `AppBar` but lower than the `Tray`'s drawer surface (or matched to the drawer's content layer) so it remains visible and interactive when the tray is open.
- **No Borders:** Follows the Cyan DS "no-border" rule; separation is handled by hover states and background colors.

## Contract

### Definition of Done
- [ ] Renders a functional checkbox that drives the Tray's `:has()` styles.
- [ ] Visual animation transitions smoothly between states.
- [ ] Keyboard accessible (Space/Enter toggle the state).
- [ ] `aria-label="Menu"` or equivalent for screen readers.

### Testing Scenarios

#### Scenario: State Projection
```gherkin
Given a Tray containing a HamburgerButton
When the HamburgerButton is checked
Then the parent .cn-tray element must match the :has(.cn-tray-toggle:checked) selector
And the Drawer surface must expand to its full width
```
- **Vitest Unit Test:** `packages/cyan/src/components/Tray.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/tray-toggle.spec.ts`
