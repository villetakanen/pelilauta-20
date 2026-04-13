---
feature: Page Layout
parent_spec: ../../spec.md
---

# Layout: Page

## Blueprint

### Context

`Page` is the standard layout for **non-documentation application pages** — landing pages, about pages, dashboards, any structural page that is not part of the documentation content collections. It composes on top of `AppShell` and provides a consistent, minimal page surface that apps (both `app/pelilauta` and `app/cyan-ds`) can adopt without re-deriving shell conventions per page.

Historically pages reached directly into `AppShell`, causing each app to reinvent boilerplate (and in some cases to hand-roll layout CSS, which violates the "apps never override the DS" rule). `Page` gives those pages a single, spec-anchored surface.

### Architecture

- **Component:** `packages/cyan/src/layouts/Page.astro` (Astro, SSR-only — structural shell).
- **Composes on:** `AppShell` (`packages/cyan/src/layouts/AppShell.astro`). `Page` forwards shell-level props verbatim.
- **Relationship to `Book`:** `Book` (cyan-ds-specific, documentation layout) composes on top of `Page`, adding H1 ownership, optional article wrapping, and documentation-specific behaviors. A page is NOT a book; a book IS a specialized page.
- **Dependencies:**
  - `packages/cyan/src/layouts/AppShell.astro`
  - Content grid utilities (`packages/cyan/src/layouts/content-grid.css`) already loaded by AppShell.

### Properties

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | `string` | Yes | — | Forwarded to `AppShell.title` (document `<title>`). |
| `appTitle` | `string` | No | `title` | Forwarded to `AppShell.appTitle` (AppBar title). |
| `shortTitle` | `string` | No | — | Forwarded to `AppShell.shortTitle`. |
| `layout` | `"view" \| "sidebar" \| "editor" \| "modal"` | No | `"sidebar"` | Forwarded to `AppShell.layout`. Page defaults to `"sidebar"` because the common app-page case expects a tray. |
| `trayLabel` | `string` | No | `"Menu"` | Forwarded to `AppShell.trayLabel`. |
| `backHref` | `string` | No | `"/"` | Forwarded to `AppShell.backHref`. |

### Slots

| Name | Purpose |
|---|---|
| `tray` | Forwarded to `AppShell`'s `tray` slot. Apps populate with their site-specific navigation component (e.g. `DocsTray` in cyan-ds). |
| *(default)* | Rendered as the direct content of `<main class="cn-app-main">`. The page author is responsible for its own content-grid shells (`.cn-content-prose`, `.cn-content-golden`, `.cn-content-triad`). |

### Anti-Patterns

- **Page MUST NOT own the H1.** Unlike `Book`, `Page` does not take a `description` or render a page header. Page authors write their own heading(s) inside the default slot if they need one. This keeps `Page` neutral — a page may have zero headings, one heading, or many depending on its purpose.
- **Page MUST NOT wrap the default slot in a `<article max-width>` cage.** The default slot is placed directly inside `.cn-app-main`. The author picks which content-grid class applies (prose, golden, triad) on a per-section basis.
- **Apps MUST NOT reach directly into `AppShell` from a page file.** Compose through `Page` unless the page specifically needs `layout="editor"` or `layout="modal"` chrome semantics that `Page`'s defaults don't serve — and in that case, pass the `layout` prop to `Page` rather than skipping it.
- **Page MUST NOT add `<style>` blocks.** It is a pure structural composition. Any styling concern belongs to the DS (`packages/cyan`), not to the layout.

## Contract

### Definition of Done

- [ ] `packages/cyan/src/layouts/Page.astro` exists and forwards all shell props to `AppShell`.
- [ ] Page exposes a `tray` named slot and a default slot.
- [ ] Page renders zero additional wrapper markup around the default slot (no `<article>`, no `<div>`, no `<section>`).
- [ ] Page does not render any H1, page header, or description block.
- [ ] `app/pelilauta/src/pages/index.astro` composes on `Page` (not `AppShell` directly).
- [ ] `@cyan/layouts/Page.astro` is exported and importable by downstream apps.

### Regression Guardrails

- Page's default slot must always be a direct child of `.cn-app-main`. Any intermediate wrapper would defeat the content-grid contract (`.cn-app-main > section`, `.cn-app-main > article`).
- Forwarded AppShell props must preserve `AppShell`'s defaults exactly; Page is a pass-through, not an overrider.
- Page defaults `layout` to `"sidebar"` but MUST accept and forward any valid `AppShell` layout value.

### Testing Scenarios

#### Scenario: Page composes on AppShell and exposes tray slot

```gherkin
Given a page that uses the Page layout with a tray slot
When the page is rendered
Then AppShell is instantiated
  And the tray slot content appears inside AppShell's tray region
  And the default slot content appears as a direct child of <main class="cn-app-main">
```

- **Vitest Unit Test:** `packages/cyan/src/layouts/page.test.ts`
- **Playwright E2E Test:** covered indirectly by `app/pelilauta/e2e/front-page.spec.ts` (front page uses Page)

#### Scenario: Page does not wrap content in an article or own an H1

```gherkin
Given a page that uses the Page layout with no explicit H1 in its default slot
When the page is rendered
Then no H1 element is present from the layout itself
  And no <article> wrapper with a max-width constraint is introduced by the layout
```

- **Vitest Unit Test:** `packages/cyan/src/layouts/page.test.ts`

#### Scenario: Page forwards layout prop to AppShell

```gherkin
Given a page that passes layout="view" to Page
When the page is rendered
Then AppShell receives layout="view"
```

- **Vitest Unit Test:** `packages/cyan/src/layouts/page.test.ts`
