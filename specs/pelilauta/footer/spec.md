---
feature: Pelilauta App Footer
status: draft
maturity: design
last_major_review: 2026-04-28
parent_spec: ../spec.md
---

# Feature: Pelilauta App Footer

## Blueprint

### Context
The Pelilauta host renders a site-wide footer below `<main>` on every non-modal page, providing legal, attribution, and community navigation links. Implementation reuses the DS [`SiteFooter`](../../cyan-ds/components/site-footer/spec.md) primitive — the host supplies content into the AppShell `footer` slot via its own `app/pelilauta/src/layouts/Page.astro`, which composes through `@cyan/layouts/Page.astro`.

### Architecture
- **Components:**
  - `app/pelilauta/src/components/AppFooter.astro` — host-specific footer content. New file. Consumed by the host's `Page.astro`.
  - `app/pelilauta/src/layouts/Page.astro` — passes `<AppFooter slot="footer" />` into `<CyanPage>`. Same file already forwards `app-background-poster`, `tray`, and `actions`; `footer` is a new slot forwarding.
  - `packages/cyan/src/layouts/Page.astro` — must forward a `footer` named slot to `AppShell`. **Prerequisite:** updated under the same commit; `specs/cyan-ds/layouts/page/spec.md` updated to add the slot row.
- **Data Models:** None. AppFooter renders static markup with i18n-keyed link labels.
- **API Contracts:**
  - `AppFooter` takes no props. It exposes one named slot, `app-footer-credits`, for host-level credit/poster attribution.
  - Translatable labels come from the i18n composition seam — see [`packages/i18n`](../i18n/spec.md). New keys (`footer.source`, `footer.license`, `footer.builtWith`) live under `app/pelilauta/src/locales/app/footer.{lang}.ts` (new files, one per supported locale). Existing v17 keys reused: `app:shortname`, `app:footer.links.title`, `site.docs.title`. Community partner names (Roolipelifoorumi, Roolipelit, Roolipelitiedotus, L&L OGL Wiki) and `MYRRYS` are proper nouns rendered as literals — no i18n keys.
  - The host's `Page.astro` exposes no new prop — the slot is filled internally on every page.
- **Dependencies:**
  - DS primitive [`SiteFooter`](../../cyan-ds/components/site-footer/spec.md) — owns the `<footer>` element, layout, and modal-suppression.
  - `@cyan/layouts/Page.astro` — must expose a `footer` slot.
  - `packages/i18n` — translation engine for footer labels.
- **Constraints:**
  - Footer content lives in `app/pelilauta/`, not in `packages/cyan/`. The DS does not ship locale-bound strings or community URLs.
  - AppFooter is rendered on every page that composes through the host's `Page.astro`. Modal-layout pages do not render the footer (enforced by `SiteFooter` suppression in `AppShell`).
  - AppFooter uses only DS primitives. No `<style>` block; if styling is missing, escalate to the DS.
  - Footer link labels go through the i18n seam; literal strings in `AppFooter.astro` are limited to symbols (e.g. `©`) and the year.

### Content

The footer content is grouped into three logical sections. Visual layout (columns vs. stacked) is the implementer's responsibility, executed exclusively with DS primitives — no `<style>` block in `AppFooter.astro`.

#### Group 1 — Brand
| Element | Label source | Target | Notes |
|---|---|---|---|
| Brand glyph | `<cn-icon noun="fox">` | — | Matches v17. |
| App name | `t("app:shortname")` | — | Existing key. |
| Version stamp | literal `{version}` from `app/pelilauta/package.json` | `/docs/80-release-notes` | v17 carry-over. Implementer confirms the release-notes route exists in v20 docs collection before linking. |
| RSS | literal `RSS` | `/rss/threads.xml` | Anonymous-friendly feed; route ships from the host. |
| Docs link | `t("site.docs.title")` (existing key) | `/docs/00-index` | **Moved from tray rail to footer per user direction.** Resolved as a `/docs/[slug]` Astro route (matching the v17 docs collection pattern, e.g. `/docs/80-release-notes`); the literal `.md` extension is stripped at link time. |
| Per-page credits slot | `<slot name="app-footer-credits" />` | — | Host-app plumbing for background-image attribution and per-page credits. NOT a DS concern; the slot lives on `AppFooter.astro`, never on `SiteFooter`. |

#### Group 2 — Roolipelit verkossa (RPG community partners)
Heading: `t("app:footer.links.title")` (existing key, `"Roolipelit verkossa"`).

| Label | Target |
|---|---|
| literal `Roolipelifoorumi -discord` | `https://discord.gg/c5bAGzNKZz` |
| literal `Roolipelit -discord` | `https://discord.gg/2MHBhzw` |
| literal `Roolipelitiedotus` | `https://roolipelitiedotus.fi/` |
| literal `L&L OGL Wiki` | `https://lollo.ilmatar.net/index.php?title=Etusivu` |

Community names are proper nouns; not translated. All links open in a new tab with `rel="noopener"`.

#### Group 3 — Attribution
| Element | Label source | Target | Notes |
|---|---|---|---|
| Sponsor | literal `MYRRYS` | `https://myrrys.com` | External; new tab. |
| Source | `t("footer.source")` (default `"Source"` / `"Lähdekoodi"`) | `https://github.com/villetakanen/pelilauta-20` | External; new tab. |
| License | `t("footer.license")` (default `"MIT License"`) | `https://github.com/villetakanen/pelilauta-20/blob/main/LICENSE` | **Prerequisite:** MIT `LICENSE` file ported from v17 and committed at repo root in the same commit. |
| Built with | `t("footer.builtWith")` (default `"Built with ASDLC.io"`) | `https://asdlc.io` | External; new tab. |

#### Out of scope for the footer MVP
- **`<ActiveUsersWidget>`** — v17 mounted a Firestore-subscribed live counter in the third column. v20 anonymous pages are pure SSR (no Firebase subscriptions); a live widget would either gate behind auth or mount as a CSR island, both of which are larger decisions than this spec covers. Defer to a future spec.
- **`app.footer.partners.title`** key (v17 had `"Yhteistyössä"`) — declared in v17 i18n but not rendered. Not introduced into v20 unless a partners section is added.

The site map is NOT duplicated in the footer — the tray is the canonical navigation. Adding new footer entries is a deliberate spec edit.

## Contract

### Definition of Done
- [ ] `app/pelilauta/src/components/AppFooter.astro` exists and renders all three content groups described above.
- [ ] `app/pelilauta/src/layouts/Page.astro` mounts `<AppFooter slot="footer" />` so every host-rendered page receives it.
- [ ] `packages/cyan/src/layouts/Page.astro` forwards a `footer` named slot to `AppShell` (prerequisite, same commit).
- [ ] AppFooter exposes a named slot `app-footer-credits` for per-page credit content.
- [ ] Brand glyph renders as `<cn-icon noun="fox">`; version stamp reads `app/pelilauta/package.json` `version` at build time and links to `/docs/80-release-notes`.
- [ ] RSS link points at `/rss/threads.xml`; docs link points at `/docs/00-index`.
- [ ] All four RPG community partner links from Group 2 are present with the targets listed in the Content table.
- [ ] All four Group 3 attribution links (MYRRYS, Source, License, Built with) are present with the targets listed.
- [ ] MIT `LICENSE` file is committed at the repo root in the same commit (footer license link otherwise resolves to a 404).
- [ ] New keys `footer.source`, `footer.license`, `footer.builtWith` exist for every locale supported by the host (currently `fi`; `en` if the i18n spec lists it).
- [ ] AppFooter renders no `<style>` block and no inline styles.

### Regression Guardrails
- **Modal-mode pages render no footer.** Any host page using `layout="modal"` MUST NOT contain a `footer.cn-app-footer` element (delegated to `SiteFooter` suppression).
- **Single footer per page.** A host page MUST NOT contain more than one `footer.cn-app-footer` element. Inline page footers (e.g. an article footer) use plain `<footer>` without the `cn-app-footer` class.
- **i18n-keyed labels.** Adding a new footer link MUST add a corresponding key to every supported locale file or the build fails (per `packages/i18n` schema enforcement).
- **No DS-level coupling to host content.** `packages/cyan/` MUST NOT import or reference `AppFooter`.

### Testing Scenarios

#### Scenario: Host pages render the app footer with all three groups
```gherkin
Given any host page rendered through app/pelilauta/src/layouts/Page.astro with the default layout
When the page loads
Then exactly one <footer class="cn-app-footer"> element is present
And it contains a <cn-icon noun="fox"> element
And it contains a link to /docs/80-release-notes whose text equals the version from app/pelilauta/package.json
And it contains a link to /rss/threads.xml
And it contains a link to /docs/00-index
And it contains links to all four RPG community partner targets (the two Discord URLs, roolipelitiedotus.fi, lollo.ilmatar.net)
And it contains a link to https://myrrys.com
And it contains a link to https://github.com/villetakanen/pelilauta-20
And it contains a link to the GitHub LICENSE blob URL
And it contains a link to https://asdlc.io
```
- **Playwright E2E Test:** `app/pelilauta/e2e/app-footer.spec.ts`

#### Scenario: Modal layout suppresses the footer
```gherkin
Given a host page rendered with layout="modal" (e.g. /login)
When the page loads
Then no <footer class="cn-app-footer"> element exists in the DOM
```
- **Playwright E2E Test:** `app/pelilauta/e2e/app-footer.spec.ts`

#### Scenario: Locale switch updates translatable labels
```gherkin
Given the host is rendered with locale="fi"
When the AppFooter is rendered
Then the Source / License / Built-with link labels match the Finnish translations from app/pelilauta/src/locales/app/footer.fi.ts
And the partner-section heading reads the value of t("app:footer.links.title") for fi (existing key)
And the literal community partner names (Roolipelifoorumi -discord, Roolipelit -discord, Roolipelitiedotus, L&L OGL Wiki) and the MYRRYS sponsor link render as literals regardless of locale
```
- **Vitest Unit Test:** `app/pelilauta/src/components/AppFooter.test.ts`
- **Playwright E2E Test:** `app/pelilauta/e2e/app-footer.spec.ts`

#### Scenario: app-footer-credits slot is forwarded
```gherkin
Given a host page that passes content "credit-marker" into the app-footer-credits slot
When the page is rendered
Then the rendered AppFooter contains the text "credit-marker"
And the SiteFooter (DS primitive) does NOT receive the same slot
```
- **Vitest Unit Test:** `app/pelilauta/src/components/AppFooter.test.ts`
