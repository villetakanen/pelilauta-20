---
feature: DocsTray
parent_spec: ../spec.md
---

# Component: DocsTray

## Blueprint

### Context

`DocsTray` is the **cyan-ds documentation site's navigation chrome**. It is a site-wide primitive, not a Book-layout concern: every page in `app/cyan-ds` (Book-rendered content collections, the index page, any future about/search/landing page) renders the same navigation, so that navigation lives in exactly one place and is dropped into any layout's `tray` slot with a one-liner.

Previously this logic was inlined inside `Book.astro`, which coupled navigation rendering to the documentation layout and made it impossible for non-book pages to share the navigation without copy-paste.

### Architecture

- **Component:** `app/cyan-ds/src/components/DocsTray.astro` (Astro, SSR-only).
- **Not part of `packages/cyan`.** DocsTray is specific to the cyan-ds site's five content collections (`principles`, `styles`, `core`, `components`, `addons`) — it is not a reusable DS primitive.
- **Renders with:**
  - `TrayButton.astro` (intro + group entry points)
  - `TrayLinkGroup.astro` + `TrayLink.astro` (per-entry links)
- **Data sources:**
  - `astro:content.getCollection('principles' | 'styles' | 'core' | 'components' | 'addons')`
  - `Astro.url.pathname` for active-state derivation (DocsTray reads this itself — consumers do NOT forward pathname props).

### Navigation Model

The tray groups are fixed and ordered:

1. **Principles** (icon: `palette`) — `/principles/<slug>`
2. **Styles** (icon: `font`) — `/styles/<slug>`
3. **Core** (icon: `css`) — `/core/<slug>` — atomic CSS targeting raw HTML elements (`<button>`, `<hr>`, …).
4. **Components** (icon: `components`) — `/components/<slug>`
5. **Addons** (icon: `add`) — `/addons/<slug>`

Plus an **Intro** button (icon: `design`) at the top pointing to `/`.

Within each group, entries are sorted by `order` (ascending, unordered entries last), with alphabetical fallback by `title`. Groups with zero entries are omitted from the tray.

A group's `TrayButton` links to the first entry in that group (to provide a stable landing page when the group label is clicked directly).

### Active State

- The Intro button is active when `Astro.url.pathname === "/"`.
- A group's `TrayButton` is active when `Astro.url.pathname` starts with `/<group-id>`.
- A `TrayLink` is active when `Astro.url.pathname === /<group-id>/<entry-slug>`.

### Dependencies

- `packages/cyan/src/components/TrayButton.astro`
- `packages/cyan/src/components/TrayLinkGroup.astro`
- `packages/cyan/src/components/TrayLink.astro`
- `astro:content` content collections defined in `app/cyan-ds/src/content/config.ts`

### Anti-Patterns

- **No Hardcoded Navigation Entries.** All per-entry links must derive from `getCollection`. Do not manually list documentation entries inside `DocsTray`.
- **No Duplication.** No page or layout in `app/cyan-ds/src/` may reimplement the tray markup. Every consumer renders `DocsTray` via `<DocsTray slot="tray" />` — nothing else.
- **No Prop Forwarding for Active State.** DocsTray MUST read `Astro.url.pathname` itself. Consumers do not pass a `currentPath` or similar prop.
- **No Styling.** DocsTray owns structure only; all visual styling comes from `TrayButton` / `TrayLink` / `TrayLinkGroup` in `packages/cyan`.
- **Not in the DS package.** DocsTray encodes the five-collection taxonomy of the docs site. It is not a generic DS primitive and must not be moved to `packages/cyan`.

## Contract

### Definition of Done

- [ ] `app/cyan-ds/src/components/DocsTray.astro` exists and renders the tray markup previously inlined in `Book.astro`.
- [ ] DocsTray is rendered exactly once per page, in the `tray` slot of the page's layout.
- [ ] `Book.astro` no longer contains collection fetches, group definitions, or tray markup.
- [ ] `app/cyan-ds/src/pages/index.astro` renders DocsTray in its tray slot (once index switches to `Page`).
- [ ] The four groups render in the mandatory order: Principles → Styles → Components → Addons.
- [ ] Within each group, ordered entries precede unordered; unordered entries sort alphabetically by `title`.
- [ ] Empty groups are omitted from the rendered tray.
- [ ] Active-state highlights derive from `Astro.url.pathname` inside DocsTray.

### Regression Guardrails

- Adding a new content collection must require a change in `DocsTray` (not in every consumer).
- No page or layout in `app/cyan-ds/src/` may render any `<TrayButton>` or `<TrayLink>` directly — they must go through `DocsTray`.
- `Book.astro` must not re-introduce `getCollection` calls for navigation purposes.

### Testing Scenarios

#### Scenario: DocsTray renders the four groups in order

```gherkin
Given the cyan-ds site is running
When a user visits any page that renders DocsTray
Then the tray contains buttons for Principles, Styles, Components, and Addons in that order
  And each non-empty group contains its entries sorted by order then title
```

- **Playwright E2E Test:** `app/cyan-ds/e2e/ds.spec.ts`

#### Scenario: Active-state reflects the current path

```gherkin
Given a user visits /principles/chroma
When the page renders DocsTray
Then the "Principles" group button is marked active
  And the "Chroma" TrayLink is marked active
  And the Intro button is NOT active
```

- **Playwright E2E Test:** `app/cyan-ds/e2e/ds.spec.ts`

#### Scenario: Tray is not duplicated across layouts

```gherkin
Given both Book-layout pages and non-Book pages render DocsTray
When the rendered HTML is inspected
Then exactly one TrayButton labelled "Intro" is present per page
```

- **Playwright E2E Test:** `app/cyan-ds/e2e/ds.spec.ts`
