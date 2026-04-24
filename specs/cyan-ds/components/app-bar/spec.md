# Feature: App Bar

## Blueprint

### Context
The App Bar is a structural component that provides top-level navigation, context (noun icon), titles, and actions. The title represents the current "App" or "Chapter" context (e.g., "Mekanismi" or "Cyan Design System") and is rendered as an `<h3>` by default — page content is expected to own the page's single `<h1>`. When a page does not render its own `<h1>` (for example, a chrome-driven landing page whose identity is carried entirely by the AppBar), pass `asPageHeading={true}` to elevate the AppBar title's tag from `<h3>` to `<h1>`. The visual styling of the title is unchanged by this prop — it is an accessibility / document-outline affordance only, so the page retains exactly one `<h1>` without a visual regression. It supports various layout modes (e.g., sticky and modal) and includes responsive title rendering for different viewport sizes.

### Elevation
- **Default:** Elevation 0.
- **Modal Mode:** Elevation 2.

### Architecture
- **Components:** `packages/cyan/src/components/app-bar/AppBar.astro` (Strictly Astro. Scroll animations must be handled via CSS `animation-timeline` or similar modern CSS features to avoid JS overhead).
- **Data Models:** `AppBarProps` interface including `title`, `shortTitle`, `noun`, `mode`, `backHref`, and `asPageHeading`.
- **API Contracts:**
  - **Props:** `noun?: string`, `title: string`, `shortTitle?: string`, `mode?: 'sticky' | 'modal' | ''`, `backHref?: string` (defaults to `/` in modal mode), `asPageHeading?: boolean` (defaults to `false` — when `true`, the title renders as `<h1>` instead of `<h3>` so the AppBar owns the page's top-level heading).
  - **Slots:** Default slot for trailing actions.
- **Dependencies:** 
  - `Icon` component (`cn-icon`).
  - Cyan DS tokens: `--cn-app-bar-*`, `--cn-font-*`, `--cn-color-*`, `--cn-grid`, plus semantic elevation tokens.

### Book Page
A living book page is required to demo this component.
- **Target path:** `app/cyan-ds/src/pages/components/app-bar.mdx`
- **Format:** MDX using Book layout (`app/cyan-ds/src/layouts/Book.astro`)
- **Structure:**
  1. **Overview** — What the app-bar is, its responsive title truncation, and modes.
  2. **Default App Bar Demo** — Standard app bar with title and actions.
  3. **Sticky Scroll Demo** — Embedded scrollable container to demonstrate sticky elevation CSS changes.
  4. **Modal Mode Demo** — Showing the modal mode with a back button.
  5. **Props table** — Documents props for `AppBar`.

### Anti-Patterns
- **Raw Global Event Listeners:** The original codebase bound `window.addEventListener('scroll')` per component instance using standard `setTimeout` throttling. In v20, this should ideally be solved via passive listeners, `IntersectionObserver`, or CSS `animation-timeline`.
- **Hardcoded Navigation logic:** In `modal` mode, the original component executed `window.history.back()` natively or redirected to `/`. This creates hidden router dependencies inside a dumb UI component. This should be decoupled: either accept an `href` prop for the back button, or emit an event for the consuming app to handle.

## Contract

### Regression Guardrails
- **No Client-side JS:** The component must remain functional and visually correct without any client-side JavaScript.
- **Back Button Availability:** In `modal` mode, the back button MUST render a valid `<a>` tag with `backHref` (defaulting to `/`).
- **Exactly one `<h1>` per page.** `asPageHeading` is an opt-in contract: a page sets `asPageHeading={true}` **iff** it does not render its own `<h1>` anywhere in the main content. Setting `asPageHeading={true}` while the page also renders a `<h1>` produces a document outline with two `<h1>` elements (accessibility regression); leaving `asPageHeading={false}` while the page has no other `<h1>` produces a document with zero `<h1>` elements. The prop exists to toggle between these, not to layer them.
- **Visual parity across heading levels.** Switching between `<h3>` and `<h1>` via `asPageHeading` MUST NOT change the title's rendered font-size, weight, or line-height. The component's scoped `.title` styles supply explicit typography tokens so the global heading-tag styles do not leak through.

### Testing Scenarios
All features with behavioral contracts must have corresponding automated tests mapped to their Gherkin scenarios.

#### Scenario: Responsive Title Display
```gherkin
Given an App Bar instantiated with `title` and `shortTitle`
When the viewport width falls below 620px
Then the `title` element is hidden
And the `shortTitle` element is displayed
```
- **Vitest Unit Test:** `packages/cyan/src/components/app-bar/app-bar.test.ts` (Testing HTML structure)
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/app-bar.spec.ts`

#### Scenario: Sticky Scroll State (CSS Driven)
```gherkin
Given an App Bar with `mode="sticky"`
When the page is scrolled
Then CSS scroll-driven animations apply elevation styles (shadow, background)
```
- **Vitest Unit Test:** N/A (CSS testing)
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/app-bar.spec.ts`

#### Scenario: Modal Navigation
```gherkin
Given an App Bar with `mode="modal"` and `backHref="/dashboard"`
Then a link to `/dashboard` is rendered with an "arrow-left" icon
```
- **Vitest Unit Test:** `packages/cyan/src/components/app-bar/app-bar.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/app-bar.spec.ts`

#### Scenario: Title heading level responds to asPageHeading
```gherkin
Given an App Bar rendered with `asPageHeading` unset (default)
Then the title is an `<h3>` element with `class="title"`

Given an App Bar rendered with `asPageHeading={true}`
Then the title is an `<h1>` element with `class="title"`
And the computed font-size, font-weight, and line-height equal the
  values produced by `asPageHeading={false}` on the same viewport
```
- **Vitest Unit Test:** `packages/cyan/src/components/app-bar/app-bar.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/app-bar.spec.ts`

#### Scenario: Sidebar Displacement (Mobile)
```gherkin
Given an App Bar rendered within a `layout-sidebar` parent
When the viewport width falls below 620px
Then the App Bar's leading padding is set to 8 x grid (64px)
To prevent overlap with the fixed Hamburger Button
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/app-bar.spec.ts`
