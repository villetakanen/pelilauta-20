---
feature: DS App Footer (Docs Host Composition)
status: draft
last_major_review: 2026-04-28
parent_spec: specs/cyan-ds/components/spec.md
stylebook_url: TBD
---

# Feature: DS App Footer (Docs Host Composition)

## Blueprint

### Context
The docs app footer is the Design System host-level footer composition used by `app/cyan-ds`. It reuses the DS AppShell footer region contract while supplying docs-specific content. This keeps DS primitives app-agnostic and allows docs navigation/credits to evolve without changing shell internals.

### Architecture
- **Components:** v17 provenance is the host-injected footer credits pattern from `.tmp/pelilauta-17/src/layouts/Page.astro` and page usage in `.tmp/pelilauta-17/src/pages/index.astro` / `.tmp/pelilauta-17/src/pages/channels/index.astro`; v20 target lives in `app/cyan-ds/src/layouts/` and/or `app/cyan-ds/src/components/` as docs-host composition.
- **Data Models:** Docs footer content is host-provided static metadata (links, attribution, version text), not locale-bound DS primitives.
- **API Contracts:** Docs app passes footer body (link-column content) and optional credits through AppShell footer slots for non-modal layouts; when AppShell layout is modal, no footer content is rendered.
- **Dependencies:** `packages/cyan` AppShell footer contract and DS tokens.
- **Constraints:** Docs app footer must not require app-layer inline style overrides; typography/layout are expressed via DS primitives/tokens only.

### Book Page
This feature belongs to the docs host app itself.
- **Target path:** `app/cyan-ds/src/content/principles/layout-composition/docs-footer.mdx`
- **Structure:** docs-footer intent, slot/prop wiring to AppShell, and content ownership boundaries.

## Contract

### Definition of Done
- [ ] `app/cyan-ds` provides a concrete footer composition through AppShell footer API.
- [ ] Docs footer content is docs-specific and contains no Pelilauta domain links.
- [ ] Docs footer remains readable and complete without client-side JavaScript.
- [ ] Docs app provides footer slot content only for non-modal shell layouts.

### Regression Guardrails
- DS app footer MUST consume the DS shell contract; it must not fork AppShell internals.
- Docs footer styles MUST rely on DS tokens/classes rather than page-local inline styles.
- Docs app MUST treat modal AppShell as footerless and must not rely on footer actions there.

### Testing Scenarios
All features with behavioral contracts must have corresponding automated tests mapped to their Gherkin scenarios.

#### Scenario: Docs host injects footer content through AppShell
```gherkin
Given the Cyan docs app renders a non-modal page with AppShell
When docs footer content is provided by the host app
Then the content appears in the AppShell footer region
And the footer renders with no client-side JS dependency
```
- **Vitest Unit Test:** `app/cyan-ds/src/layouts/docs-shell.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/docs-footer.spec.ts`

#### Scenario: Modal docs pages omit footer region
```gherkin
Given the Cyan docs app renders a page with AppShell `layout="modal"`
When footer slot content is also provided by the host app
Then no footer region is rendered
And provided footer slot content is not displayed
```
- **Vitest Unit Test:** `app/cyan-ds/src/layouts/docs-shell.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/docs-footer.spec.ts`

#### Scenario: Docs footer remains domain-neutral
```gherkin
Given the docs app footer is rendered
When footer links and labels are inspected
Then they describe design-system/docs resources
And they do not include Pelilauta production community link sets
```
- **Vitest Unit Test:** `app/cyan-ds/src/layouts/docs-shell.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/docs-footer.spec.ts`
