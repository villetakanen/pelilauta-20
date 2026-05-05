---
feature: Tag detail page (/tags/[tag])
status: draft
maturity: design
last_major_review: 2026-05-05
parent_spec: ../spec.md
---

# Feature: Tag detail page (`/tags/[tag]`)

> Reverse-spec'd from
> `.tmp/pelilauta-17/src/pages/tags/[tag].astro` and
> `.tmp/pelilauta-17/src/components/server/TagHeader.astro`. v18's
> page does an HTTP self-fetch to its own `/api/tags/[tag].json.ts`
> endpoint and renders a thread-and-page entry list with
> per-row `ProfileLink` islands. v20 MVP drops the entry list
> and the HTTP API surface; the page consumes
> `@pelilauta/tags/server` helpers in-process and renders a
> tag header only. The 404 decision uses a presence-check
> against the same `tags` Firestore collection v18 reads.

## Blueprint

### Context

`/tags/[tag]` is the canonical landing page for any tag in the
platform — both **registered supertags** (the curated registry
shipped by `@pelilauta/tags`: D&D, Pathfinder, L&L, PbtA, Call
of Cthulhu) and **plain tags** (any other slug a user has
applied to a thread, page, or via a site's `system` field). The
page owns:

- The synonym-to-canonical 301 redirect, so URLs resolve to a
  single canonical form.
- The supertag-versus-plain rendering split (rich header vs.
  bare slug heading).
- The 404 decision for plain tags with no content.
- SEO metadata (title, description, cache headers).

This is a **feature**, not a sub-spec of the tags package. It
consumes the package via `@pelilauta/tags/server` and
`@pelilauta/tags/i18n`. The package owns the registry, helpers,
schema, and locale strings; the page owns the route, the
rendering, the redirect, and the HTTP semantics.

The MVP scope is "render the tag header" — no Firestore-backed
entry listing surface. The page fetches presence (yes/no a
matching entry exists) for the 404 decision but does not render
any entry list. Entry-list rendering is a follow-up feature
that will land its own spec when work begins.

The first public consumer of this route is SiteCard's eyebrow
link (per
[`../sites/site-card/spec.md`](../sites/site-card/spec.md)
§Markup contract): `<a href={`/tags/${site.system}`}>`. Any
site's `system` value is either a registered supertag (renders
the rich header) or a plain tag (renders the slug heading if
content exists, or 404s if not).

### Architecture

- **Component:** `app/pelilauta/src/pages/tags/[tag].astro`
  — Astro page, server-rendered. Mounted automatically by
  Astro's filesystem routing.
- **Layout:** [`Page`](../../cyan-ds/layouts/page/spec.md)
  from `@cyan/layouts/Page.astro` — standard non-book page
  shell.
- **Sub-components consumed:**
  - `CnIcon` from `@pelilauta/cyan` — supertag icon prefix
    on the heading.
  - `cn-chip` + `cn-chip-list` utilities from
    [`../../cyan-ds/utilities/chip/spec.md`](../../cyan-ds/utilities/chip/spec.md)
    — synonyms row beneath the supertag header.

- **Data sources** (all resolved in the page's frontmatter):
  - `resolveTagSynonym(input)` from `@pelilauta/tags/server`
    — canonicalizes the URL parameter.
  - `getSupertag(slug)` from `@pelilauta/tags/server` —
    looks up registry metadata for the canonical slug.
  - `hasTaggedEntries(slug)` from `@pelilauta/tags/server`
    — Firestore presence-check, used to make the plain-tag
    404 decision (per
    [`../tags/spec.md`](../tags/spec.md) §Helper Surfaces).
  - The host-bound `t` from `app/pelilauta/src/i18n.ts` for
    `tags:supertag.{slug}.displayName` and
    `tags:supertag.{slug}.description` (per
    [`../tags/i18n/spec.md`](../tags/i18n/spec.md)) plus
    `pelilauta:tag.synonymsLabel` (host-owned, NEW key
    introduced by this feature for the synonyms-row
    overline).

- **Routing logic** (in order):
  1. Read `Astro.params.tag` (raw URL-encoded slug).
  2. Compute `canonical = resolveTagSynonym(tag)`. The helper
     lowercases internally; the comparison below uses the
     lowercased input.
  3. If `canonical !== tag.toLowerCase()` → return
     `Astro.redirect(`/tags/${canonical}`, 301)`. This is the
     synonym-canonicalization redirect.
  4. `supertag = getSupertag(canonical)` — `SupertagEntry | null`.
  5. `hasEntries = await hasTaggedEntries(canonical)` —
     boolean. Errors propagate (see §Constraints).
  6. **Decision:**
     - `supertag` is non-null → 200, render supertag header.
     - `supertag` is null && `hasEntries` is true → 200,
       render plain-tag heading (`#{slug}`).
     - `supertag` is null && `hasEntries` is false → 404
       (let Astro return its 404 page; no custom 404 markup
       at MVP).

- **Rendering** (when 200):
  - **Supertag header:** `<h1>` with leading
    `<CnIcon noun={supertag.icon} />` + the localized
    `displayName` (from `tags:supertag.{canonical}.displayName`).
    Optional `<p>` description below the heading (from
    `tags:supertag.{canonical}.description` when present in
    the active locale; omit the paragraph when the engine
    returns the missing-key sentinel — per
    [`../tags/i18n/spec.md`](../tags/i18n/spec.md)
    §Convention sub-trees, EN descriptions are absent at MVP
    and the consumer falls back to "render no description").
    Optional synonyms row when `supertag.synonyms.length > 0`:
    `<p class="text-caption">{t('pelilauta:tag.synonymsLabel', { count })}</p>`
    followed by `<div class="cn-chip-list">` containing one
    `<span class="cn-chip">#{syn}</span>` per synonym.
  - **Plain-tag heading:** `<h1>#{slug}</h1>` and nothing
    else. No icon, no description, no synonyms row.

- **SEO:**
  - **Page title:** `#{displayName}` (just the heading text,
    using the localized supertag displayName for registered
    slugs, the raw slug for plain tags). The host's `Page`
    layout MAY add a site-suffix; the page itself stops at
    `#{displayName}`.
  - **Meta description:** the localized supertag description
    when present in the active locale; nothing when absent.
    Plain tags ship no meta description at MVP.

- **Cache headers** (set on successful 200 renders):
  - `Cache-Control: public, max-age=300, s-maxage=600, stale-while-revalidate=1800`.
  - 404 path: no `Cache-Control` (Astro default short cache).
  - 500 path: no `Cache-Control` (Astro default short cache).
    Edge-cached prior responses absorb transient Firestore
    outages via `stale-while-revalidate`.

#### Constraints

- **SSR-only and cache-shareable.** Anonymous and
  authenticated requests render byte-identical HTML for the
  same canonical URL — the page does not vary by viewer
  identity. No `client:*` directive is emitted at any path.
- **Reads in-process.** Helpers from `@pelilauta/tags/server`
  are imported and called directly. No
  `fetch(${Astro.url.origin}/api/tags...)` call. v18's HTTP
  API at `/api/tags/[tag].json.ts` does NOT carry forward.
- **No graceful 200 on Firestore errors.** When
  `hasTaggedEntries` throws, the throw propagates to the
  Astro page handler and the page returns 500 (not a
  graceful 200 with empty content). Edge cache absorbs
  transient outages via the stale-while-revalidate window
  set on prior successful 200s.
- **Apps never override the DS.** No `<style>` block, no
  inline `style="..."`, no app-local utility classes
  (`flex flex-wrap`, `text-h2`, `mb-2 pb-2 border-b`, etc.).
  Layout, typography, and chip rendering compose cyan
  primitives only.
- **Doc-ID materialization rule applies if a future
  list-fetch lands.** Per
  [`../../../ARCHITECTURE.md`](../../../ARCHITECTURE.md)
  §Doc-ID materialization, any tag-doc reader uses
  `TagSchema.parse({ ...doc.data(), key: doc.id })`. The MVP
  presence-check doesn't parse, but the rule is documented
  here so the entry-list follow-up obeys it.
- **Synonym redirect is permanent.** The 301 status code
  matches v18's behavior and is correct: canonical slugs are
  stable URLs, synonyms are aliases. No 302 (temporary)
  semantics.

### Dependencies

- `@pelilauta/tags/server` — `resolveTagSynonym`,
  `getSupertag`, `hasTaggedEntries`, types.
- `@pelilauta/tags/i18n` — supertag displayName / description
  keys, consumed via the host-bound `t`.
- `@pelilauta/cyan` — `Page` layout, `CnIcon` component, the
  chip utilities (`cn-chip`, `cn-chip-list`).
- `@pelilauta/i18n` — used only via the host's `t` binding;
  no direct import.

### Consumers

- SiteCard eyebrow (per
  [`../sites/site-card/spec.md`](../sites/site-card/spec.md)
  §Markup contract) — `<a href={`/tags/${site.system}`}>`.
- `FeaturedTags` front-page widget (per
  [`../front-page/featured-tags/spec.md`](../front-page/featured-tags/spec.md),
  TBD) — chip row routing each chip to
  `/tags/{canonicalTag}`.
- Any future surface that links to a tag detail page.

## Contract

### Definition of Done

- [ ] `app/pelilauta/src/pages/tags/[tag].astro` exists at the
      path above and is registered by Astro's filesystem
      routing.
- [ ] The frontmatter calls `resolveTagSynonym` and issues a
      `Astro.redirect(canonical, 301)` when the input differs
      from the canonical (case-normalized comparison).
- [ ] The frontmatter calls `getSupertag(canonical)` and
      `hasTaggedEntries(canonical)` and applies the §Routing
      logic decision table.
- [ ] Supertag render emits an `<h1>` containing
      `<CnIcon noun={supertag.icon}>` + the localized
      `displayName`. Supertag with description renders an
      additional `<p>` below the heading. Supertag with
      synonyms emits a `<p>` overline (label from
      `pelilauta:tag.synonymsLabel`) followed by a
      `<div class="cn-chip-list">` of `<span class="cn-chip">`
      children, one per synonym.
- [ ] Plain-tag render emits an `<h1>#{slug}</h1>` and
      nothing else.
- [ ] Plain tag with no entries returns a 404 (Astro's
      default 404 page; no custom markup at MVP).
- [ ] `hasTaggedEntries` errors propagate to a 500 response
      (no graceful 200 fallback).
- [ ] Successful 200 responses set
      `Cache-Control: public, max-age=300, s-maxage=600, stale-while-revalidate=1800`.
- [ ] No `client:*` directive appears anywhere in the
      rendered HTML, on any code path.
- [ ] No `<style>` block, no inline `style="..."`, no
      app-local utility classes anywhere in the page.
- [ ] No `fetch(${Astro.url.origin}/api/tags...)` call. The
      page reads in-process via `@pelilauta/tags/server`.
- [ ] The host's i18n module gains a
      `pelilauta:tag.synonymsLabel` key (FI + EN) supporting
      `{count}` substitution.
- [ ] The page renders byte-identical HTML for two requests
      to the same canonical URL regardless of session state.

### Regression Guardrails

- **Synonym redirect MUST be 301 (permanent).** A 302
  (temporary) redirect undermines the canonical-URL contract
  for SEO and bookmarking.
- **Plain tag without content MUST 404.** Returning 200 with
  an empty page lies about content presence and pollutes
  search-engine indexes with empty pages.
- **Firestore errors MUST propagate as 500.** Wrapping the
  reader call in a try/catch that returns a graceful 200
  defeats the edge-cache stale-while-revalidate strategy and
  leaves the consumer with no signal that data is stale.
- **No HTTP self-fetch.** Reintroducing
  `fetch(${Astro.url.origin}/api/tags...)` is a regression
  against the in-process-read rule established for sites and
  threads.
- **No `client:*` directive.** The page is anonymous-friendly
  and SSR-only by design; introducing CSR widgets is a
  regression against the cache-shareability contract.
- **No app-local utility classes.** v18 used `flex flex-wrap`,
  `text-h2`, `mb-2 pb-2 border-b`, `text-low` and inline
  `style="..."` attributes throughout the page. None of those
  exist in v20 cyan; reintroducing them at the app layer is
  a regression against the apps-never-override-DS rule.

### Testing Scenarios

#### Scenario: Synonym URL redirects to canonical with 301

```gherkin
Given a request to /tags/dnd (a known synonym for the D&D supertag)
When the page is rendered
Then the response status is 301
And the Location header is /tags/d%26d (the canonical slug, URL-encoded)
And no body content is rendered
```

#### Scenario: Canonical supertag URL renders the rich header

```gherkin
Given a request to /tags/pathfinder (the canonical slug for the Pathfinder supertag)
And the active locale is fi
When the page is rendered
Then the response status is 200
And the rendered HTML contains an <h1> with a <CnIcon noun="compass"> child
And the <h1> contains the localized displayName "Pathfinder"
And a <p> below the heading contains the localized FI description
And a synonyms row renders with one <span class="cn-chip"> per synonym
  (#pathfinder 2e, #pf2e, #pf, #päffä, ...)
And the response carries Cache-Control: public, max-age=300, s-maxage=600,
  stale-while-revalidate=1800
```

#### Scenario: Plain tag with content renders the bare-slug heading

```gherkin
Given a request to /tags/homebrew (a slug NOT in the supertag registry)
And at least one document in the tags collection has 'homebrew' in its tags array
When the page is rendered
Then the response status is 200
And the rendered HTML contains an <h1>#homebrew</h1>
And no <CnIcon> appears in the heading
And no description paragraph renders
And no synonyms row renders
And the response carries the success Cache-Control header
```

#### Scenario: Plain tag with no content returns 404

```gherkin
Given a request to /tags/made-up-game-name (a slug NOT in the supertag registry)
And no document in the tags collection has 'made-up-game-name' in its tags array
When the page is rendered
Then the response status is 404
And no Cache-Control header is set by this page (Astro defaults apply)
```

#### Scenario: Firestore error propagates as 500

```gherkin
Given a request to /tags/pathfinder
And the tags collection query throws a Firestore error
When the page is rendered
Then the response status is 500
And no Cache-Control header is set by this page (Astro defaults apply)
And the supertag header is NOT rendered (despite the supertag existing in the
  in-process registry — the page does not partial-render around the failure)
```

#### Scenario: Anonymous render is byte-identical across viewers

```gherkin
Given two requests to /tags/pathfinder, one with no session cookie and one with
  a session cookie for an authenticated user
When each page is rendered
Then the SSR HTML is byte-identical between the two responses
And neither response contains a client:* directive
And the response is shareable across all viewers in either cohort
```

#### Scenario: Supertag with no description in active locale omits the paragraph

```gherkin
Given a request to /tags/d%26d (the canonical D&D slug)
And the active locale is en
And the en tree's tags:supertag.d%26d.description key is absent (per
  ../tags/i18n/spec.md §Convention sub-trees — EN descriptions are deferred)
When the page is rendered
Then the response status is 200
And the supertag header (icon + displayName + synonyms row) renders
And no description <p> renders below the heading
And the engine's missing-key sentinel does NOT leak into the rendered output
```

## Migration Debt and Decisions

### v18 patterns that do not carry forward

1. **HTTP self-fetch in `[tag].astro`.** v18's frontmatter
   does `fetch(${origin}/api/tags/${canonicalTag}.json)` to
   load entries. v20 reads in-process via
   `@pelilauta/tags/server` helpers. The HTTP endpoint
   itself doesn't carry forward (per
   [`../tags/spec.md`](../tags/spec.md) §Migration Debt).
2. **Entry-list rendering on the tag page.** v18 renders a
   threads section and a pages section, with per-row
   `<ProfileLink uid client:only="svelte" />` islands. v20
   MVP does not render entries; the surface lands as a
   follow-up feature. The MVP page only checks presence to
   make the 404 decision.
3. **`TagHeader.astro` separate component.** v18 extracts a
   `TagHeader` Astro component that renders icon +
   displayName + description + synonyms. v20 MVP inlines the
   header into the page since the entry-list rendering that
   justified the separate component is out of scope. If a
   future tag-cloud or summary surface wants the same header
   shape, it'll get promoted into a domain component then
   (most likely under `packages/tags/src/components/`).
4. **App-local utility classes throughout.** v18's page +
   header use `flex flex-wrap`, `flex items-center`,
   `text-h2`, `text-title`, `text-low`, `mb-2 pb-2 border-b`,
   `cn-chip flex-none`, `column-l`, `content-columns`,
   inline `style="margin-bottom: ..."`, and inline
   `style="flex: 1"` attributes. None exist in v20 cyan; v20
   composes DS primitives only.
5. **Inline `style="..."` attributes.** v18 leaks several
   inline style attributes for layout (`margin-bottom`,
   `flex: 1`). v20 ships none of these — layout comes from
   DS-supplied primitives.
6. **`Cache-Tag` header.** v18 sets
   `Cache-Tag: tag-${canonical},public-tags` for selective
   CDN purging. v20 MVP omits this — it's a deployment-side
   concern that lands when CDN purge wiring is built. The
   functional `Cache-Control` header carries forward.
7. **`seo:tag.fallback` host i18n key.** v18 uses
   `t('seo:tag.fallback', { tag: displayName })` for the
   plain-tag meta description. v20 MVP ships no plain-tag
   meta description — the page sets no `<meta name="description">`
   for plain tags, the host layout's defaults apply.
8. **404 redirect via `Astro.redirect('/404')`.** v18
   redirects unknown slugs to a custom `/404` route. v20
   returns a 404 status code directly and lets Astro's
   default 404 page render — no manual redirect.

### Decisions resolved

1. **Page is a feature, not a sub-spec of the tags
   package.** The package owns data and helpers; this page
   owns the route, the rendering, the redirect, the 404
   decision, and the SEO surface.
2. **MVP scope is "render the tag header"** — no
   entry-list. Future entry-list rendering lands as a
   follow-up feature with its own spec.
3. **Plain tag without content → 404.** Carries forward the
   v18 HTTP semantic (URL doesn't point at anything when
   neither metadata nor content exists).
4. **Synonym redirect is 301.** Permanent canonical-URL
   contract.
5. **Firestore errors propagate to 500.** No graceful 200
   fallback. Edge-cache `stale-while-revalidate` absorbs
   transient outages.
6. **Synonyms chips at MVP.** The new
   [`cn-chip` + `cn-chip-list`](../../cyan-ds/utilities/chip/spec.md)
   utilities make this trivial; surfaces "you can also reach
   this page via these other slugs" as a real UX feature.
7. **Header inlined in the page.** Separate `TagHeader`
   component is premature — the v20 MVP page is small enough
   and there's no second consumer for the header shape yet.
8. **`pelilauta:tag.synonymsLabel` is host-owned** (page
   chrome), not in the tags i18n surface (which holds only
   per-supertag data: displayName + description).

### Source provenance

- v18 page: `.tmp/pelilauta-17/src/pages/tags/[tag].astro`
- v18 header component:
  `.tmp/pelilauta-17/src/components/server/TagHeader.astro`
- v18 API route (NOT carried forward; no MVP consumer):
  `.tmp/pelilauta-17/src/pages/api/tags/[tag].json.ts`
- v20 helpers consumed:
  `packages/tags/src/api/hasTaggedEntries.ts`,
  `packages/tags/src/helpers/resolveTagSynonym.ts`,
  `packages/tags/src/helpers/getSupertag.ts`.
- v20 i18n keys consumed:
  `tags:supertag.{slug}.displayName`,
  `tags:supertag.{slug}.description` (per
  [`../tags/i18n/spec.md`](../tags/i18n/spec.md)),
  plus `pelilauta:tag.synonymsLabel` (NEW, host-owned).
- v20 DS primitives consumed:
  `Page` layout, `CnIcon`, `cn-chip`, `cn-chip-list`.
