---
feature: SEO Head Metadata (AppShell)
status: draft
maturity: design
last_major_review: 2026-04-27
parent_spec: ../app-shell/spec.md
---

# Feature: SEO Head Metadata (AppShell)

## Blueprint

### Context

`AppShell` (`packages/cyan/src/layouts/AppShell.astro`) owns the document `<head>` for every page in the workspace. Beyond the `<title>` and viewport boilerplate it currently emits, public pages need crawler-readable metadata (description, canonical URL, robots), and pages that are syndicated through social platforms need Open Graph and Twitter Card tags. This spec defines the contract for that metadata: what AppShell renders, how host pages supply per-page values, and how editor / modal surfaces opt out of indexing.

The goal is parity with the v17 `BaseHead.astro` SEO surface so search snippets, link previews, and crawler hints survive the v20 rewrite. v17 source: `.tmp/pelilauta-17/src/components/server/BaseHead/BaseHead.astro` (public) and `EditorHead.astro` (no-index variant).

### Architecture

- **Components:**
  - `packages/cyan/src/layouts/AppShell.astro` — owns `<head>`. Receives SEO props, renders the meta tags described under §Head metadata contract.
  - `packages/cyan/src/layouts/Page.astro` — forwards SEO props from host pages to `AppShell` without modification.
  - `app/pelilauta/src/layouts/Page.astro` — host wrapper; forwards SEO props from page frontmatter to the cyan `Page`.
  - Host pages (`app/pelilauta/src/pages/**/*.astro`) — compute the page-specific values (description snippet, hero image, no-index flag) in frontmatter and pass them through the layout chain.

- **Data Models:** prop types only; no schemas. The shape used by callers:

  ```ts
  interface SeoProps {
    title: string;         // <title> + og:title + twitter:title (required)
    description: string;   // meta description + og:description + twitter:description (required)
    image?: string;        // per-page og:image + twitter:image (absolute URL preferred)
    defaultImage?: string; // host-supplied brand fallback for og:image/twitter:image when `image` is absent
    siteName?: string;     // host-supplied og:site_name (e.g. "Pelilauta"); omitted when absent
    noSharing?: boolean;   // when true: emit robots noindex,nofollow; suppress OG/Twitter/JSON-LD
    ogType?: "website" | "article"; // og:type, defaults to "website"
    jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
    // raw Schema.org object(s); arrays are wrapped in @graph and emitted as a single <script> block.
    breadcrumbs?: Array<{ label: string; href: string }>;
    // href may be relative or absolute; AppShell resolves to absolute origin-prepended URLs in the
    // emitted BreadcrumbList JSON-LD. UI rendering of breadcrumbs is the page template's
    // responsibility — this spec defines the structured-data emission only.
  }
  ```

  `title` and `description` are required at the AppShell boundary. AppShell is text-agnostic — it never interpolates i18n strings or invents fallbacks. Hosts MUST supply both; if a host has no per-page text it MUST pass a deliberate string (a generated snippet or a localized site-level default the host resolves itself).

- **API Contracts:** see §Head metadata contract and §AEO & Structured Data below for the exact tag set, fallback rules, and conditional emissions.

- **Dependencies:**
  - `@pelilauta/i18n` — for `app:meta.title` / `app:meta.description` defaults (host-owned strings; AppShell receives them as props or a default-resolution helper).
  - `@pelilauta/utils/markdownToPlainText` — converts `markdownContent` to a plain-text meta-description string. Specced at [`specs/pelilauta/markdown/markdown-to-plain-text/spec.md`](../../../pelilauta/markdown/markdown-to-plain-text/spec.md). Hosts call it with `maxLength=160` for the SEO description path.
  - `Astro.url` — used to derive canonical URL, OG `og:url`, and base for JSON-LD IDs.

- **Constraints:**
  - **DS API style: individual props, not aggregate objects.** AppShell consumes individual SEO/AEO props (`title`, `description`, `image`, `noSharing`, `ogType`, `jsonLd`, `breadcrumbs`) rather than an aggregate `seo: SeoProps` object. The `SeoProps` interface above is a host-side aggregate convenience type, not the DS surface. Rationale: DS surface is consumed across hosts and benefits from discoverable, individually-documented, IDE-completable props with a stable cross-host API. App-layer components MAY aggregate — they own their data shapes; DS components do not. Hosts that prefer aggregation construct an `SeoProps` object and pass it via Astro spread: `<Page {...seo}>`. The spread pattern is supported and encouraged at the host layer.
  - AppShell is the **only** component that emits `<head>` metadata and `<script type="application/ld+json">`. Host pages and feature components MUST NOT inject `<meta>`, `<link rel="canonical">`, `<title>`, or JSON-LD from elsewhere — AppShell owns the head, full stop.
  - AppShell is text-agnostic. It does not import the i18n engine, does not resolve localized fallbacks, and does not invent description text. `title` and `description` are required props supplied verbatim by the host. Hosts that need a fallback (e.g. a localized site-level default) resolve it themselves before calling AppShell.
  - Canonical URL reflects the request URL. `<link rel="canonical" href={Astro.url} />` — full path, no manipulation, except for the editor variant (see §Editor variant).
  - `noSharing` is a one-way switch. Pages opt **out** of indexing/sharing; they cannot opt in beyond the default. Modal pages force `noSharing=true` regardless of caller intent.
  - The `og:image` URL must be absolute. Relative paths break crawler resolution. AppShell prepends `Astro.url.origin` to relative `image` / `defaultImage` props as a defensive convenience, but callers SHOULD pass absolute URLs.
  - **AppShell holds no brand assets.** The DS does not know what brand image any host uses. The brand fallback for OG/Twitter image tags arrives via the `defaultImage` prop, supplied by the consuming app. In Pelilauta, the app resolves it from `@myrrys/proprietary` (the proprietary media submodule); the DS does not depend on that package. When neither `image` nor `defaultImage` is supplied, AppShell omits OG and Twitter image tags entirely — it never substitutes a built-in fallback.
  - **AppShell holds no site identity.** The DS does not know the consuming app's name. `og:site_name` arrives via the `siteName` prop (e.g. `"Pelilauta"`), supplied by the consuming app. When `siteName` is absent, AppShell omits `<meta property="og:site_name">` entirely — same architectural shape as `defaultImage`.
  - Locale-bound text never lives inside AppShell. All translatable strings come in via props from the host.
  - JSON-LD content is host-supplied. AppShell does not validate, translate, modify, or post-process it — it emits the JSON the caller produces.
  - Hosts SHOULD use typed Schema.org builders (e.g. a future `@pelilauta/utils/jsonLd` helper) for common shapes (`Article`, `BreadcrumbList`, `Person`, `Organization`) rather than hand-rolling JSON-LD inline. AppShell does not enforce this.
  - JSON-LD emission is suppressed when `noSharing=true` OR `layout` is `"editor"` OR `layout` is `"modal"`.
  - Breadcrumbs are emitted as Schema.org `BreadcrumbList` JSON-LD only. UI rendering of a visible breadcrumb trail is the page template's responsibility — this spec does NOT require AppShell to render a visual breadcrumb component.

### Head metadata contract

When `noSharing` is false / unset (public pages):

| Tag | Source | Notes |
|---|---|---|
| `<title>` | `title` (required) | Single source of truth for browser-tab + SERP title. Always emitted. |
| `<link rel="canonical" href>` | `Astro.url` | Full URL of the request. |
| `<meta name="description">` | `description` (required) | Plain text, ≤ ~160 chars recommended. Always emitted. |
| `<meta name="generator">` | `Astro.generator` | Identifies the tooling. |
| `<meta property="og:title">` | same as `<title>` | |
| `<meta property="og:description">` | same as description | |
| `<meta property="og:image">` | `image` ?? `defaultImage` | Both host-supplied; absolute URL preferred. **Omitted entirely** when both are absent — AppShell has no built-in brand asset. |
| `<meta property="og:url" content>` | `Astro.url` | Same as canonical. |
| `<meta property="og:type" content>` | `ogType` ?? `"website"` | `"article"` for threads/pages. |
| `<meta property="og:site_name" content>` | `siteName` (host-supplied) | E.g. `"Pelilauta"`. **Omitted entirely** when absent — AppShell holds no site identity. |
| `<meta name="twitter:card" content>` | `"summary_large_image"` | |
| `<meta name="twitter:title" content>` | same as `<title>` | |
| `<meta name="twitter:description" content>` | same as description | |
| `<meta name="twitter:image" content>` | same as `og:image` | |

### AEO & Structured Data

Answer Engine Optimization (AEO) requires machine-readable context. AppShell emits the structured-data container; the host supplies the data.

#### JSON-LD (Schema.org)

AppShell renders a single `<script type="application/ld+json">` block when `jsonLd` is provided AND `noSharing` is false AND `layout` is neither `"editor"` nor `"modal"`.

- **Single object:** rendered verbatim inside the script block as the JSON serialization of the supplied object.
- **Multiple objects (array):** wrapped in a Schema.org `@graph` document — `{"@context":"https://schema.org","@graph":[...]}` — within a single `<script>` block. This is broader-compatible than emitting a bare JSON array (some validators reject) or emitting one block per object (multiplies parsing cost). Hosts that need a different `@context` per object compose them upstream into a single `@graph`.
- **Validation:** AppShell does not validate the schema; the host is responsible for correct Schema.org syntax. See §Constraints regarding typed builders.

#### Breadcrumbs

AppShell emits structured-data breadcrumbs as a Schema.org `BreadcrumbList`. UI rendering of a visible breadcrumb trail is **not** an AppShell concern — page templates that need a visible breadcrumb render their own UI inside `<main>`.

When `breadcrumbs` is supplied AND JSON-LD emission is permitted (per the conditions above), AppShell emits a `BreadcrumbList` object as part of the JSON-LD `@graph`. Each item:

- `position` is 1-indexed and reflects array order.
- `name` is the supplied `label` verbatim (no translation, no HTML).
- `item` is the supplied `href`, resolved to an absolute URL via `Astro.url.origin` if relative.

Example: with `breadcrumbs=[{label: "Home", href: "/"}, {label: "Threads", href: "/threads"}]` at request origin `https://host.example`, AppShell emits:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home",    "item": "https://host.example/" },
    { "@type": "ListItem", "position": 2, "name": "Threads", "item": "https://host.example/threads" }
  ]
}
```

When both `jsonLd` and `breadcrumbs` are supplied, both objects render together inside a single `@graph` block.

When `noSharing` is true (admin / modal / hidden surfaces):

| Tag | Behavior |
|---|---|
| `<meta name="robots" content="noindex, nofollow">` | **emitted** |
| Open Graph + Twitter Card tags | **suppressed entirely** — do not emit empty or default OG metadata for non-shared pages |
| `<title>`, canonical, description, generator | **still emitted** — these are useful even on uncrawlable pages (browser tab, accessibility) |

### Editor variant

Editor surfaces (full-screen authoring views, modal-like editor pages) take a stricter posture than `noSharing=true`:

- Always render `<meta name="robots" content="noindex, nofollow">`.
- Render `<link rel="canonical" href={Astro.url.origin} />` — origin only, **not the full URL**. This is a deliberate v17 anti-indexing pattern that breaks the canonical equivalence between editor URLs and origin so crawlers that ignore robots still don't index editor content.
- Skip Open Graph and Twitter Card tags entirely.
- `title` and `description` are still required and rendered verbatim. Hosts that mount editor pages SHOULD pass editor-specific localized strings (resolved host-side, e.g. from `t('app:meta.editor.*')`) — AppShell does not invent or substitute them.

In v20, this is a property of the AppShell `layout` mode rather than a separate component. When `layout="editor"`, AppShell switches to the editor head posture above. The same applies to `layout="modal"` for the canonical-shortening behavior, since v17's `ModalPage.astro` forces `noSharing=true` for the same reason: modal pages are authenticated interactions, not crawlable content.

### Book Page

- **Target path:** `app/cyan-ds/src/content/components/app-shell-seo.mdx`.
- **Structure:**
  1. **Intro paragraph** — what the SEO surface is and why AppShell owns it (one short paragraph; link back to this spec).
  2. **Prop reference table** — every SEO/AEO prop AppShell accepts (`title`, `description`, `image`, `defaultImage`, `siteName`, `noSharing`, `ogType`, `jsonLd`, `breadcrumbs`, plus the existing `layout` flag because it cross-couples emission). Columns: name, type, required, default, description. Source-of-truth is this spec's §Architecture and §Head metadata contract — the table mirrors them rather than restating them.
  3. **Emitted-`<head>` examples**, one per posture, each as a fenced ` ```html ` code block showing the head shape an MDX-rendered fixture page would produce. Postures:
     - **Public page** — `noSharing` unset, with `image`, `siteName`, `ogType="article"`, and a one-object `jsonLd`. Demonstrates the full OG/Twitter/JSON-LD set, canonical = `Astro.url`.
     - **Public page with `defaultImage` fallback** — `image` omitted, `defaultImage` supplied; demonstrates the cascade and absolute-URL prepending.
     - **Public page without `siteName`** — demonstrates `og:site_name` omission.
     - **`noSharing=true`** — `jsonLd` is supplied; demonstrates `<meta name="robots">` emission and full OG/Twitter/JSON-LD suppression.
     - **`layout="editor"`** — demonstrates origin-only canonical, robots noindex, OG/Twitter/JSON-LD suppression.
     - **`layout="modal"`** — demonstrates forced `noSharing` semantics regardless of caller intent.
  4. **`@graph` example** — when both `jsonLd` (array) and `breadcrumbs` are supplied, show the merged single-`<script>` JSON-LD block.
  5. **Cross-link** to `specs/pelilauta/markdown/markdown-to-plain-text/spec.md` for the description-derivation helper, and to `ARCHITECTURE.md` §Text conventions for the ellipsis convention.
- **Code blocks use ` ```html `** (not `<pre>`) — same rendered output, MDX-idiomatic, syntax-highlighted by the cyan-ds book's existing prose styles.
- **Constraint:** the book page demonstrates the contract; it does not extend it. Any divergence between the book page and this spec is a book-page bug, not a contract change.

### Definition of Done

DoD is split across three ship stages so incremental commits can land green
without satisfying clauses that depend on later stages. Stages are cumulative:
Stage 2 assumes Stage 1 is green, Stage 3 assumes Stage 2.

#### Stage 1 DoD — closes #16's deferred SEO criterion

- [ ] `AppShell` accepts a `description: string` prop (required) in addition to existing required `title`.
- [ ] AppShell always renders `<meta name="description">` with the supplied value. There is no "omitted" branch — supplying the value is the host's responsibility.
- [ ] Canonical URL `<link rel="canonical">` reflects `Astro.url` for non-editor layouts.
- [ ] `Page.astro` (cyan layouts) and `app/pelilauta/src/layouts/Page.astro` (host) both forward `description` from page frontmatter through to AppShell without modification.
- [ ] Host page `app/pelilauta/src/pages/threads/[threadKey]/index.astro` derives `description` from a 160-char plain-text snippet of `thread.markdownContent` and passes it through.
- [ ] `@pelilauta/utils/markdownToPlainText` exists per [`specs/pelilauta/markdown/markdown-to-plain-text/spec.md`](../../../pelilauta/markdown/markdown-to-plain-text/spec.md) (its DoD includes creating `packages/utils/src/markdownToPlainText.ts` and adding the package export). Stage-1 of the seo spec depends on that spec being green.
- [ ] Every host page in `app/pelilauta/src/pages/**/*.astro` that uses `Page.astro` passes both `title` and `description`. Compile errors at this boundary are intentional — they surface "no per-page description" as a deliberate decision rather than a silent omission.

#### Stage 2 DoD — v17 OG/Twitter parity

- [ ] `AppShell` accepts `image?: string`, `defaultImage?: string`, `siteName?: string`, and `noSharing?: boolean` props.
- [ ] When `noSharing` is false / unset, AppShell emits the full Open Graph set (`og:title`, `og:description`, `og:image` if available, `og:url`, `og:type=website`, `og:site_name` if supplied) and Twitter Card set (`twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image` if available).
- [ ] `<meta property="og:description">` and `<meta name="twitter:description">` mirror the required `description` value.
- [ ] OG/Twitter image resolution cascade: AppShell uses `image` if supplied, otherwise `defaultImage`, otherwise omits both `og:image` and `twitter:image` entirely. AppShell does NOT carry a built-in brand fallback — when neither prop is supplied the tags are absent. Relative URLs in either prop are origin-prepended via `Astro.url.origin`.
- [ ] In `app/pelilauta/src/layouts/Page.astro`, the host resolves the brand fallback from `@myrrys/proprietary` and passes it to AppShell as `defaultImage`, and passes its app name (e.g. `"Pelilauta"`) as `siteName`. The DS does not depend on `@myrrys/proprietary` and does not know the app's name.
- [ ] When `siteName` is absent, AppShell does not emit `<meta property="og:site_name">`.
- [ ] When `noSharing=true`, AppShell emits `<meta name="robots" content="noindex, nofollow">` and suppresses every OG and Twitter Card tag.
- [ ] When `layout="editor"`, AppShell emits `<link rel="canonical" href={Astro.url.origin}>` (origin only, no path), robots noindex/nofollow, and suppresses OG/Twitter regardless of `noSharing`.
- [ ] When `layout="modal"`, AppShell forces `noSharing=true` semantics regardless of caller.
- [ ] `Page.astro` (cyan layouts) and `app/pelilauta/src/layouts/Page.astro` (host) both forward `image`, `defaultImage`, `siteName`, and `noSharing` from page frontmatter through to AppShell without modification — same forwarding pattern as Stage-1's `description`.

#### Stage 3 DoD — AEO (structured data)

- [ ] `AppShell` accepts `ogType: "website" | "article"`, `jsonLd: Record<string, unknown> | Array<Record<string, unknown>>`, and `breadcrumbs: Array<{ label: string; href: string }>` props.
- [ ] When `ogType="article"`, `<meta property="og:type" content="article">` renders. Default remains `"website"`. Article sub-tags (`article:published_time`, `article:author`) are NOT emitted by this spec.
- [ ] When `jsonLd` is a single object, AppShell emits `<script type="application/ld+json">` containing the JSON serialization of that object.
- [ ] When `jsonLd` is an array, AppShell wraps it in `{"@context":"https://schema.org","@graph":[...]}` and emits a single `<script>` block.
- [ ] When `breadcrumbs` is supplied, AppShell emits a `BreadcrumbList` Schema.org object inside the same `@graph` block alongside any `jsonLd` objects, with `position` 1-indexed, `name` from the supplied label verbatim, and `item` resolved to an absolute URL.
- [ ] AppShell does NOT render any visual breadcrumb component — UI rendering is the page template's responsibility.
- [ ] JSON-LD emission is suppressed when `noSharing=true` OR `layout="editor"` OR `layout="modal"`.
- [ ] `Page.astro` (cyan layouts) and `app/pelilauta/src/layouts/Page.astro` (host) both forward `ogType`, `jsonLd`, and `breadcrumbs` from page frontmatter through to AppShell without modification.

### Regression Guardrails

- AppShell remains the only emitter of `<head>` metadata and JSON-LD in the workspace. No host page, layout, or feature component injects `<meta>`, `<link rel="canonical">`, `<title>`, or JSON-LD directly.
- The `noSharing` switch is monotonic: setting `noSharing=true` never enables OG/Twitter/JSON-LD tags; setting it false never overrides the editor-layout no-index posture.
- Modal layout always renders `<meta name="robots" content="noindex, nofollow">`. A regression that allows a modal page to be crawled is a security/privacy issue, not a styling bug.
- Editor canonical URLs MUST NOT include the request path. A regression that emits `<link rel="canonical" href={Astro.url}>` (full URL) on an editor page defeats v17's intentional anti-indexing pattern.
- Locale-bound text MUST NOT appear hardcoded inside AppShell. All user-facing strings come in as props.

### Testing Scenarios

#### Scenario: public page emits full SEO/AEO metadata

```gherkin
Given a host page passes title, description, image, and jsonLd to AppShell with noSharing unset
When the page is rendered
Then <title> reflects the supplied title
And <link rel="canonical"> reflects Astro.url
And <meta name="description"> reflects the supplied description
And <meta property="og:title"> reflects the supplied title
And <meta property="og:description"> reflects the supplied description
And <meta property="og:image"> reflects the supplied image (absolute URL)
And <meta property="og:url"> reflects Astro.url
And <meta property="og:type"> is "website"
And <meta name="twitter:card"> is "summary_large_image"
And <meta name="twitter:title">, <meta name="twitter:description">, <meta name="twitter:image"> mirror the OG values
And a <script type="application/ld+json"> block contains the supplied jsonLd
And <meta name="robots"> is NOT emitted
```

- **Vitest Unit Test:** `packages/cyan/src/layouts/app-shell.test.ts`

#### Scenario: breadcrumbs emit BreadcrumbList JSON-LD with absolute URLs

```gherkin
Given AppShell is rendered at request origin https://host.example
And breadcrumbs=[{label: "Home", href: "/"}, {label: "Threads", href: "/threads"}]
When the page is rendered
Then a single <script type="application/ld+json"> block is emitted
And the JSON contains a BreadcrumbList with 2 itemListElement entries
And the first entry has position=1, name="Home", item="https://host.example/"
And the second entry has position=2, name="Threads", item="https://host.example/threads"
And no visual breadcrumb component is rendered (UI is page-template responsibility)
```

- **Vitest Unit Test:** `packages/cyan/src/layouts/app-shell.test.ts`

#### Scenario: noSharing=true suppresses social tags, JSON-LD, and emits robots noindex

```gherkin
Given a host page passes title, description, image, jsonLd, and noSharing=true
When the page is rendered
Then <meta name="robots" content="noindex, nofollow"> is emitted
And <title>, canonical, and description tags are emitted normally
And <meta property="og:*"> tags are NOT emitted
And <meta name="twitter:*"> tags are NOT emitted
And <script type="application/ld+json"> is NOT emitted (regardless of jsonLd input)
```

- **Vitest Unit Test:** `packages/cyan/src/layouts/app-shell.test.ts`

#### Scenario: editor layout renders origin-only canonical

```gherkin
Given AppShell is rendered with layout="editor" at URL https://host.example/threads/abc/edit and jsonLd is supplied
When the page is rendered
Then <link rel="canonical" href="https://host.example/"> is emitted (origin only, no path)
And <meta name="robots" content="noindex, nofollow"> is emitted
And <meta property="og:*"> tags are NOT emitted
And <meta name="twitter:*"> tags are NOT emitted
And <script type="application/ld+json"> is NOT emitted (regardless of jsonLd input)
```

- **Vitest Unit Test:** `packages/cyan/src/layouts/app-shell.test.ts`

#### Scenario: modal layout forces noSharing semantics

```gherkin
Given AppShell is rendered with layout="modal", noSharing=false, and jsonLd is supplied
When the page is rendered
Then <meta name="robots" content="noindex, nofollow"> is emitted
And <meta property="og:*"> tags are NOT emitted
And <meta name="twitter:*"> tags are NOT emitted
And <script type="application/ld+json"> is NOT emitted (regardless of jsonLd input)
```

- **Vitest Unit Test:** `packages/cyan/src/layouts/app-shell.test.ts`

#### Scenario: relative image URL is resolved to absolute

```gherkin
Given AppShell is rendered with image="/uploads/poster.jpg" at origin https://host.example
When the page is rendered
Then <meta property="og:image" content="https://host.example/uploads/poster.jpg"> is emitted
```

- **Vitest Unit Test:** `packages/cyan/src/layouts/app-shell.test.ts`

#### Scenario: thread detail page populates description from markdown snippet

```gherkin
Given a thread document at stream/{key} with non-empty markdownContent
When an anonymous user GETs /threads/{key}
Then the rendered <head> contains <meta name="description"> with a plain-text snippet ≤ 160 characters
And the snippet contains no markdown syntax characters (#, *, _, [, ], `, etc.)
And the snippet does not contain HTML tags
```

- **Playwright E2E:** `app/pelilauta/e2e/thread-detail.spec.ts` (extend existing spec — covers #16's deferred SEO criterion)

## Out of scope

The following surfaces share `<head>` real estate with SEO metadata in v17 but are independent concerns and belong in their own specs:

- **PWA chrome:** `<link rel="manifest">`, `<meta name="theme-color">`, `<meta name="apple-mobile-web-app-*">`, `<link rel="icon">` and favicon entries. These are app-shell concerns about installability and platform integration, not search/sharing. Spec when v20's PWA story lands.
- **Client-side telemetry / observability:** `<script>` blocks loading Sentry, IDB error handlers, SimpleAnalytics. v17 puts these in `BaseHead.astro` for convenience; v20 should isolate them in a host-level component or middleware so they aren't entangled with structural layout. Out of scope here.
- **Astro view transitions:** `<ClientRouter />` from `astro:transitions` lives in v17 `BaseHead.astro` but is a separate progressive-enhancement decision; treat as host-level.
- **Service worker registration:** v17 includes a `<ServiceWorker />` component inside `BaseHead.astro`. Belongs to PWA spec.
- **Locale on `<html>` tag:** v17 hardcodes `lang="fi"` (and `lang="en"` in `PageWithTray.astro`, inconsistently). v20 should resolve this from the user's locale or a single host-supplied prop. Specced separately under i18n if not already covered.
- **Article sub-tags (`article:published_time`, `article:author`):** v20 supports `og:type=article` (Stage-3 prop), but the article-specific OG sub-tags are not emitted by this spec. Hosts that want them must wait for a follow-up spec or supply them via the JSON-LD path (Schema.org `Article` covers the same fields with broader compatibility).

## Migration notes (v17 → v20)

Findings worth surfacing to the user before locking the v20 contract:

- **v17 emitted a generic site-level description on every page that didn't supply one.** v17's `BaseHead.astro` falls back to `t('app:meta.description')`, producing the same boilerplate description across thousands of pages. v20 moves this decision out of the DS surface entirely: `description` is a required prop on AppShell, and AppShell holds no i18n. Hosts that don't have per-page text MUST resolve their own fallback (a generated snippet, a localized site-level default like `t('app:meta.description')`, or a deliberate per-route string) and pass it in. Modern SEO practice is to avoid duplicate boilerplate (Google says boilerplate descriptions hurt more than help) — that is now a host-policy concern, not a DS contract.
- **Editor canonical is intentionally broken.** The pattern of canonical pointing to `Astro.url.origin` (not the full URL) is a deliberate anti-indexing belt-and-braces signal. It is **not** a v17 bug. Document this in the v20 spec so it's not "fixed" by a future engineer.
- **v17 hardcodes `og:type="website"` for all pages.** v20 lifts this to a per-page prop (`ogType`) in Stage 3. Article sub-tags (`article:published_time` / `article:author`) remain out of scope — Schema.org `Article` JSON-LD is the recommended path for that data and covers the same fields with better validator support.
- **`apple-mobile-web-app-title="Pelilauta 16"` is version-stamped.** Replace with a host-supplied app name prop or pull from a single source so it doesn't drift across versions.
- **Typo in `EditorHead.astro` line 18:** `t('app:meta..editor.title')` (double dot). Resolves to a missing key and silently uses the raw key string. Fix when porting.
- **`noSharing` is opt-out only.** v17's design treats indexing as the default and lets pages opt out. This is correct for a public RPG community platform but worth confirming in v20's spec — flipping the default to "private until proven public" would be a significant policy change.
- **Twitter Card tags still use the `twitter:` prefix.** Despite Twitter's rebrand to X, X's crawler still parses the legacy `twitter:` tags. Keep them; no migration action needed.
- **Deprecated tokens / dependencies in v17 head:** `@11thdeg/cyan-css` and `@11thdeg/cyan-lit` imports — not relevant to the SEO contract but worth flagging that the v17 BaseHead bundles these alongside SEO tags. The v20 implementation should NOT re-import either; the new `--cn-*` token system + Svelte components replace them.
- **Plain-text snippet helper centralization is resolved.** v17's `createPlainSnippet` (regex-based markdown stripper) is renamed to `markdownToPlainText` for v20 to parallel `markdownToHTML`, and lives in `packages/utils/src/markdownToPlainText.ts`. Specced at [`specs/pelilauta/markdown/markdown-to-plain-text/spec.md`](../../../pelilauta/markdown/markdown-to-plain-text/spec.md). The thread detail page consumes it for SEO; `ThreadCard.svelte` deletes its inline copy and consumes the same helper.

## Provenance

Reverse-engineered from pelilauta-17 source on 2026-04-27:

- `.tmp/pelilauta-17/src/components/server/BaseHead/BaseHead.astro` — public head, full SEO + OG + Twitter contract
- `.tmp/pelilauta-17/src/components/server/BaseHead/EditorHead.astro` — editor head, no-index posture
- `.tmp/pelilauta-17/src/layouts/Page.astro`, `PageWithTray.astro`, `ModalPage.astro`, `EditorPage.astro` — prop forwarding chain
- `.tmp/pelilauta-17/src/utils/snippetHelpers.ts` — `createPlainSnippet` for description derivation
- `.tmp/pelilauta-17/src/pages/threads/[threadKey]/index.astro` — canonical example of `description={createPlainSnippet(thread.markdownContent || '', 160)}` usage
- `.tmp/pelilauta-17/src/pages/sites/[siteKey]/index.astro` — canonical example of `image` cascade (`avatarURL || posterURL || backgroundURL`) and `noSharing={site.hidden}` usage
- `.tmp/pelilauta-17/src/locales/fi/app.ts` — `app:meta.title` / `app:meta.description` localized fallbacks
