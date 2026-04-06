---
feature: Toggle Button
---

# Feature: Toggle Button

## Blueprint

### Context
Provides a discrete "switch" style control for toggling a boolean state (on/off). This is commonly used in settings panels to immediately apply a configuration change without a separate submit step.

### Architecture
- **Components:** `packages/cyan/src/components/ToggleButton.astro` or `ToggleButton.svelte`. Given the requirement for interactive state (`aria-pressed` or `checked` toggle) and potential form integration without JS, an Astro component leveraging an `<input type="checkbox" role="switch">` under the hood is preferred for pure CSS interactivity. Alternatively, if reactive integration is required (e.g., in a complex client form), it should be a Svelte component (`.svelte`).
- **Data Models:** Expects properties `checked` / `pressed` (boolean), `disabled` (boolean), `label` (string).
- **API Contracts:** Must dispatch a native `change` or `input` event when the value changes.
- **Dependencies:** Relies on Cyan design tokens (`--cn-*`) for typography, spacing, and colors.

### Book Page
- **Target path:** `app/cyan-ds/src/pages/components/toggle-button.astro` (or MDX equivalent)
- **Structure:** 
  - Standalone demos showing default (off), checked (on), and disabled states.
  - Form integration demo showing standard `FormData` extraction.
  - Prop tables detailing `checked`, `disabled`, and `label`.

### Anti-Patterns
- **Avoid JS-driven accessibility:** The original implementation manually bound `keydown` listeners for 'Enter' and 'Space' and set `tabindex="0"` on the host element while wrapping a nested `<button>`. This is an accessibility anti-pattern. The v20 implementation MUST use a native interactive element (e.g., `<button>` or `<input type="checkbox">`) that handles keyboard interactions inherently.
- **Avoid deprecated tokens:** The original code used `--background-toggle-button-off` and `--color-on-toggle-button`. These MUST be migrated to the `--cn-*` namespace.
- **Avoid manual disabled styling overrides:** Don't use `pointer-events: none` and `opacity: 0.33` with `!important` on a custom wrapper. Use native `:disabled` attributes and CSS pseudo-classes.

## Contract

### Definition of Done
- [ ] Toggle Button renders correctly using only `--cn-*` tokens.
- [ ] Keyboard navigation (Tab) focuses the control natively, and Space/Enter toggles its state.
- [ ] Screen readers announce the state correctly using `role="switch"` and `aria-checked={checked}`.
- [ ] Emits a standard `change` event when toggled.

### Regression Guardrails
- The component must never trap focus.
- The disabled state must definitively prevent toggling via both mouse and keyboard.

### Testing Scenarios
All features with behavioral contracts must have corresponding automated tests mapped to their Gherkin scenarios.

#### Scenario: Toggling the button state
```gherkin
Given a Toggle Button is rendered with a label "Enable Feature"
When the user clicks the toggle
Then the toggle transitions to the "checked" / "pressed" state
And a change event is emitted
```
- **Vitest Unit Test:** `packages/cyan/src/components/ToggleButton.test.ts` (if logic is present)
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/toggle-button.spec.ts`

#### Scenario: Interacting with a disabled toggle
```gherkin
Given a Toggle Button is rendered with the disabled property set to true
When the user clicks the toggle
Then the state does not change
And no change event is emitted
```
- **Vitest Unit Test:** `packages/cyan/src/components/ToggleButton.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/toggle-button.spec.ts`
