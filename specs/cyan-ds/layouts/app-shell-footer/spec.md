---
feature: App Shell Footer (DS Primitive)
status: draft
maturity: design
last_major_review: 2026-04-28
parent_spec: specs/cyan-ds/layouts/app-shell/spec.md
stylebook_url: TBD
---

# Feature: App Shell Footer (DS Primitive)

## Blueprint

### Context
The v17 footer implementation couples structural layout concerns with Pelilauta-specific content (community links, release-note version link, and active-user widget). For v20, footer behavior is split so AppShell owns a reusable footer region contract while application content is injected by host apps.

### Architecture
- **Components:** Provenance from v17 structural usage in `.tmp/pelilauta-17/src/layouts/Page.astro` and `.tmp/pelilauta-17/src/layouts/PageWithTray.astro`; source footer composition in `.tmp/pelilauta-17/src/components/server/app/AppFooter.astro`. v20 target primitive is a DS-owned footer region attached to `packages/cyan/src/layouts/AppShell.astro`.
- **Data Models:** Footer accepts host-provided content only (props/slots); no DS-owned locale strings.
- **API Contracts:** AppShell exposes footer slots for non-modal layouts: a primary footer-body slot (link columns and other host content) and an optional credits slot (equivalent to v17 `app-footer-credits`). When `layout="modal"`, AppShell omits the footer region entirely.
- **Dependencies:** DS shell + DS typography/grid tokens (`--cn-*`) only.
- **Constraints:** Footer remains SSR-safe and progressive with no client-side JS requirement for baseline rendering; DS footer never embeds domain links or app-specific API fetch behavior.

### Book Page
Footer is a structural shell contract, not an isolated visual primitive page in the style book.
- **Target path:** `app/cyan-ds/src/content/principles/layout-composition/app-shell-footer.mdx`
- **Structure:** Footer region contract, slot map, and host-composition examples.

## Contract

### Definition of Done
- [ ] AppShell exposes a documented footer region contract for host apps.
- [ ] Footer contract supports optional host-provided credits content.
- [ ] DS shell renders valid footer semantics without any host customization.
- [ ] AppShell omits footer output when `layout="modal"`.

### Regression Guardrails
- DS footer region MUST NOT hardcode Pelilauta strings, links, or release metadata.
- Host app footer content MUST be composable without inline style overrides in app pages.
- AppShell MUST render footer slots only in non-modal layouts.

### Testing Scenarios
All features with behavioral contracts must have corresponding automated tests mapped to their Gherkin scenarios.

#### Scenario: Shell omits footer in modal layout
```gherkin
Given AppShell renders with `layout="modal"`
When the layout is server-rendered
Then no footer region is rendered
And footer slot content is ignored for that render
```
- **Vitest Unit Test:** `packages/cyan/src/layouts/app-shell.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/app-shell.spec.ts`

#### Scenario: Non-modal layout renders footer body and credits slots
```gherkin
Given AppShell renders with a non-modal layout
And the host provides footer-body and credits slot content
When the page is server-rendered
Then a semantic footer region is present after main content
And footer-body slot content is rendered
And credits slot content is rendered
```
- **Vitest Unit Test:** `packages/cyan/src/layouts/app-shell.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/app-shell.spec.ts`

#### Scenario: Optional credits slot degrades gracefully
```gherkin
Given AppShell renders with a non-modal layout
And no host-provided credits slot content
When the page is server-rendered
Then the footer remains valid and readable
And no empty placeholder block is shown for missing credits
```
- **Vitest Unit Test:** `packages/cyan/src/layouts/app-shell.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/app-shell.spec.ts`
