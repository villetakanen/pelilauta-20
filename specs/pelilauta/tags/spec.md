---
feature: Tags (Tag Vertical)
status: draft
maturity: design
last_major_review: 2026-05-05
parent_spec: ../spec.md
---

# Feature: Tags (Tag Vertical)

> Reverse-spec'd from `.tmp/pelilauta-17/src/schemas/TagSchema.ts`,
> `.tmp/pelilauta-17/src/schemas/TagSynonyms.ts`,
> `.tmp/pelilauta-17/src/components/server/FrontPage/FeaturedTags.astro`,
> and `.tmp/pelilauta-17/src/pages/tags/[tag].astro`. (The folder
> name is `pelilauta-17/` for legacy reasons; the checked-out source
> is `pelilauta@18.13.3`.) v18's `/api/tags/[tag].json.ts` HTTP
> route is deliberately not carried forward — see §Authoring DoD
> for when an HTTP surface might re-enter scope.

## Blueprint

### Context

The Tags package owns the entire "tags vertical" of Pelilauta —
schema, the curated supertag registry, lookup helpers, locale
strings for supertag labels and descriptions, and the consumer
surfaces (front-page `FeaturedTags` widget and the `/tags/[tag]`
route page). Tags are string slugs attached to entries (threads
or pages); the platform recognises two kinds:

- **Supertags** — entries in the curated registry shipped with
  the package. Each has a canonical slug, a localized
  `displayName`, an optional localized `description`, an icon
  noun, and a list of synonyms (alternative slugs that
  canonicalize to this entry — for example `päffä`, `pf2e`,
  `pf` all canonicalize to the `pathfinder` supertag).
- **Plain tags** — freeform user-applied strings outside the
  registry. Display as raw slug everywhere. No localization, no
  synonym resolution, no icon, no description.

Two surfaces consume the package today: the front-page
`FeaturedTags` widget (chip row of supertags) and the per-tag
detail page at `/tags/[tag]`. The site card's eyebrow link
(`/tags/{site.system}` per
[`../sites/site-card/spec.md`](../sites/site-card/spec.md)) is
also a consumer of the tag-page route — it's why the tag page
needs to handle both registered supertag slugs and plain slugs
gracefully.

The MVP scope of this spec covers:

1. The package shell (workspace package, three sub-exports).
2. The `TagSchema` (per-entry tag-index doc, v17 contract
   preserved verbatim).
3. The `SupertagSchema` (registry-entry shape, renamed from
   v17's `TagSynonymSchema`).
4. The supertag registry (5 entries: D&D, Pathfinder,
   Legendoja & lohikäärmeitä, PbtA, Call of Cthulhu).
5. Two pure lookup helpers: `resolveTagSynonym(input)` and
   `getSupertag(slug)`.
6. The i18n surface as a separate sub-spec
   ([`./i18n/spec.md`](./i18n/spec.md)) — supertag labels and
   descriptions live there, not in the registry data file.

The `/tags/[tag]` per-tag detail page, the `FeaturedTags`
front-page widget, the Firestore-backed entry listing for tag
pages, the synonym redirect (HTTP 301), and any tag-authoring
surfaces (write APIs, registry editor) are out of scope for the
MVP and listed as TBD sub-specs below.

### Architecture

- **Package:** `packages/tags/` — workspace package
  `@pelilauta/tags`, picked up by `pnpm-workspace.yaml`.

- **Firestore storage** (v17 contract preserved verbatim — no
  breaking data changes):
  - `tags/{...}` — per-entry tag-index documents. Path constant
    `TAG_FIRESTORE_COLLECTION = 'tags'` carries forward from
    `.tmp/pelilauta-17/src/schemas/TagSchema.ts`.
  - Each doc represents a single tagged entry (a thread or a
    page within a site), not a tag itself. Fields: `title`,
    `type` (`'thread' | 'page'`), `key`, `tags` (string array),
    `author`, `flowTime`. The collection is queryable by
    `where('tags', 'array-contains', X)`.
  - **MVP ships no Firestore reader for this collection.** The
    tag-page route at MVP renders only the supertag header
    (displayName + description). Entry listing is a follow-up
    sub-spec.

- **Supertag registry** (in-process data, not Firestore-backed):
  - `packages/tags/src/data/supertags.ts` exports a frozen array
    of 5 supertag entries.
  - Source of truth for: canonical slug, icon noun, synonyms
    list. The localized `displayName` and `description` are
    NOT in this file — they live in
    [`./i18n/spec.md`](./i18n/spec.md) and are looked up at
    consumption time via `t('tags:supertag.{slug}.displayName')`
    and `t('tags:supertag.{slug}.description')`.
  - Editable only by code change, not at runtime. New supertags
    require a code edit + a matching i18n entry pair.

#### Module Structure

```
packages/tags/
  src/
    schemas/
      TagSchema.ts             → Zod schema for the per-entry tag-index doc
      SupertagSchema.ts        → Zod schema for the registry-entry shape
    data/
      supertags.ts             → Frozen array of supertag entries
    helpers/
      resolveTagSynonym.ts     → Pure function: input slug → canonical slug
      getSupertag.ts           → Pure function: canonical slug → SupertagEntry | null
    server/                    → SSR-safe re-exports (schemas, types, registry, helpers)
    components/                → Reserved for future sub-spec consumers (empty barrel at MVP)
    i18n/
      index.ts                 → Exports fi, en — locale strings for the tags namespace
```

#### Sub-path Exports

| Export path | Contains | Safe for SSR? |
|---|---|---|
| `@pelilauta/tags/server` | Schemas, types, registry, helpers (`resolveTagSynonym`, `getSupertag`) | Yes |
| `@pelilauta/tags/components` | Reserved for future Svelte components (empty barrel at MVP) | Yes (when populated) |
| `@pelilauta/tags/i18n` | `export const fi`, `export const en` — locale strings only, no runtime code | Yes |

#### Schemas

`TagSchema` carries forward verbatim from
`.tmp/pelilauta-17/src/schemas/TagSchema.ts`. v20 delta: none.
The schema documents the per-entry tag-index doc shape; the MVP
does not read these docs but the schema travels with the package
so future readers can parse without introducing the type
elsewhere.

`SupertagSchema` is renamed from v17's `TagSynonymSchema` (same
fields). The fields:

```ts
{
  canonicalTag: string;         // canonical slug (URL-encoded if needed, e.g. "d%26d")
  synonyms: string[];           // alternative slugs (lowercase, multi-lingual)
  icon: string;                 // cn-icon noun
}
```

**v17 fields dropped from the v20 schema:**
- `displayName` and `description` — moved to the i18n surface
  (per [`./i18n/spec.md`](./i18n/spec.md)). The schema no longer
  carries copy.

#### Supertag registry (MVP carry-forward)

| Canonical slug | Icon noun | Synonyms (selected) |
|---|---|---|
| `d%26d` | `d20` | `dnd`, `d&d`, `dungeons & dragons`, `dd`, `deddu` |
| `pathfinder` | `compass` | `pathfinder 2e`, `pf2e`, `pf`, `päffä` |
| `legendoja %26 lohikäärmeitä` | `ll-ampersand` | `l&l`, `ll`, `löllö`, `letl`, `lössö`, `Suuri seikkailu` |
| `pbta` | `books` | `powered by the apocalypse`, `apocalypse world`, `FitD` |
| `call+of+cthulhu` | `tentacles` | `coc`, `cthulhu`, `delta green`, `dg` |

The `displayName` and `description` for each entry land in
the i18n sub-spec, keyed by canonical slug. The full v17
synonyms list carries forward verbatim per entry.

#### Helper Surfaces

- `resolveTagSynonym(input: string): string`
  - Pure function. Lowercases the input and looks it up in a
    synonym→canonical map built once at module load. Returns
    the canonical slug if found, the lowercased input
    otherwise. Does NOT perform a redirect — synonym
    resolution is a data lookup; consumer code (e.g. the
    `/tags/[tag]` route) decides whether to issue a 301.
  - **v18 implementation** built the synonym map on every call
    (`buildSynonymMap()` ran on each invocation). v20 builds it
    once at module load — same behavior, lower per-call cost.

- `getSupertag(slug: string): SupertagEntry | null`
  - Pure function. First canonicalizes the input via
    `resolveTagSynonym`, then looks up the registry entry.
    Returns the entry (with its `canonicalTag`, `synonyms`,
    `icon`) or `null` if the slug is not registered. Renamed
    from v17's `getTagDisplayInfo` for clarity — the function
    returns the supertag entry, not "display info."

The helpers MAY also expose URL-encoding-aware variants in a
follow-up if the encoded-slug edge cases (e.g. `d%26d` vs
`d&d`) prove fragile in practice. v18's behaviour does
`decodeURIComponent` inside `getTagDisplayInfo` for matching;
v20 carries this forward.

#### Routes (host-owned, all out of MVP scope)

All tags routes are deferred to TBD sub-specs (see
§Authoring DoD). The MVP ships no `app/pelilauta/src/pages/tags/**`
files; consumers of the package at MVP are limited to in-process
helper-callers (registry lookups happen anywhere a caller
imports from `@pelilauta/tags/server`).

The eventual `/tags/[tag]` route lands as
[`./tag-page/spec.md`](./tag-page/spec.md) (TBD); the front-page
chip widget lands as
[`../front-page/featured-tags/spec.md`](../front-page/featured-tags/spec.md)
(TBD). Both consume the same registry and helpers from this
package.

#### Components (sub-specs, deferred)

- **`FeaturedTags` front-page widget** — TBD at
  [`../front-page/featured-tags/spec.md`](../front-page/featured-tags/spec.md).
  Renders a chip row (using `cn-chip` + `cn-chip-list` from
  cyan) of all 5 supertags from the registry. Reads
  `displayName` per entry from the i18n surface. Routes each
  chip to `/tags/{canonicalTag}`.
- **`/tags/[tag]` route page** — TBD at
  [`./tag-page/spec.md`](./tag-page/spec.md). MVP renders the
  supertag's localized `displayName` (and optional
  `description`) when the slug resolves to a registry entry,
  otherwise renders the raw slug as the heading. No
  Firestore-backed entry listing at MVP.

#### i18n

The `./i18n` sub-export ships only static locale data — no
runtime, no side effects. Tags-owned key set is owned by the
[i18n sub-spec](./i18n/spec.md) — this parent spec only points
at it. The host (`app/pelilauta/src/i18n.ts`) imports from
`@pelilauta/tags/i18n` and assigns the trees to the `tags`
namespace. Engine and host composition rules live in
[`../i18n/spec.md`](../i18n/spec.md).

Keys covered by [`./i18n/spec.md`](./i18n/spec.md):

- `tags:supertag.{slug}.displayName` — localized supertag
  label, one per registry entry.
- `tags:supertag.{slug}.description` — localized supertag
  description (SEO-shaped prose, one per registry entry).

Plain tags do not consume any i18n key; they display as the raw
slug.

### Dependencies

- `@pelilauta/i18n` — used only for the `NestedTranslation`
  type by the `./i18n` sub-export.
- `zod` — schema validation.

The package has **no Firebase dependency** at MVP — the supertag
registry is in-process data, the helpers are pure, and the
TagSchema is documented but not parsed against a runtime read.

### Constraints

- **No breaking data contract changes.** `TagSchema` preserves
  every v17 field shape. Any rename or restructure is a
  breaking change requiring a separate migration spec.
- **Registry is static data, not a runtime store.** The
  supertag registry is editable only by code change; new
  supertags require a code edit plus a matching i18n entry
  pair (`displayName` and `description` for both `fi` and
  `en`).
- **Plain tags display as raw slugs everywhere.** No fallback
  lookup, no truncation, no transformation. The slug the
  caller supplies is the slug the consumer surface displays.
- **Synonym resolution is deterministic and pure.** Same
  input always returns the same canonical slug; no async work,
  no I/O, no per-request state.
- **Tier-4 ownership rules** (schemas + helpers + reusable
  components, not routes; schemas extend Zod; `./i18n` is
  static locale data only) follow
  [`../../../ARCHITECTURE.md`](../../../ARCHITECTURE.md)
  §Workspace topology.
- **MVP component scope: zero.** The components sub-export
  ships an empty barrel; the `FeaturedTags` widget lives in
  `app/pelilauta/src/components/front-page/` per its own
  sub-spec, not inside this package. (The package's
  `./components` sub-export is reserved for the case a future
  consumer needs a Svelte component owned by the tags
  domain — e.g. a tag-pill list inside a Svelte-managed
  collection.)

## Contract

### Definition of Done

DoD is split across stages so incremental commits can land
green without satisfying clauses that depend on later stages.
Stages are cumulative.

#### Scaffold DoD (Stage 1 — empty package shell)

- [ ] `packages/tags` exists as a pnpm workspace package named
      `@pelilauta/tags`, picked up by `pnpm-workspace.yaml`.
- [ ] Three sub-exports declared in `package.json`:
      `./server`, `./components`, `./i18n` (empty barrels
      permitted until the stage that populates them).
- [ ] Module directories exist per §Module Structure:
      `src/{schemas,data,helpers,server,components,i18n}/`.
- [ ] Workspace dependencies listed in `package.json`:
      `@pelilauta/i18n`, `zod`. (No `@pelilauta/firebase` —
      MVP has no Firestore reader.)
- [ ] `vitest.config.ts` present; mirrors the `envPrefix` /
      `envDir` convention used by sibling packages.
- [ ] Package passes `pnpm check`.

#### Read & Render DoD (Stage 2 — unblocks `FeaturedTags` and the tag-page)

- [ ] `TagSchema` validates against the v17 Firestore document
      shape unchanged.
- [ ] `SupertagSchema` validates the registry entries.
- [ ] `data/supertags.ts` exports a frozen array of 5
      `SupertagEntry` values matching §Supertag registry,
      sourced verbatim from v17 `TAG_SYNONYMS`.
- [ ] `resolveTagSynonym(input)` returns the canonical slug
      for any registered synonym (case-insensitive) and the
      lowercased input for unknown slugs.
- [ ] `getSupertag(slug)` returns the registry entry for any
      canonical slug or any of its synonyms; returns `null`
      otherwise.
- [ ] `i18n/index.ts` exports `fi` and `en` trees per
      [`./i18n/spec.md`](./i18n/spec.md) — at minimum
      `displayName` for each of the 5 registry entries.
- [ ] The synonym map is built once at module load, not on
      every `resolveTagSynonym` call.

#### Authoring DoD (Stage 3+ — TBD sub-specs)

The following surfaces are out of scope for this parent spec
and each lands as its own sub-spec when work begins:

- `FeaturedTags` front-page widget →
  [`../front-page/featured-tags/spec.md`](../front-page/featured-tags/spec.md)
  (TBD).
- `/tags/[tag]` route page →
  [`./tag-page/spec.md`](./tag-page/spec.md) (TBD). MVP scope
  for that sub-spec is "render the supertag header" — no
  Firestore-backed entry listing.
- Synonym redirect (HTTP 301 from synonym slug to canonical
  slug) — landed as part of the `/tags/[tag]` sub-spec.
- Firestore-backed entry listing on the tag page — TBD,
  separate sub-spec; reintroduces a Firestore reader to
  the package's `./server` surface.
- Tag-authoring surfaces (write APIs for tag-stamping
  entries, registry editor UI) — out of MVP, TBD sub-specs.

### Regression Guardrails

- `TagSchema` must always preserve every v17 field shape. Any
  field rename or restructure is a breaking data-contract
  change and out of scope without a separately approved
  migration spec.
- The supertag registry MUST stay in-process data — never
  Firestore-backed. The whole point of the registry being a
  curated editorial list is that it does not depend on
  network I/O or per-request reads.
- `resolveTagSynonym` MUST be pure and deterministic — no
  network calls, no Firestore reads, no global state mutation.
- `getSupertag` MUST return `null` (not throw) for unknown
  slugs. Plain-tag fallback is the consumer's responsibility,
  not the helper's.
- The `tags` namespace key in the i18n composition is
  informally proposed by this package; the host file is
  authoritative.

### Testing Scenarios

#### Scenario: Parse a tag-index doc through TagSchema

```gherkin
Given a raw Firestore document at tags/{key} with type='thread',
  key='abc123', tags=['d%26d', 'pathfinder'], author='u-alice',
  flowTime=1730000000000, title='Adventure log'
When TagSchema.parse() runs
Then the parsed Tag has all 6 fields populated with the source values
And the type is the string literal 'thread'
```

#### Scenario: resolveTagSynonym maps a known synonym to canonical

```gherkin
Given the registry contains the D&D entry with synonyms ['dnd', 'd&d', ...]
When resolveTagSynonym('DnD') is called
Then 'd%26d' is returned (the canonical slug)
And the input case is normalized via lowercasing before lookup
```

#### Scenario: resolveTagSynonym passes through an unknown slug

```gherkin
Given a slug 'made-up-game-name' that appears nowhere in the registry
When resolveTagSynonym('Made-Up-Game-Name') is called
Then 'made-up-game-name' is returned (lowercased, otherwise unchanged)
And no error is raised
```

#### Scenario: getSupertag returns the entry for a canonical slug

```gherkin
Given the registry's pathfinder entry exists
When getSupertag('pathfinder') is called
Then the returned object is the pathfinder SupertagEntry
And the entry's icon noun is 'compass'
And the entry's synonyms array contains 'pf2e' and 'päffä'
```

#### Scenario: getSupertag returns the same entry for any synonym

```gherkin
Given the registry's pathfinder entry exists
When getSupertag('päffä') is called
Then the returned object is the same pathfinder SupertagEntry
  as if 'pathfinder' had been passed
```

#### Scenario: getSupertag returns null for an unregistered slug

```gherkin
Given a slug 'made-up-game-name' that appears nowhere in the registry
When getSupertag('made-up-game-name') is called
Then null is returned
```

#### Scenario: Registry contains all 5 carry-forward supertags

```gherkin
Given the supertag registry exported from packages/tags/src/data/supertags.ts
When the array's canonicalTag values are inspected
Then the set contains exactly 'd%26d', 'pathfinder',
  'legendoja %26 lohikäärmeitä', 'pbta', and 'call+of+cthulhu'
And every entry has a non-empty synonyms array
And every entry has a non-empty icon noun
```

#### Scenario: Synonym map is built once

```gherkin
Given a freshly imported helpers/resolveTagSynonym module
When resolveTagSynonym is called 100 times
Then the synonym map is constructed exactly once (at module load)
And subsequent calls reuse the same map instance
```

## Migration Debt and Decisions

### v18 patterns that do not carry forward to v20

1. **`FeaturedTags.astro` hardcoded list.** v18's front-page
   widget hardcodes its own divergent subset of `TAG_SYNONYMS`
   — only 4 entries (omits Call of Cthulhu), with mismatched
   icon nouns (`dd5` instead of `d20`, `pathfinder` instead of
   `compass`, `pbta-logo` instead of `books`). v20's widget
   reads exclusively from the registry; the hardcode does not
   carry forward. Detail in
   [`../front-page/featured-tags/spec.md`](../front-page/featured-tags/spec.md)
   (TBD).
2. **`/api/tags/[tag].json.ts` HTTP route.** v18 ships a JSON
   endpoint at this path that the `/tags/[tag]` page
   self-fetches. v20 reads in-process via the shared accessor
   module (which the eventual `tag-page/spec.md` will define
   for Firestore reads). The MVP ships no `@pelilauta/tags`
   HTTP surface and no `app/pelilauta/src/pages/api/tags/**`
   files. If a future external client (mobile app, CSR
   pagination) needs a JSON surface, it gets specced then.
3. **HTTP self-fetch in `[tag].astro`.**
   `fetch(${origin}/api/tags/${canonicalTag}.json)` from inside
   the page's frontmatter is replaced by an in-process accessor
   call (mirrors the same fix already applied for sites and
   threads).
4. **Per-call synonym map construction.** v18's
   `buildSynonymMap()` runs on every invocation. v20 builds the
   map once at module load. Same observable behaviour, lower
   cost.
5. **Inline `displayName` and `description` in
   `TagSynonyms.ts`.** v18 stores both as inline string
   literals on each entry, FI-only. v20 moves both to the i18n
   surface (`tags:supertag.{slug}.displayName` /
   `description`); the registry data file holds only the
   canonical slug, synonyms, and icon noun.
6. **`getTagDisplayInfo` rename.** v17's name leaks
   implementation detail ("display info"). v20 renames to
   `getSupertag(slug) → SupertagEntry | null` — describes the
   return shape.
7. **App-local utility classes in v18 widget and page.**
   `flex flex-wrap`, `flex items-center`, `text-h5`,
   `mt-2 pt-2 border-t`, `cn-chip flex-none`, etc. None exist
   in v20 cyan; v20 composes DS primitives instead. The
   v20 chip primitive ([`../../cyan-ds/utilities/chip/spec.md`](../../cyan-ds/utilities/chip/spec.md))
   landed specifically to unblock this surface. Detail per
   sub-spec.
8. **Inline `style="..."` and `style="margin-bottom: ..."`
   in `[tag].astro`.** v18 leaks inline styles for layout. v20
   composes DS spacing tokens via DS primitives. Detail per
   sub-spec.
9. **`ProfileLink` `client:only="svelte"` islands inside the
   tag page's entry list.** v18 mounts a Svelte profile link
   per entry as a CSR-only island. The MVP `/tags/[tag]` page
   has no entry listing (per §Authoring DoD), so this concern
   is deferred. When entry listing returns, the per-row
   profile-link mount strategy follows the same
   anonymous-cache-shareable contract used by the
   front-page top-sites stream.
10. **`--color-*` tokens.** None observed in the four reversed
    files directly, but if any propagate from imported
    modules, flag and remap to `--cn-*` per the project's
    token-namespace rule.

### Resolved decisions

1. **Supertag = registry entry; plain tag = freeform slug.**
   Two-class taxonomy. Plain tags get raw-slug display
   everywhere; supertags get localized labels.
2. **Package `packages/tags/` lands at MVP** with three
   sub-exports (`./server`, `./components`, `./i18n`).
3. **`TagSchema` carries forward verbatim** even though MVP
   has no Firestore reader. The schema travels with the
   package so future readers don't reintroduce the type
   elsewhere.
4. **Registry holds 5 supertags** (D&D, Pathfinder, L&L,
   PbtA, Call of Cthulhu) — Call of Cthulhu is included (was
   in v17 `TAG_SYNONYMS`, was missing from v17 `FeaturedTags`
   hardcode).
5. **Localization scope: supertag `displayName` and
   `description` only.** Slugs, icons, synonyms — not
   localized. Plain tags — not localized.
6. **Two helpers carry forward:** `resolveTagSynonym` and
   `getSupertag` (renamed from v17's `getTagDisplayInfo`).
7. **No HTTP API surface at MVP.** No `/api/tags/...`
   route in scope. Consumers read in-process.

### Source provenance

- v18 schema (per-entry tag-index doc):
  `.tmp/pelilauta-17/src/schemas/TagSchema.ts`
- v18 supertag registry (renamed from "synonyms"):
  `.tmp/pelilauta-17/src/schemas/TagSynonyms.ts`
- v18 front-page widget (NOT carried forward verbatim — v20
  reads from registry):
  `.tmp/pelilauta-17/src/components/server/FrontPage/FeaturedTags.astro`
- v18 tag detail page:
  `.tmp/pelilauta-17/src/pages/tags/[tag].astro`
- v18 API route (NOT carried forward; no v20 consumer in
  scope): `.tmp/pelilauta-17/src/pages/api/tags/[tag].json.ts`
