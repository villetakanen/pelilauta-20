# Feature: Tray

> Reversed from:
> - https://github.com/villetakanen/cyan-design-system-4/blob/main/packages/cyan-lit/src/cn-tray-button
> - https://github.com/villetakanen/cyan-design-system-4/blob/main/packages/cyan-css/src/core/tray.css

## Blueprint

### Context

The tray is a navigation sidebar that slides in and out of view. It contains a toggle button (the "tray button") as an internal child. The tray owns its open/closed state, persistence, and responsive behavior. The button is purely a visual toggle affordance — it has no independent public API.

### Architecture

In cyan 4, the tray was split across two packages: a global CSS file (`tray.css` in `cyan-css`) for layout/animation, and a standalone Lit element (`cn-tray-button`) for the toggle. The CSS tray relied on `body:has(cn-tray-button[aria-expanded="false"])` to detect state — a clever hack that coupled global styles to a specific custom element's attribute.

In v20, both are unified into a single **Astro component** that owns its markup, styles, state, and toggle button.

- **Components:**
  - `Tray.astro` — the sidebar container that embeds a `TrayButton` and owns state/persistence
  - `TrayButton.astro` — the hamburger/X toggle. Exported as a standalone component for docs/demo use, but semantically always used inside `Tray` in production
- **Data Models:** `expanded: boolean` (controlled by the consuming app)
- **API Contracts:**
  - **Props:** `expanded?: boolean` (default `false`)
  - **Slots:** Default slot for tray content (nav links, etc.)
  - **Attributes (reflected):** `aria-expanded` on the tray root
- **Dependencies:**
  - Consumes design tokens for viewport mode breakpoints
  - Consumes CSS custom properties: `--cn-navigation-button-size`, `--cn-navigation-icon-size`, `--cn-grid`, `--cn-gap`, `--cn-width-tray`, `--cn-width-rail`, `--cn-app-bar-height`, `--cn-border-radius-medium`, `--cn-font-size-h4`, `--cn-line-height-h4`, `--cn-font-size-text`, `--cn-text-line-height`, `--cn-line`, `--cn-z-tray`, `--color-text`, `--color-link`, `--color-elevation-1`, `--color-border`, `--color-shadow`, `--color-hover`, `--background-button-text`, `--background-button-text-hover`, `--background-button`

### Tray Button (`TrayButton.astro`)

A self-contained Astro component exported from the DS package. It renders a circular button with a hamburger icon that animates into an X when expanded.

- **Position:** `fixed`, top-left corner of the viewport. `z-index: var(--cn-z-tray-button)` — always above tray and rail. Always visible regardless of tray state, scroll position, or other layout
- Circular shape (`border-radius: 50%`) sized by `--cn-navigation-button-size`
- Two pseudo-element bars animate between hamburger and X via CSS `transform: rotate()`
- Hover/active background states via `::before` pseudo
- Focus ring: `2px solid var(--color-link)` with `outline-offset: 2px`
- **Props:** `expanded?: boolean` (default `false`), `label?: string` (default `"Menu"`)
- **Behavior:** Toggles its own `expanded` visual state on click and dispatches a `click` event. Does not manage persistence or side effects — that's the parent's job
- **Standalone usage:** When used outside a `Tray`, it toggles visually and reflects `aria-expanded`, but controls nothing. This is the intended mode for docs/demo pages to showcase states (idle, hover, focus, expanded, collapsed) and the animation transition

### Tray Container

Styles are **mobile-first**. The base styles define the mobile layout; wide viewport adjustments are added via `@media` (or container query with breakpoint token).

#### Mobile (base)

- `position: fixed`, `top: 0`, `left: 0`, full height (`100dvh`)
- Width: `95cqw` of the app container
- `z-index: var(--cn-z-tray, 3000)` — always on top of content
- When collapsed: `transform: translateX(-100%)` (fully off-screen to the left)
- When expanded: `transform: translateX(0)` (slides into view from the left)
- Slide transition: `transform 0.11s ease-in-out`
- Scrollable vertically (`overflow-y: auto`), no horizontal scroll
- Background: `--color-elevation-1`
- Box shadow when expanded: `var(--color-shadow) 0px 0px var(--cn-line)`

#### Wide viewports (breakpoint token)

- Fixed-width (`--cn-width-tray`), anchored to the left below the app bar
- Top offset: `var(--cn-app-bar-height)`
- Height: `calc(100dvh - var(--cn-app-bar-height))`
- Padding-left: `var(--cn-width-rail)` (space for a persistent icon rail)
- Top-right border radius: `var(--cn-border-radius-medium)`
- No box shadow

**Content styling:** Headings inside the tray are normalized to h4 size with a bottom border. Nav links render as flex rows with icon+label, hover background, and double-line height.

### Responsive Logic

- Styles are mobile-first; wide mode is a progressive enhancement via breakpoint design token
- The `expanded` prop controls visibility at all viewport sizes — the app decides when to expand/collapse

### State Persistence

State persistence is **not a DS concern**. The tray component is stateless — it renders whatever `expanded` value the consuming app passes in. The app decides whether and how to persist the preference (localStorage, store, cookie, etc.).

In cyan 4, persistence was baked into the button component. This is removed in v20.

### Migration Notes

- Original was split: global CSS (`tray.css`) + standalone Lit element (`cn-tray-button`). In v20, unified into a single `Tray.astro` component with scoped styles and an inline `<script>` for client-side state
- The `body:has(cn-tray-button[aria-expanded])` pattern is eliminated — the Astro component manages its own DOM directly
- `aria-controls` is no longer needed — the button is inside the element it controls
- Original `checkInitialMenuState` had a `this`-binding bug on `resize` listener — moot in Astro with direct DOM scripting
- Breakpoint consumed from design token, not hardcoded (`621px` for container, `960px` for button state)
- Original uses `nav#tray` ID selector — v20 should use scoped class selectors within the Astro component
- Original mobile tray slid in from the right; v20 slides from the left (mobile-first, consistent direction)
- Original mobile width was `100dvw - gap`; v20 uses `95cqw` (container query width)

### Anti-Patterns

- Do not use `TrayButton` outside of `Tray` in production — standalone usage is for docs/demo only
- Do not use `body:has()` selectors to couple global CSS to component state — keep state management inside the component
- Do not bake persistence into the DS component — the app owns state lifecycle
- Do not use string-typed booleans for internal state — use real booleans, serialize only at the attribute boundary
- Do not hardcode a breakpoint — consume viewport mode from a design token
- Do not use ID selectors (`#tray`) — use scoped styles within the Astro component

## Contract

### Definition of Done

- [ ] Tray renders as a fixed sidebar container with slotted content
- [ ] Tray button is fixed to the top-left corner, always visible
- [ ] Toggle button is keyboard accessible (focusable, Enter/Space to activate)
- [ ] Focus ring visible on keyboard focus
- [ ] Mobile: tray is 95cqw, slides from the left, overlays content
- [ ] `aria-expanded` on the tray reflects the current state
- [ ] Renders expanded or collapsed based on `expanded` prop
- [ ] Does not manage persistence — that is the consuming app's responsibility
- [ ] Tray button is demoable standalone in docs (visual states only)

### Regression Guardrails

- `aria-expanded` must always reflect the `expanded` prop
- Animation must not cause layout shift outside the tray
- The tray must never read or write localStorage or any persistence mechanism

### Scenarios

```gherkin
Scenario: Default render
  Given a tray is placed in the DOM
  When the component mounts
  Then the tray is collapsed
  And the toggle button displays a hamburger icon

Scenario: Toggle open
  Given the tray is collapsed
  When the user clicks the toggle button
  Then the tray expands
  And the button icon animates to an X
  And aria-expanded becomes "true"

Scenario: Toggle closed
  Given the tray is expanded
  When the user clicks the toggle button
  Then the tray collapses
  And the button icon animates to a hamburger
  And aria-expanded becomes "false"

Scenario: App controls expanded state
  Given the app passes expanded=true
  When the tray renders
  Then the tray is expanded
  And aria-expanded is "true"

Scenario: App collapses tray
  Given the app changes expanded from true to false
  When the tray re-renders
  Then the tray collapses with animation

Scenario: Demo button standalone (docs only)
  Given the tray button is rendered without a parent tray
  When the user interacts with it
  Then it toggles between hamburger and X visually
  And it reflects aria-expanded state
```
