---
feature: DocsThemeToggle
parent_spec: ../spec.md
---

# Component: DocsThemeToggle

## Blueprint

### Context

`DocsThemeToggle` is a docs-site-only helper button that flips the
document's `color-scheme` between `light` and `dark` on click. It
exists to let reviewers sanity-check DS components in both themes
without toggling their OS-level preference mid-session.

Not a DS primitive. The component lives in `app/cyan-ds/` alongside
`DocsTray` — both are consumed by `Book.astro` to stage the
documentation site. Consumer apps (pelilauta, future sub-apps) must
not import it; production theme switching is the host app's concern,
not a DS affordance.

### Architecture

- **Component:** `app/cyan-ds/src/components/DocsThemeToggle.astro` (Astro, SSR-rendered shell + tiny client-side `<script>` for the click handler).
- **Not part of `packages/cyan`.** Keep it in the docs-site app.
- **Mount point:** `app/cyan-ds/src/layouts/Book.astro` renders `<DocsThemeToggle slot="actions" />` inside `<Page>`. The slot pipeline forwards it to `AppShell`'s actions slot, which in turn populates `AppBar`'s trailing-actions area. All documentation pages get the toggle automatically.
- **Markup:** a single raw `<button type="button" class="cn-ds-theme-toggle" aria-label="Toggle light and dark theme">` containing a `<span class="cn-icon">` wrapping an inline moon `<svg>`. The `.cn-icon` wrapper opts the button into the circular-pill + forced-small-size treatment already defined in `packages/cyan/src/core/buttons.css` (the `:has(.cn-icon:only-child)` selector).
- **State transitions:** click handler reads the current effective scheme in this order:
  1. `html.style.colorScheme` if previously set by the user this session.
  2. Otherwise, `matchMedia('(prefers-color-scheme: dark)')` to infer the OS default.
  The handler then writes the opposite value (`"light"` or `"dark"`) to `html.style.colorScheme`.
- **Scope of effect:** writing to `<html>` (document root) is deliberate. The root `color-scheme` drives both:
  - DS `light-dark()` token resolution across the entire document.
  - Browser chrome (scrollbars, native form controls, `<meta name="color-scheme">` interpretation).
  Writing to `<body>` alone would leave chrome at the OS default, producing a visible seam between content and native UI.

### Constraints

- Client-side JavaScript is permitted here. This is an **explicit exception** to the "DS-level visuals must work without JS" rule in `CLAUDE.md` — toggling theme inherently requires client-side state, and the component is a docs-site helper, not a DS primitive. Production consumer apps that need theme switching implement it via their own mechanism (cookie + SSR + user prefs).
- No persistence. The toggle state resets on page navigation. A deliberate simplicity choice for the docs site — session-scoped theme override is enough for design review.
- No framework. Vanilla DOM APIs only: `querySelectorAll`, `addEventListener`, `matchMedia`, `style.colorScheme`. No Svelte, no stores.
- Icon is inlined, not fetched via `CnIcon`. Adding a single theme-toggle glyph to `@pelilauta/icons` for one docs-helper would be scope creep. The inline `<svg>` is ~4 lines.
- The raw `<button>` picks up `core/buttons.css` automatically — no local button styling beyond the tiny flexbox alignment for the SVG inside `.cn-icon`.

## Contract

### Definition of Done

- [ ] `app/cyan-ds/src/components/DocsThemeToggle.astro` exists and renders a single `<button class="cn-ds-theme-toggle">` with a moon `<svg>` inside a `.cn-icon` span.
- [ ] `Book.astro` imports the component and renders `<DocsThemeToggle slot="actions" />` inside `<Page>` so every docs page shows the toggle in the AppBar actions area.
- [ ] Clicking the button flips `document.documentElement.style.colorScheme` between `"light"` and `"dark"`.
- [ ] On first click after a fresh page load, the new scheme is the OPPOSITE of the OS preference (verified via `matchMedia('(prefers-color-scheme: dark)')`).
- [ ] The button is styled by `core/buttons.css` (circular pill, forced-small icon) — not by a local stylesheet.
- [ ] The component does NOT use `localStorage`, `sessionStorage`, cookies, or any persistence mechanism.
- [ ] The component does NOT import from `@cyan/components` or any DS component module.

### Regression Guardrails

- **`color-scheme` goes on `<html>`.** Writing to `<body>` alone leaves browser chrome at the OS default and causes a content/chrome seam. If the handler ever switches to `<body>`, the seam is a visible regression.
- **No persistence creep.** Saving the toggle state across navigation turns a docs helper into a production feature. If that's ever needed, it belongs in a consumer-app theme-preferences system, not here.
- **Docs-site only.** The component path is `app/cyan-ds/src/components/` on purpose — moving it into `packages/cyan` would make it a DS API surface that consumer apps could rely on. That's exactly the design the host-owns-theme-switching rule prohibits.

### Testing Scenarios

#### Scenario: Toggle flips html color-scheme on click

```gherkin
Given a Book-layout page is rendered with `prefers-color-scheme: dark`
  at the OS level
And the user has not previously clicked the theme toggle
When the user clicks `.cn-ds-theme-toggle`
Then `document.documentElement.style.colorScheme` becomes `"light"`
And subsequent clicks alternate between `"light"` and `"dark"`
```

- **Playwright E2E Test:** `app/cyan-ds/e2e/components/docs-theme-toggle.spec.ts`

#### Scenario: Toggle does not persist across navigation

```gherkin
Given the user has clicked the toggle once on `/principles/intro`
When the user navigates to `/components/cn-card`
Then `document.documentElement.style.colorScheme` is NOT set
  (an empty string), and the page renders the OS-preferred theme
```

- **Playwright E2E Test:** `app/cyan-ds/e2e/components/docs-theme-toggle.spec.ts`
