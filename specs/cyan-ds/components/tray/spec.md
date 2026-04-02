# Feature: Tray

> Inspired by: https://github.com/villetakanen/free-fall/blob/main/packages/design-system/src/components/AppTray.astro

## Blueprint

### Context
The tray is the primary navigation sidebar for the application. It adapts to different viewports, functioning as a hidden drawer on mobile, an icon rail with a modal drawer on tablet, and a push-content rail/sidebar on desktop. It supports hierarchical navigation via sub-menus.

### Architecture
- **Components:**
  - `Tray.astro` — The root layout container that owns state toggle (`:has()`), the drawer slide animation, and scrim.
  - `HamburgerButton.astro` — The toggle button, included within the tray.
  - `TrayButton.astro` — A primary navigation item with an icon and label. Displays only the icon in rail mode.
  - `TrayLinkGroup.astro` — A container for sub-navigation items.
  - `TrayLink.astro` — A secondary navigation item used within groups.
  - (All components strictly `.astro` using CSS for interactions where possible, plus light client `<script>` for keyboard accessibility).
- **Data Models:** No strict data models. Driven by markup (`slots` / nested structure) or basic props.
- **API Contracts:**
  - `Tray`: Manages the `<input type="checkbox" id="cn-tray-toggle">` or similar CSS-only state.
  - `TrayButton`: Props `href`, `icon`, `label`, `active`.
  - `TrayLink`: Props `href`, `label`, `active`.
- **Dependencies:**
  - Consumes `--cn-*` tokens for widths (tray and rail), spacing, and typography.
  - `--cn-z-*` tokens for tray surface and scrim layers.

### Layout & Responsive Modes
The Tray layout scales across three distinct modes:

1. **Mobile (`< 621px`)**
   - **Collapsed:** Hidden completely (width: 0).
   - **Expanded:** Modal drawer sliding in over content. Clickable scrim element displayed.

2. **Medium / Tablet (`>= 621px` and `< 780px`)**
   - **Collapsed:** Visible as a narrow Icon Rail.
   - **Expanded:** Modal drawer sliding out from the rail (`position: absolute`), overlaying content with a clickable scrim.

3. **Tabletop / Large (`>= 780px`)**
   - **Collapsed:** Visible as a narrow Icon Rail.
   - **Expanded:** Push drawer (`position: relative`), which pushes the application's main content wrapper rather than overlaying it. No scrim displayed.

### Navigation Hierarchy
- Primary routes use `TrayButton`.
- When sub-routes exist, they are placed in `TrayLinkGroup` containing `TrayLink` items.
- In rail mode, the sub-menus are either hidden or styled elegantly; when expanded, the groups reveal the hierarchical links.

### Book Page
A living book page is required to demo these components.
- **Target path:** `app/cyan-ds/src/pages/components/tray.mdx`
- **Format:** MDX using Book layout (`app/cyan-ds/src/layouts/Book.astro`)
- **Structure:**
  1. **Overview** — What the tray is, its layout modes (Mobile, Medium/Tablet, Tabletop/Large).
  2. **TrayButton Demo** — Standalone `TrayButton` rendered in isolation, showing idle, hover, and focus states.
  3. **Tray Sub-menus Demo** — Usage of `TrayLinkGroup` and `TrayLink`.
  4. **Tray Layout Demo** — Embedded tray with sample hierarchical content showing layout responsiveness within a container.
  5. **Props table** — Documents props for all tray components.
  6. **Integration / Accessibility** — Guidance on CSS-driven focus trapping and `aria-expanded` behavior.

### Anti-Patterns
- **JS-Driven Layout:** Do not use JavaScript resize event listeners to control drawer width or position. Always use CSS Media Queries and `:has()` selectors driven by the toggle state.
- **Persisting State in DS Component:** The presentation component should not directly read/write `localStorage`.
- **Using deprecated tokens:** `var(--cyan-*)` and `var(--color-*)` are deprecated. Use only `var(--cn-*)` tokens.
- **Book Persistence:** Demos toggle state in-page; they must not touch `localStorage` or app-level orchestration stores.
- **Hardcoding values:** Demos must use `var(--cn-*)` tokens, no hardcoded z-index or sizing values.

## Contract

### Definition of Done
- [ ] `Tray.astro` implements the 3 adaptive modes (hidden vs rail, modal vs push) purely with CSS.
- [ ] Scrim is properly toggled for Mobile and Medium modes, hidden on Large.
- [ ] `TrayButton`, `TrayLinkGroup`, and `TrayLink` components exist and allow nesting sub-menus.
- [ ] Keyboard accessibility: `Escape` closes the tray, `Tab` is trapped when acting as a modal overlay (Mobile/Medium).
- [ ] Book page exists at `app/cyan-ds/src/pages/components/tray.mdx` using Book layout.
- [ ] Tray and sub-menu components are demoed in isolation and together on the book page.
- [ ] Props tables for Tray, TrayButton, TrayLinkGroup, TrayLink exist in the book.

### Regression Guardrails
- CSS `:has()` for the checked toggle must remain structurally coupled without breaking standard rendering.
- Expanded drawer on Large viewport must not visually obscure the main content area (must push content).
- Demos must not read or write localStorage and all demo styling must use `var()` token references.

### Testing Scenarios
All features with behavioral contracts must have corresponding automated tests mapped to their Gherkin scenarios.

#### Scenario: Mobile Modal Toggling
```gherkin
Given a mobile viewport
When the tray toggle is activated
Then the tray expands as a modal overlay
And a clickable scrim is displayed
```
- **Vitest Unit Test:** `packages/cyan/src/components/tray.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/tray-mobile.spec.ts`

#### Scenario: Medium Rail to Modal
```gherkin
Given a medium viewport
When the tray is initially rendered
Then it displays as an icon rail
When the toggle is activated
Then it expands into a modal overlay with a scrim
```
- **Vitest Unit Test:** `packages/cyan/src/components/tray.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/tray-tablet.spec.ts`

#### Scenario: Large Rail to Push Drawer
```gherkin
Given a large viewport
When the toggle is activated
Then it expands into a push drawer, widening its inline size
And no scrim is rendered or visible
```
- **Vitest Unit Test:** `packages/cyan/src/components/tray.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/tray-desktop.spec.ts`

#### Scenario: Sub-menu Rendering
```gherkin
Given a Tray with a TrayButton and TrayLinkGroup
When the tray is collapsed
Then only the primary TrayButton icon is visible
When the tray is expanded
Then both the primary label and the TrayLink items become visible
```
- **Vitest Unit Test:** `packages/cyan/src/components/tray-navigation.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/tray-navigation.spec.ts`
