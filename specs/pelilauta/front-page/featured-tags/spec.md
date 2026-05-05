---
feature: Featured Tags
status: draft
maturity: design
last_major_review: 2026-05-05
parent_spec: ../spec.md
---

# Feature: Featured Tags

## Blueprint

### Context

A small front-page section surfacing the curated supertag set
(D&D, Pathfinder, Legendoja & lohikäärmeitä, PbtA, Call of
Cthulhu) as a chip row. Click-through routes to
`/tags/{canonical}` per the
[`../../tag-page/spec.md`](../../tag-page/spec.md) feature.

The widget is a static SSR section — no Firestore reads, no
per-viewer state. Contents are derived entirely from the
in-process supertag registry shipped by `@pelilauta/tags/server`
plus localized labels from `@pelilauta/tags/i18n`.

### Architecture

- **Component:**
  `app/pelilauta/src/components/front-page/FeaturedTags.astro`
  — Astro, server-rendered. Mirrors `TopSitesStream.astro` and
  `SyndicateStream.astro` shape: thin frontmatter that prepares
  data, then SSR markup composing cyan primitives.

- **Mount point:**
  `app/pelilauta/src/pages/index.astro`, inside a wrapper element
  that's the 3rd direct child of `cn-content-triad`. The wrapper
  groups `<TopSitesStream />` + `<hr />` + `<FeaturedTags />` as
  a single content-discovery cluster in the tertiary small
  column. The `<hr />` is a styled cyan default per
  `packages/cyan/src/core/dividers.css` — no app-local class.

  Resulting tertiary column structure:
  ```
  <div>                  ← wrapper, no class
    <TopSitesStream />   ← latest sites + show-more link
    <hr />               ← cyan-styled separator
    <FeaturedTags />     ← this widget
  </div>
  ```

- **Data sources** (resolved in the Astro frontmatter):
  - `SUPERTAGS` from `@pelilauta/tags/server` — frozen 5-entry
    registry. Iterated in registry order (currently D&D,
    Pathfinder, L&L, PbtA, CoC).
  - The host-bound `t` from `app/pelilauta/src/i18n.ts` for
    each chip's localized `displayName` via
    `tags:supertag.{canonicalTag}.displayName` (per
    [`../../tags/i18n/spec.md`](../../tags/i18n/spec.md)).

- **i18n:**
  - **Host-owned** — `pelilauta:featuredTags.title` for the
    section heading. New key introduced by this feature.
  - **Tags-package-owned** — `tags:supertag.{slug}.displayName`
    per chip. Already shipped per the i18n sub-spec.

- **Rendering markup:**
  ```astro
  <section>
    <h2 class="text-h3">{t('pelilauta:featuredTags.title')}</h2>
    <div class="cn-chip-list">
      {SUPERTAGS.map((supertag) => (
        <a class="cn-chip" href={`/tags/${encodeURI(supertag.canonicalTag)}`}>
          <CnIcon noun={supertag.icon} size="xsmall" />
          <span>{t(`tags:supertag.${supertag.canonicalTag}.displayName`)}</span>
        </a>
      ))}
    </div>
  </section>
  ```

  - `<section>` wraps the heading + chip row.
  - `<h2 class="text-h3">` for the heading — semantic `<h2>`
    keeps the page outline correct (sibling heading to
    TopSitesStream's `<h2>` and TopThreadsStream's), with the
    `.text-h3` cyan typography utility from
    `packages/cyan/src/tokens/typography-semantics.css`
    visually downscaling to h3 sizing. The widget is a small
    sub-section underneath TopSitesStream within the same
    column; matching TopSitesStream's heading visual would
    over-emphasize this row.
  - `<div class="cn-chip-list">` from
    [`../../../cyan-ds/utilities/chip/spec.md`](../../../cyan-ds/utilities/chip/spec.md)
    — flex-wrap row with `var(--cn-grid)` gap.
  - Each chip is `<a class="cn-chip">` (link variant) with
    leading icon + label. Click target uses `encodeURI` per
    [`../../../ARCHITECTURE.md`](../../../ARCHITECTURE.md)
    §URL routing and redirect encoding.
  - Icon: `<CnIcon noun={icon} size="xsmall" />` — matches v18
    FeaturedTags's icon size and the chip's compact typography.

- **Constraints:**
  - **SSR-only.** No `client:*` directive on any element. The
    widget is anonymous-friendly and cache-shareable; it ships
    no per-viewer state.
  - **No Firestore reads.** The supertag registry is in-process
    data; no async work in the frontmatter.
  - **No app-local utility classes.** No `<style>` block, no
    inline `style="..."`, no `flex`-style class lists. Layout
    composes `cn-chip-list` and chip primitives only.
  - **`encodeURI` on the chip href.** Per ARCHITECTURE.md
    §URL routing and redirect encoding — handles non-ASCII in
    canonicals (e.g. `legendoja & lohikäärmeitä`) by emitting
    UTF-8 percent-encoded URLs.
  - **Static registry order.** The widget renders supertags in
    the registry's declared order. No alphabetization, no
    locale-specific ordering at MVP.
  - **No description text.** v18's FeaturedTags had a
    description paragraph below the heading. v20 MVP drops it
    — the heading + chip row carry enough context. (Spec note:
    if SEO or onboarding flow later wants the description, it
    can return as a follow-up.)

### Dependencies

- `@pelilauta/tags/server` — `SUPERTAGS`, `SupertagEntry` type.
- `@pelilauta/tags/i18n` — supertag display-name keys, consumed
  via the host's `t`.
- `@pelilauta/cyan/components` — `CnIcon`.
- `@pelilauta/cyan` chip utilities — `cn-chip` + `cn-chip-list`
  (already global via `packages/cyan/src/utilities/index.css`).
- `app/pelilauta/src/i18n.ts` — host-bound `t` plus the new
  `pelilauta:featuredTags.title` key.

### Consumers

- `app/pelilauta/src/pages/index.astro` (front page) — mounted
  in the tertiary column as described above.

### v18 patterns that do not carry forward

1. **Hardcoded list of 4 entries.** v18's
   `FrontPage/FeaturedTags.astro` declares its own
   `featuredTags` array at the top of the frontmatter — a
   divergent subset of `TAG_SYNONYMS` (omits CoC, mismatched
   icon nouns: `dd5` instead of `d20`, `pathfinder` instead of
   `compass`, `pbta-logo` instead of `books`). v20 reads from
   the registry — single source of truth, all 5 entries, icon
   nouns from the registry data file.
2. **Description paragraph below the heading.** v18 renders
   `t('frontPage:featuredTags.description')` as a `<p>`. v20
   MVP drops it (per §Constraints). The host i18n key is not
   carried forward.
3. **App-local utility classes.** v18 uses
   `mt-2 pt-2 border-t`, `text-h5`, `text-caption`,
   `flex flex-wrap`, `cn-chip flex-none`. v20 uses cyan
   primitives only — `<h2>` for the heading (default
   typography), `cn-chip-list` for the row, `cn-chip` for each
   chip. The `border-t` separator is replaced by the parent's
   `<hr />` per the new mount-point structure.
4. **`encodeURI` on the chip slug.** v18 uses
   `encodeURIComponent(item.tag)` for the href. v20 uses
   `encodeURI` (the canonical is already decoded; `encodeURI`
   handles non-ASCII without over-encoding reserved characters
   in path segments). Per
   [`../../../ARCHITECTURE.md`](../../../ARCHITECTURE.md)
   §URL routing and redirect encoding.

## Contract

### Definition of Done

- [ ] `app/pelilauta/src/components/front-page/FeaturedTags.astro`
      exists and is mounted in `app/pelilauta/src/pages/index.astro`'s
      tertiary column wrapper, after `<TopSitesStream />` and
      a `<hr />` separator.
- [ ] The frontmatter imports `SUPERTAGS` from
      `@pelilauta/tags/server` and the host-bound `t`.
- [ ] The body renders a `<section>` containing a
      `<h2 class="text-h3">` with the value of
      `t('pelilauta:featuredTags.title')` and a
      `<div class="cn-chip-list">` with one
      `<a class="cn-chip">` per supertag, in registry order.
      The `.text-h3` utility scales the semantic h2 down to h3
      typography per cyan's typography-semantics rules.
- [ ] Each chip's `href` is
      `` `/tags/${encodeURI(supertag.canonicalTag)}` ``.
- [ ] Each chip contains a `<CnIcon noun={supertag.icon} size="xsmall" />`
      followed by a `<span>` with the localized displayName.
- [ ] The host i18n module exports
      `pelilauta:featuredTags.title` in both `fi` and `en`
      trees.
- [ ] The widget contains no `client:*` directive.
- [ ] The widget contains no `<style>` block, no inline
      `style="..."`, no app-local utility classes.
- [ ] The widget makes no Firestore call (no `firebase` import,
      no `await db...`).

### Regression Guardrails

- **Source of truth is the registry.** Reintroducing a
  hardcoded list inside the widget is a regression — v18's
  divergence between FeaturedTags and TAG_SYNONYMS is the
  exact failure mode the registry-as-source rule prevents.
- **`encodeURI`, not `encodeURIComponent`.** The chip href
  must use `encodeURI` to leave `&` literal in path segments
  and emit UTF-8 percent-encoded non-ASCII.
- **No `client:*` directive.** The widget is SSR-only by
  design; introducing CSR would defeat the cache-shareability
  contract per the parent front-page spec.
- **`<hr />` lives in the consumer (the page), not the
  widget.** FeaturedTags must render its `<section>` standalone
  — it doesn't assume a preceding sibling.

### Testing Scenarios

#### Scenario: Renders all 5 supertags as chips in registry order

```gherkin
Given the supertag registry contains 5 entries (D&D, Pathfinder, L&L, PbtA, CoC)
When the front page is rendered
Then the FeaturedTags section contains exactly 5 <a class="cn-chip"> elements
And the chips appear in the registry's declared order
And each chip's href starts with /tags/
```

#### Scenario: Chip href uses encodeURI on the canonical

```gherkin
Given the L&L supertag with canonicalTag "legendoja & lohikäärmeitä"
When the FeaturedTags widget renders the L&L chip
Then the chip's href is "/tags/legendoja%20&%20lohik%C3%A4%C3%A4rmeit%C3%A4"
And the URL encoding uses UTF-8 (not Latin-1) for non-ASCII characters
And `&` is left literal (not encoded to %26)
```

#### Scenario: Chip displays localized displayName + icon

```gherkin
Given the active locale is fi
When the FeaturedTags widget renders the D&D chip
Then the chip contains a <CnIcon> element with noun="d20"
And the chip's text content includes the localized displayName "D&D"
```

#### Scenario: Widget emits no client:* directive

```gherkin
Given a request to the front page (anonymous or authenticated)
When the FeaturedTags subtree of the rendered HTML is inspected
Then no client:* directive appears in any element of the FeaturedTags subtree
```

#### Scenario: Widget renders byte-identical content across viewers

```gherkin
Given two requests to the front page, one anonymous and one authenticated
When each page is rendered
Then the FeaturedTags subtree of the rendered HTML is byte-identical between
  the two responses
And the FeaturedTags content is shareable across all viewers regardless of
  auth state (per the parent front-page cache contract)
```

## Resolved decisions

1. **Heading text** for `pelilauta:featuredTags.title` —
   FI: `Tunnisteet`, EN: `Tags`. Brevity matches the chip
   row's compact framing.
2. **Wrapper element type for the tertiary column** — plain
   `<div>`, no class. The three triad lanes are equal-rank
   primary content of different visual weights; `<aside>`
   would imply ARIA-supplementary semantics that don't match
   the design.
3. **Sort order** — registry order (D&D, Pathfinder, L&L,
   PbtA, CoC). Deterministic and editor-controlled. Future
   reordering is a registry-data change.
4. **Chip icon size** — `xsmall`. Matches the chip's compact
   typography and the v18 carry-forward.
5. **`<hr />` placement** — owned by the consumer (the
   wrapper in `index.astro`). FeaturedTags renders its
   `<section>` standalone; the hr is the page-level layout
   concern.
