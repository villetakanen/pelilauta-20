---
feature: Site Footer
status: draft
maturity: design
last_major_review: 2026-04-28
parent_spec: ../spec.md
---

# Feature: Site Footer

## Blueprint

### Context
The Site Footer is a structural AppShell region that closes the main viewport with site-wide chrome (legal links, attribution, locale switch, etc.). The DS owns the semantic `<footer>` element, its layout, typography, and grid placement; the consuming application supplies the content via a default slot. The footer participates in `view`, `sidebar`, and `editor` layouts and is suppressed in `modal` layout, where the AppShell is intentionally chrome-light.

### Architecture
- **Components:**
  - `packages/cyan/src/components/SiteFooter.astro` — Astro shell component. Emits `<footer class="cn-app-footer">` with a single default `<slot />`. No client-side JavaScript.
  - `packages/cyan/src/layouts/AppShell.astro` — renders `<SiteFooter>` as a sibling of `<main>` for non-modal layouts and forwards a named slot (`<slot name="footer" />`) into it.
- **Data Models:** None. Content is markup the application passes through.
- **API Contracts:**
  - **`SiteFooter` props:** none required. Optional `aria-label` may be forwarded onto the `<footer>` element via a single `label?: string` prop (defaults to omitted; the implicit `contentinfo` landmark role suffices for one-per-page footers).
  - **`SiteFooter` slots:** default — application content (links, copyright, etc.).
  - **`AppShell` integration:** named slot `footer` on `AppShell.astro`. AppShell renders the footer iff `layout !== "modal"`. When the slot is empty, the component still renders an empty `<footer>` so the grid row reserves a stable spot — apps that want zero footer space pass `layout="modal"` or simply omit the slot and rely on `:empty` collapse (see Constraints).
- **Dependencies:**
  - `--cn-*` tokens for surface, text, gap, and typography scale.
  - `--cn-z-*` for stacking against `--cn-z-tray` (footer must not overlay the tray drawer on mobile).
- **Consumers:**
  - [`specs/cyan-ds/living-style-books/footer/spec.md`](../../living-style-books/footer/spec.md) — docs site footer.
  - [`specs/pelilauta/footer/spec.md`](../../../pelilauta/footer/spec.md) — host app footer.
- **Constraints:**
  - Visible iff `AppShell` `layout` is `view`, `sidebar`, or `editor`. In `layout="modal"`, the footer is not rendered into the DOM.
  - 100% SSR-compatible — no `window`/`document` access, no Svelte islands. The component renders identically with JS disabled.
  - All visual values come from `--cn-*` tokens. No hardcoded colors, sizes, or breakpoints.
  - In `layout="sidebar"`, the footer occupies grid column 2 (the same column as `<main>` and the header), so the tray rail/drawer is unobstructed and stretches full height.
  - When the default slot is empty, the rendered `<footer>` MUST collapse to zero block-size (no padding, no border) so an unused footer does not eat viewport.

### Book Page
A living book page is required to demo this component.
- **Target path:** `app/cyan-ds/src/content/components/site-footer.mdx`
- **Format:** MDX using Book layout (`app/cyan-ds/src/layouts/Book.astro`)
- **Structure:**
  1. **Overview** — Role of the footer in AppShell layouts; suppression in modal mode.
  2. **Default Footer Demo** — `SiteFooter` rendered with sample link list and copyright.
  3. **AppShell Integration Demo** — Embedded `view` and `sidebar` shells showing footer placement; `modal` shell showing absence.
  4. **Empty Slot Demo** — Footer with no slotted content collapses to zero height.
  5. **Props table** — Documents the optional `label` prop and the default slot.

## Contract

### Definition of Done
- [ ] `packages/cyan/src/components/SiteFooter.astro` exists and renders a `<footer class="cn-app-footer">` with a default slot.
- [ ] `AppShell.astro` exposes a `footer` named slot and renders `<SiteFooter>` only when `layout !== "modal"`.
- [ ] In `layout="sidebar"`, `<footer class="cn-app-footer">` is positioned in grid column 2 (alongside header and main, not under the tray).
- [ ] Footer typography, surface color, and inline padding derive from `--cn-*` tokens; no hardcoded values appear in the component's `<style>` block.
- [ ] An empty default slot produces a `<footer>` element with zero rendered block-size.
- [ ] Book page exists at `app/cyan-ds/src/content/components/site-footer.mdx` with the demos listed in Book Page → Structure.
- [ ] Component-level Vitest assertions cover slot forwarding and label forwarding.
- [ ] AppShell-level Vitest assertions cover the modal-suppression rule.

### Regression Guardrails
- **Modal suppression:** `layout="modal"` MUST NOT emit a `<footer class="cn-app-footer">` element into the DOM. A footer in modal mode is an accessibility regression — the modal landmark already owns the page's chrome.
- **No client JS:** The component must remain functional and visually correct without any client-side JavaScript.
- **One `<footer>` per page:** AppShell renders at most one `cn-app-footer`. Applications must not nest a second `<footer class="cn-app-footer">` inside the slot — page-level footers (e.g., article footers) use plain `<footer>` without the `cn-app-footer` class.
- **Tray clearance in sidebar layout:** In `layout="sidebar"`, the footer must not extend into the tray's grid column on any viewport — the tray remains full-height and unobstructed.
- **Token-only styling:** The component's scoped styles reference only `var(--cn-*)` tokens. Any `--cyan-*` or `--color-*` reference is a regression.

### Testing Scenarios

#### Scenario: Default rendering with slotted content
```gherkin
Given a SiteFooter with text "© 2026 Pelilauta" in its default slot
When the component is rendered
Then a single <footer class="cn-app-footer"> element is emitted
And it contains the slotted text
```
- **Vitest Unit Test:** `packages/cyan/src/components/SiteFooter.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/site-footer.spec.ts`

#### Scenario: Empty slot collapses to zero block-size
```gherkin
Given a SiteFooter with no slotted content
When the component is rendered in an AppShell with layout="view"
Then the <footer class="cn-app-footer"> element is present
And its computed block-size is 0
And it has no visible padding or border
```
- **Vitest Unit Test:** N/A (CSS layout assertion)
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/site-footer.spec.ts`

#### Scenario: AppShell suppresses footer in modal layout
```gherkin
Given an AppShell rendered with layout="modal"
And content passed to the "footer" slot
When the page is rendered
Then no element matching footer.cn-app-footer exists in the DOM
```
- **Vitest Unit Test:** `packages/cyan/src/layouts/app-shell.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/app-shell.spec.ts`

#### Scenario: AppShell renders footer in non-modal layouts
```gherkin
Given an AppShell rendered with layout="view"
And content "footer-marker" passed to the "footer" slot
When the page is rendered
Then a <footer class="cn-app-footer"> element exists
And it contains "footer-marker"

Given the same passed to layout="sidebar"
Then a <footer class="cn-app-footer"> element exists
And it occupies grid column 2 of the body grid

Given the same passed to layout="editor"
Then a <footer class="cn-app-footer"> element exists
```
- **Vitest Unit Test:** `packages/cyan/src/layouts/app-shell.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/layouts/app-shell.spec.ts`

#### Scenario: Optional aria-label forwarding
```gherkin
Given a SiteFooter with prop label="Site information"
When the component is rendered
Then the <footer> element carries aria-label="Site information"

Given a SiteFooter with no label prop
Then the <footer> element has no aria-label attribute
```
- **Vitest Unit Test:** `packages/cyan/src/components/SiteFooter.test.ts`
- **Playwright E2E Test:** N/A (covered by unit test)
