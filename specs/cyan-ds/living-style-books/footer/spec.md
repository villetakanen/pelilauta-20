---
feature: Cyan Docs Site Footer
status: draft
maturity: design
last_major_review: 2026-04-28
parent_spec: ../spec.md
---

# Feature: Cyan Docs Site Footer

## Blueprint

### Context
The Cyan Living Style Book renders a site-wide footer below `<main>` on every non-modal page, anchoring documentation pages with attribution, repository link, and version stamp. Implementation reuses the DS [`SiteFooter`](../../components/site-footer/spec.md) primitive — the docs site supplies content into the AppShell `footer` slot via `Book.astro` (which composes through `Page.astro`).

### Architecture
- **Components:**
  - `app/cyan-ds/src/components/DocsFooter.astro` — site-specific footer content (links, version stamp, copyright). New file. Consumed by `Book.astro`.
  - `app/cyan-ds/src/layouts/Book.astro` — passes `<DocsFooter slot="footer" />` into `<Page>`. Same file already passes `tray`/`actions`; `footer` is a new slot forwarding.
  - `packages/cyan/src/layouts/Page.astro` — must forward a `footer` named slot to `AppShell`. **Prerequisite:** updated under the same commit; specs/cyan-ds/layouts/page/spec.md is updated to add the slot row.
- **Data Models:** None. DocsFooter renders static markup. Cyan version is read at build time from `packages/cyan/package.json` via Astro's import (`import pkg from "@cyan/package.json"`).
- **API Contracts:**
  - `DocsFooter` takes no props. It renders a single `<nav>` block (link list) and a small `<p>` with copyright + version.
  - `Book.astro` exposes no new public surface — the footer is internal to the docs site.
- **Dependencies:**
  - DS primitive [`SiteFooter`](../../components/site-footer/spec.md) — owns the `<footer>` element, layout, and modal-suppression.
  - `@cyan/layouts/Page.astro` — must expose a `footer` slot.
  - Cyan tokens (`--cn-*`) for link color, text, and gap.
- **Constraints:**
  - Footer content lives in `app/cyan-ds/`, not in `packages/cyan/` — the DS does not ship site-specific copy or repo URLs.
  - DocsFooter is rendered on every page that uses `Book.astro`. Pages bypassing Book (e.g. raw `Page.astro`) opt out by passing nothing into the `footer` slot.
  - Modal-mode pages do not render the footer (enforced by `SiteFooter` suppression in `AppShell`).
  - DocsFooter uses only DS primitives (links, type ramp). No `<style>` block; if styling is missing, escalate to the DS.

### Content (starter set — confirm before implementation)
- Copyright line: `© Cyan Design System {currentYear}` (year computed at render).
- Repository link: `<a href="https://github.com/villetakanen/pelilauta-20">Source</a>`.
- Version stamp: `Cyan v{pkg.version}` from `packages/cyan/package.json`.
- Link to docs root `/` ("Home"). No site map duplication — DocsTray is the navigation.

## Contract

### Definition of Done
- [ ] `app/cyan-ds/src/components/DocsFooter.astro` exists and emits the starter content described above.
- [ ] `app/cyan-ds/src/layouts/Book.astro` mounts `<DocsFooter slot="footer" />` so every Book-rendered page receives it.
- [ ] `packages/cyan/src/layouts/Page.astro` forwards a `footer` named slot to `AppShell` (prerequisite, same commit).
- [ ] DocsFooter renders no `<style>` block and no inline styles.
- [ ] Cyan version stamp matches `packages/cyan/package.json` `version` field at build time.

### Regression Guardrails
- **Modal-mode docs pages render no footer.** Any future Book variant or page that sets `layout="modal"` MUST NOT have a `footer.cn-app-footer` in the DOM (delegated to `SiteFooter` suppression — covered here as a docs-site E2E assertion).
- **Single footer per page.** A docs page MUST NOT contain more than one `footer.cn-app-footer` element.
- **No DS-level coupling to docs content.** `packages/cyan/` MUST NOT import or reference `DocsFooter`. The DS surfaces a slot; the app fills it.

### Testing Scenarios

#### Scenario: Book pages render the docs footer
```gherkin
Given any docs page rendered through Book.astro with layout="sidebar" (default)
When the page loads
Then exactly one <footer class="cn-app-footer"> element is present
And it contains the text "Cyan Design System"
And it contains a link to the repository
And it contains a version stamp matching the cyan package version
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/docs-footer.spec.ts`

#### Scenario: Modal layout suppresses the footer
```gherkin
Given a docs page rendered with layout="modal"
And the page passes content into Book's footer surface
When the page loads
Then no <footer class="cn-app-footer"> element exists in the DOM
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/docs-footer.spec.ts`

#### Scenario: Version stamp follows packages/cyan
```gherkin
Given packages/cyan/package.json reports version "X.Y.Z"
When DocsFooter is rendered
Then the footer text contains "Cyan v X.Y.Z"
```
- **Vitest Unit Test:** `app/cyan-ds/src/components/DocsFooter.test.ts`
