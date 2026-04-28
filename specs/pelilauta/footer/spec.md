---
feature: Pelilauta App Footer
status: draft
maturity: design
last_major_review: 2026-04-28
parent_spec: specs/pelilauta/spec.md
---

# Feature: Pelilauta App Footer

## Blueprint

### Context
In v17, Pelilauta uses a shared application footer to provide release visibility, community outbound links, optional page-level credits, and a live active-user preview. This footer is part of the page shell experience and appears across both standard and tray layouts.

### Architecture
- **Components:** `.tmp/pelilauta-17/src/components/server/app/AppFooter.astro`, `.tmp/pelilauta-17/src/components/server/app/ActiveUsersWidget.astro`, `.tmp/pelilauta-17/src/layouts/Page.astro`, `.tmp/pelilauta-17/src/layouts/PageWithTray.astro`.
- **Data Models:** Footer text keys from `.tmp/pelilauta-17/src/locales/fi/app.ts` (`app.footer.links.title`, `app.footer.activeUsers.title`); active users API response is an array of account UIDs.
- **API Contracts:** Active users widget requests `/api/accounts/active.json`, validates that the payload is an array, and renders up to 11 UIDs.
- **Dependencies:** `package.json` version string, i18n translator, `AvatarLink` Svelte island, and AppShell footer slots (`footer-body`, `app-footer-credits`) used by host pages.
- **Constraints:** If active-user fetch fails or returns invalid data, footer still renders and the active-users section is omitted; SSR output remains valid without JS except avatar island hydration.

### Book Page
Application footer is domain composition, not a DS style-book primitive.
- **Target path:** N/A
- **Structure:** N/A

## Contract

### Definition of Done
- [ ] Footer appears in Pelilauta page shells that use AppShell/Page composition.
- [ ] Footer always shows app identity and release-note version link.
- [ ] Active-user block is optional and fails closed (hidden on fetch/parse error).
- [ ] Pelilauta provides footer-body content (link columns) and may provide background-image credits via credits slot on non-modal pages.

### Regression Guardrails
- Footer fetch errors MUST NOT break page render.
- Active-user list MUST cap rendered users to 11 entries.
- Footer credits content MUST remain host-page provided, not hardcoded in the footer component.
- Modal pages MUST NOT render the app footer; footer content is supplied only to non-modal shell renders.

### Testing Scenarios
All features with behavioral contracts must have corresponding automated tests mapped to their Gherkin scenarios.

#### Scenario: Footer baseline content renders
```gherkin
Given a non-modal Pelilauta page uses the shared page shell
When the page renders
Then the footer shows app shortname
And it includes a release-notes link using the current app version
And it includes the community links section heading from i18n
```
- **Vitest Unit Test:** `app/pelilauta/src/components/footer/app-footer.test.ts`
- **Playwright E2E Test:** `app/pelilauta/e2e/footer.spec.ts`

#### Scenario: Active users widget degrades safely
```gherkin
Given the active users endpoint fails or returns non-array data
When the footer renders
Then the active-users section is not shown
And the rest of the footer remains visible
```
- **Vitest Unit Test:** `app/pelilauta/src/components/footer/active-users-widget.test.ts`
- **Playwright E2E Test:** `app/pelilauta/e2e/footer.spec.ts`

#### Scenario: Page-provided credits render through slot
```gherkin
Given a page provides app-footer-credits content
When the page renders
Then the footer displays that credits block in the designated credits area
```
- **Vitest Unit Test:** `app/pelilauta/src/layouts/page-shell.test.ts`
- **Playwright E2E Test:** `app/pelilauta/e2e/footer.spec.ts`

#### Scenario: Modal pages omit footer
```gherkin
Given a Pelilauta page is rendered with AppShell `layout="modal"`
When the page renders
Then no app footer is visible
And footer-body or credits content is not rendered
```
- **Vitest Unit Test:** `app/pelilauta/src/layouts/page-shell.test.ts`
- **Playwright E2E Test:** `app/pelilauta/e2e/footer.spec.ts`
