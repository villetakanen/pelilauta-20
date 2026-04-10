# Feature: TrayButton

The `TrayButton` is the primary interactive element for the application navigation system. It provides consistent styling for primary routes, supports icons and labels, and adapts visually when the parent navigation is in rail mode.

## Blueprint

### Context
Used primarily within the `Tray` component for navigation. It must be accessible, support "active" states for current routes, and work elegantly as a standalone tile (icon-only rail) or a full-width navigation link (expanded tray).

### Architecture
- **Component:** `TrayButton.astro` 
- **Structure:**
  - Root: `<a>` anchor element for standard navigation behavior.
  - Slot `icon`: For custom icon components. If empty, the component defaults to rendering a `CnIcon` using the `icon` prop.
  - Label: `<span class="cn-tray-button__label">` for the link text.
- **Style Invariants:**
  - No borders.
  - Default color: `light-dark(var(--chroma-surface-20), var(--chroma-surface-90))` — surface-tinted, not content link colors.
  - Hover/focus: `--cn-hover` background.
  - Active: `--cn-text` foreground, `--cn-hover` background.
  - Focus ring: `--cn-link` (primary accent for visibility).
  - Uses CSS `:has()` or structural coupling to hide labels in rail mode.

### API Contract
- **Props:**
  - `href` (required): The destination URL.
  - `label` (required): Functional text description.
  - `icon` (optional): Noun identifying an icon in the registry (e.g. "fox", "add"). Rendered via `CnIcon` if the icon slot is empty.
  - `active` (optional): Boolean to apply "active" styling (surface contrast shift).
- **Slots:**
  - `icon`: Dedicated named slot for complex icon rendering.

### Responsive Modes
- **Rail Mode (Parent collapsed):** The label MUST be hidden (`display: none` or similar) to allow the sidebar to maintain its 80px width while keeping the icon centered.
- **Expanded Mode (Parent expanded):** The label is visible and centered horizontally with the icon.

### Book Page Specification
The component MUST be documented on a dedicated page within the documentation site.
- **Target path:** `app/cyan-ds/src/pages/components/tray-button.mdx` (co-residing with the DS spec requirement).
- **Content:**
  - **Overview:** Defines the component's purpose.
  - **Variants Demo:** Shows idle, hover, and active states.
  - **Custom Icon Slot Demo:** Shows usage with `CnIcon` or custom SVGs.
  - **Props Table:** Lists all functional props.
  - **CSS Token Reference:** Lists the `--cn-*` tokens used for background, text color, and icon sizing.

## Contract

### Definition of Done
- [ ] Correctly applies `.active` class when prop is set.
- [ ] Hides label via CSS media query/selector when parent `.cn-tray` is collapsed.
- [ ] Documentation page exists at `app/cyan-ds/src/pages/components/tray-button.mdx`.
- [ ] Component is demoed in isolation with props table.

### Regression Guardrails
- Active state must use tokens (no hardcoded colors).
- Clicking the button must perform standard navigation (it is an `<a>` element).

### Testing Scenarios

#### Scenario: Active State Styling
```gherkin
Given a TrayButton with active="true"
Then it should possess the .active class
And have a visual surface contrast distinct from idle buttons
```
- **Vitest Unit Test:** `packages/cyan/src/components/TrayButton.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/tray-button.spec.ts`

#### Scenario: Icon Slot Prioritization
```gherkin
Given a TrayButton with an icon prop "fox" 
And content provided in the <slot name="icon"> (e.g. a custom SVG or <div>)
Then the slotted content should be displayed
And the default CnIcon for "fox" should NOT be rendered in the slot area
```
- **Vitest Unit Test:** `packages/cyan/src/components/TrayButton.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/tray-button.spec.ts`

#### Scenario: Rail Mode Label Hiding
```gherkin
Given a TrayButton within a collapsed Tray rail viewport (e.g. 780px collapsed)
Then the .cn-tray-button__label must have 'display: none' or equivalent
And the icon must be centered within the 80px rail
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/tray-button-layout.spec.ts`
