---
feature: Front Page
parent_spec: ../spec.md
---

# Feature: Front Page

## Blueprint

### Context

The front page is the landing surface for Pelilauta — it orients visitors and returning users by surfacing recent community activity across three information streams. This v20 spec defines the **minimum viable front page** needed to scaffold the app shell, routing, and content-grid integration. It intentionally defers rich data features (real syndication, FABs, background posters) from v17 to later iterations.

### Architecture

- **Page:** `app/pelilauta/src/pages/index.astro` — Astro page using the [`Page`](../../cyan-ds/layouts/page/spec.md) layout from `@cyan/layouts/Page.astro`. The page MUST NOT reach directly into `AppShell`.
- **Layout grid:** [`cn-content-triad`](../../cyan-ds/layouts/content-grids/spec.md) — one **medium** column (threads) and two **small** columns (blog-roll, latest sites). The page composes its content-grid shells itself inside `Page`'s default slot; it does not wrap them in any local container and contains no local CSS.
- **Components used:**
  - `Page` (`packages/cyan/src/layouts/Page.astro`) — standard non-book page shell with tray + content area
  - `CnCard` (`packages/cyan/src/components/CnCard.svelte`) — preview cards for all three streams
- **Data:** Static placeholder content for now; designed so each stream can later be fetched server-side in the Astro frontmatter and mapped to `CnCard` props.

#### Sections

| Section | Triad position | Content | Priority |
|---|---|---|---|
| Threads | Medium (primary) | List of `CnCard` components representing recent discussion threads | P0 |
| Blog-roll | Small (secondary) | List of `CnCard` components representing posts from syndicated sources | P1 |
| Latest sites | Small (tertiary) | List of `CnCard` components representing recently updated community sites | P1 |

### Dependencies

- `packages/cyan` — AppShell, CnCard, content-grid, tokens
- Future: Firebase/data layer for live thread data (out of scope for this spec)

### Anti-Patterns

- Do not add client-side JavaScript for initial render — the front page must be fully SSR, zero-JS by default
- Do not import v17 components or patterns directly — build on the v20 DS primitives
- Apps never override the DS: the page MUST NOT contain `<style>` blocks, inline `style=""`, or locally-defined classes that override, substitute for, or patch around DS behavior. Missing DS capability is a DS bug fixed in `packages/cyan`, not a page workaround.
- Do not reach directly into `AppShell` — compose through [`Page`](../../cyan-ds/layouts/page/spec.md).
- Do not add i18n/l10n plumbing yet — English placeholder strings are fine for scaffolding

## Contract

### Definition of Done

- [ ] `index.astro` composes on `Page` from `@cyan/layouts/Page.astro`
- [ ] Page uses `cn-content-triad` with three labelled regions: Threads (medium), Blog-roll (small), Latest sites (small)
- [ ] Threads region displays at least 3 placeholder `CnCard` components with title, description, and href
- [ ] Blog-roll region displays at least 3 placeholder `CnCard` components sourced from syndicated feeds (placeholder content for now)
- [ ] Latest sites region displays at least 3 placeholder `CnCard` components representing community sites
- [ ] Each region has a visible heading (`<h2>`) naming the region
- [ ] Page passes `pnpm check` with no errors
- [ ] Page renders correctly at mobile / narrow (triad collapses to a single stacked column per the content-grid contract) and desktop / wide (triad renders three columns side-by-side)
- [ ] `index.astro` contains no `<style>` block, no inline `style=""` attributes, and no locally-defined classes

### Regression Guardrails

- Front page must load with zero client-side JavaScript (no `client:` directives)
- Token references in the page are disallowed entirely (the page must not contain any CSS). Token discipline is enforced at the DS layer.
- `Page` `title` prop must be set to "Pelilauta"

### Testing Scenarios

#### Scenario: Front page renders all three triad regions

```gherkin
Given the user navigates to "/"
When the page loads
Then a region labelled "Threads" with at least 3 cards is visible
  And a region labelled "Blog-roll" with at least 3 cards is visible
  And a region labelled "Latest sites" with at least 3 cards is visible
```

- **Playwright E2E Test:** `app/pelilauta/e2e/front-page.spec.ts`

#### Scenario: Triad renders side-by-side on wide viewports

```gherkin
Given the user navigates to "/" on a desktop viewport that satisfies the triad wide-mode threshold
When the page loads
Then the three regions render side-by-side (Threads medium, Blog-roll small, Latest sites small)
```

- **Playwright E2E Test:** `app/pelilauta/e2e/front-page.spec.ts`

#### Scenario: Triad stacks on narrow viewports

```gherkin
Given the user navigates to "/" on a narrow viewport below the triad wide-mode threshold
When the page loads
Then the three regions stack vertically in a single column
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
