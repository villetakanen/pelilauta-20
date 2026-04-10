---
feature: Front Page
parent_spec: ../spec.md
---

# Feature: Front Page

## Blueprint

### Context

The front page is the landing surface for Pelilauta — it orients visitors and returning users by surfacing recent community activity. This v20 spec defines the **minimum viable front page** needed to scaffold the app shell, routing, and content-grid integration. It intentionally defers rich features (syndication, FABs, background posters) from v17 to later iterations.

### Architecture

- **Page:** `app/pelilauta/src/pages/index.astro` — Astro page using `AppShell` in `view` layout
- **Layout grid:** `cn-content-golden` from `packages/cyan/src/layouts/content-grid.css` — primary column for thread stream, secondary for sidebar content
- **Components used:**
  - `AppShell` (`packages/cyan/src/layouts/AppShell.astro`) — page shell with AppBar
  - `CnCard` (`packages/cyan/src/components/CnCard.svelte`) — thread preview cards
- **Data:** Static placeholder content for now; designed so thread data can later be fetched server-side in the Astro frontmatter and mapped to `CnCard` props

#### Sections

| Section | Grid position | Content | Priority |
|---|---|---|---|
| Thread stream | Primary (golden major) | List of `CnCard` components representing recent discussion threads | P0 |
| Welcome / hero | Primary (above stream) | Heading + one-line description of the platform | P0 |
| Tag sidebar | Secondary (golden minor) | Static list of featured RPG system tags (links) | P1 |

### Dependencies

- `packages/cyan` — AppShell, CnCard, content-grid, tokens
- Future: Firebase/data layer for live thread data (out of scope for this spec)

### Anti-Patterns

- Do not add client-side JavaScript for initial render — the front page must be fully SSR, zero-JS by default
- Do not import v17 components or patterns directly — build on the v20 DS primitives
- Do not hardcode inline styles for layout — use `cn-content-golden` grid classes
- Do not add i18n/l10n plumbing yet — English placeholder strings are fine for scaffolding

## Contract

### Definition of Done

- [ ] `index.astro` renders inside `AppShell` with `layout="view"`
- [ ] Page uses `cn-content-golden` grid with a primary thread stream and a secondary tag sidebar
- [ ] Thread stream displays at least 3 placeholder `CnCard` components with title, description, and href
- [ ] Tag sidebar displays a heading and at least 4 tag links (plain `<a>` elements styled as chips/pills)
- [ ] Page passes `pnpm check` with no errors
- [ ] Page renders correctly at mobile (<640px) and desktop (>960px) widths

### Regression Guardrails

- Front page must load with zero client-side JavaScript (no `client:` directives)
- All layout must use `--cn-*` tokens only — no `--cyan-*` or `--color-*`
- `AppShell` title prop must be set to "Pelilauta"

### Testing Scenarios

#### Scenario: Front page renders thread stream

```gherkin
Given the user navigates to "/"
When the page loads
Then at least 3 thread cards are visible
And each card has a title and description
```

- **Playwright E2E Test:** `app/pelilauta/e2e/front-page.spec.ts`

#### Scenario: Front page renders tag sidebar on desktop

```gherkin
Given the user navigates to "/" on a desktop viewport
When the page loads
Then a sidebar section with RPG system tags is visible
And each tag is a link
```

- **Playwright E2E Test:** `app/pelilauta/e2e/front-page.spec.ts`

#### Scenario: Front page is fully SSR with no client JS

```gherkin
Given the front page source is built
When inspecting the output HTML
Then no <script> tags with client-side hydration are present
```

- **Vitest Unit Test:** (not applicable — verified by E2E and build output inspection)
- **Playwright E2E Test:** `app/pelilauta/e2e/front-page.spec.ts`
