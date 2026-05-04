---
feature: Sites (Game-Site Sub-App)
status: draft
maturity: design
last_major_review: 2026-05-04
parent_spec: ../spec.md
---

# Feature: Sites (Game-Site Sub-App)

> Reverse-spec'd from `.tmp/pelilauta-17/src/schemas/SiteSchema.ts`,
> `.tmp/pelilauta-17/src/firebase/server/sites.ts`, and the route tree
> under `.tmp/pelilauta-17/src/pages/sites/`. (The folder name is
> `pelilauta-17/` for legacy reasons but the checked-out source is
> `pelilauta@18.13.3`.) v18's `/api/sites/*` HTTP routes are
> deliberately not carried forward — see §Authoring DoD for when an
> HTTP surface might re-enter scope.

## Blueprint

### Context

The Sites package owns the entire "Game Sites" vertical of
Pelilauta — schema, CRUD operations, UI components, data fetching,
routes for site directory and per-site pages, and locale strings
for everything related to a site as a hosted artifact. A site is
the heaviest tier-4 entry shape on the platform: it owns a route
hierarchy, a page tree, optional players and handouts, optional
characters and clocks, and a poster/avatar/background asset
trio. Two surfaces consume the package today: the front-page
"latest sites" stream (see
[`../front-page/top-sites-stream/spec.md`](../front-page/top-sites-stream/spec.md))
and the discoverable index at `/sites`. Every other surface that
shows or links to a site composes the same components and
accessors from this package.

The MVP scope of this spec covers:

1. The package shell (workspace package, three sub-exports).
2. The schema (`SiteSchema`, v17 contract preserved verbatim).
3. The minimum read-side accessors (`getSites`, `getSite`).
4. The reusable view components: `SiteCard` (flat sibling spec
   [`site-card.md`](./site-card.md)) and `MembershipBadge` (flat
   sibling spec [`membership-badge.md`](./membership-badge.md)).
5. The system-noun mapping (Site `system` → cyan icon noun).
6. The `sites:title` i18n key.

The `/sites` directory route, per-site detail page, and all
authorship surfaces (write APIs, editors, page-tree CRUD,
handouts, characters, clocks, players management, settings) are
out of scope for the MVP and listed as TBD sub-specs below — they
will get their own contracts when each lands.

### Architecture

- **Package:** `packages/sites/` — workspace package
  `@pelilauta/sites`, picked up by `pnpm-workspace.yaml`.

- **Firestore storage** (v17 contract preserved verbatim — no
  breaking data changes):
  - `sites/{siteKey}` — site documents. Path constant:
    `SITES_COLLECTION_NAME = 'sites'` from
    `.tmp/pelilauta-17/src/schemas/SiteSchema.ts:5`.
  - The Site document carries an embedded `pageRefs` array
    (page-tree index metadata, see §PageRef and CategoryRef
    below). The page **content** sub-collection plus the
    handouts, characters, and clocks sub-collections are
    out of MVP scope; their paths and constants are owned
    by future sub-specs (see §Authoring DoD), not by this
    parent.

#### Module Structure

```
packages/sites/
  src/
    schemas/
      SiteSchema.ts          → Zod schema (legacy-tolerant), Site type, createSite() factory
      PageRefSchema.ts       → Zod schema for the embedded page-index array
      CategoryRefSchema.ts   → Zod schema for the embedded category-list array
      nouns.ts               → systemToNounMapping table (carry-forward)
    api/
      getSites.ts            → paginated query by flowTime, public/uid filters
      getSite.ts             → single site by key
    server/                  → SSR-safe re-exports (schemas, types, read accessors, systemToNoun)
    components/              → Svelte 5 / Astro UI components
      SiteCard.svelte        → preview card; contract at site-card.md
      MembershipBadge.svelte → CSR-only "you are an owner / player" indicator; contract at membership-badge.md
    i18n/
      index.ts               → exports fi, en — locale strings for the sites namespace
```

#### Sub-path Exports

| Export path | Contains | Safe for SSR? |
|---|---|---|
| `@pelilauta/sites/server` | Schemas, types, read-only accessors (`getSites`, `getSite`), `systemToNoun` mapping, constants | Yes |
| `@pelilauta/sites/components` | Svelte / Astro components (`SiteCard.svelte` SSR-safe; `MembershipBadge.svelte` CSR-only) | Partial |
| `@pelilauta/sites/i18n` | `export const fi`, `export const en` — locale strings only, no runtime code | Yes |

#### Schemas

`SiteSchema` extends `EntrySchema` (`@pelilauta/models`). Field
shape is preserved verbatim from
`.tmp/pelilauta-17/src/schemas/SiteSchema.ts` — every field name,
type, default, and `.optional()` marker carries forward. v20
delta: none. The card and accessor consumers read only `key`,
`name`, `system`, `description`, `posterURL`, `flowTime`,
`owners`, `players`; the rest are preserved for future detail
pages and editors.

`PageRefSchema` and `CategoryRefSchema` (the embedded arrays on
the Site doc) carry forward verbatim from the same file. The
`pageRefs` array is the page-tree *index* (metadata: key, name,
author, category, flowTime, order); the page **content**
sub-collection is owned by a future sub-spec.

##### Legacy field migration

`migrateLegacySiteFields` ports verbatim from v17. Two
transformations: (a) `customPageKeys → !usePlainTextURLs` when
the latter is missing; (b) `sortOrder` value remap (`'created'
→ 'createdAt'`, `'updated' → 'flowTime'`). Read accessors invoke
it before `SiteSchema.parse(...)`.

#### Accessor Surfaces

- `getSites(limit: number, options?: { order?: 'flowTime'; public?: boolean; uid?: string }): Promise<Site[]>`
  - **Default order.** When `order` is omitted, results are
    sorted by `flowTime` descending (newest first). This is an
    API-level default; how the implementation achieves it
    (Firestore `orderBy`, in-memory sort, or both) is an
    implementation choice and not part of the contract.
  - **Default visibility.** When `public` is omitted, only
    sites with `hidden === false` are returned. (`public` is
    the modern API parameter; storage uses `hidden`. See
    [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) §Accessor
    naming.)
  - **`uid` filter.** When supplied, results are additionally
    filtered to sites where `owners` array-contains `uid`.
- `getSite(key: string): Promise<Site | undefined>` — returns
  the parsed Site for an existing doc, `undefined` for a missing
  doc, propagates Firestore + Zod errors to the caller. Mirrors
  v17's `getSiteData` but with v20's "propagate, don't swallow"
  error policy (matches `getThread`'s contract in
  `../threads/spec.md`).
- `systemToNoun(system: string | undefined): string` — pure
  function, returns the cyan-icon noun for a Site `system` value
  (e.g. "homebrew" → "homebrew", "dnd5e" → "d20",
  "pathfinder" → "d20"). Falls back to "homebrew" for
  unknown systems and logs via `@pelilauta/utils/log`. The
  mapping table itself is carried forward verbatim from
  `.tmp/pelilauta-17/src/schemas/nouns.ts`.

**Error behavior:** read-only accessors propagate errors to the
caller — Firestore network/permission failures and Zod parse
failures are not caught internally. Callers (e.g.
`TopSitesStream.astro`) are responsible for try/catch and
rendering error states. This is a deliberate divergence from
v17, which returned `null` on error inside `getSiteData`; v20
prefers surfacing failures so callers can distinguish "no data"
from "fetch broken." Matches `packages/threads`'s contract.

#### Routes (host-owned, all out of MVP scope)

All sites routes are deferred to TBD sub-specs (see
§Authoring DoD). The MVP ships no `app/pelilauta/src/pages/sites/**`
files; consumers of the package at MVP are limited to the
front-page top-sites stream (per
[`../front-page/top-sites-stream/spec.md`](../front-page/top-sites-stream/spec.md))
and any other in-process accessor caller that doesn't need a
URL surface.

#### Components (sub-specs)

- [`site-card.md`](./site-card.md) — `SiteCard.svelte` rendering
  contract: cover, name, system-noun eyebrow, description body,
  flow-time footer, conditional `MembershipBadge` mount in the
  actions slot. Reused across the front-page stream, the
  `/sites` directory, profile views, and any future surface that
  lists sites.
- [`membership-badge.md`](./membership-badge.md) —
  `MembershipBadge.svelte` rendering contract: CSR-only,
  authenticated-mount-only, owner badge for `uid ∈ owners`,
  player badge for `uid ∈ players AND uid ∉ owners`.

#### i18n

The `./i18n` sub-export ships only static locale data — no
runtime, no side effects. Sites-owned key set (MVP):

- `sites:title` — the canonical heading for the Sites vertical.
  Used wherever the sites domain needs to name itself: the
  front-page `TopSitesStream` `<h2>`, the future `/sites`
  index `<h1>`, and any other surface that hosts sites
  content. Finnish: "Sivustot". English: "Sites".

Authorship strings (editor labels, settings copy, members-page
copy, handouts/characters/clocks per-feature copy) are out of
scope for the MVP and land with their respective sub-specs.

The host (`app/pelilauta/src/i18n.ts`) imports from
`@pelilauta/sites/i18n` and assigns the trees to the `sites`
namespace. See [`../i18n/spec.md`](../i18n/spec.md) for the
engine contract and host composition rules.

### Dependencies

- `@pelilauta/models` — `EntrySchema`, `AssetSchema`,
  `toDate()`.
- `@pelilauta/firebase/server` — server-side Firestore reads for
  SSR.
- `@pelilauta/auth` — session store consumed by
  `MembershipBadge` to read the viewer's uid post-hydration.
- `@pelilauta/utils/log` — `logError` / `logWarn`, used by
  accessors and `systemToNoun`.
- `@pelilauta/utils/images` — `netlifyImage` /
  `generateSrcset`, consumed by `SiteCard` for cover-image
  optimisation. Spec: [`../images/spec.md`](../images/spec.md).
- `@pelilauta/utils/dates` — `flowTimeLabel`, consumed by
  `SiteCard` for the flow-time footer string. Spec:
  [`../dates/spec.md`](../dates/spec.md).
- `@pelilauta/i18n` — used only for the `NestedTranslation`
  type by the `./i18n` sub-export.
- `@pelilauta/cyan` — `CnCard`, `CnIcon` (consumed by
  `SiteCard` and `MembershipBadge`).
- `zod` — schema validation.

### Constraints

- **No breaking data contract changes.** Firestore document
  shapes from v17 (`sites/{siteKey}` and its sub-collections)
  are preserved verbatim. v20 may add optional fields with
  `.default()` on schemas — never rename, retype, or
  restructure existing fields.
- **`migrateLegacySiteFields` runs inside the parse path** of
  every read accessor (before `SiteSchema.parse(...)`).
- **`@pelilauta/firebase/server` is imported only from
  `./server`.**
- **Tier-4 ownership rules** (schemas + accessors + reusable
  components, not routes; schemas extend `@pelilauta/models`;
  `./i18n` is static locale data only) follow
  [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) §Workspace
  topology and `../models/spec.md` / `../i18n/spec.md`.
- **Accessor parameter naming follows
  [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) §Accessor
  naming.** `getSites({ public: true })` is the modern API;
  storage predicate is `hidden === false`.
- **MVP component scope: `SiteCard` and `MembershipBadge` only.**
  Authoring components (editor, settings, members table,
  page-tree editors) are TBD sub-specs.
- **`MembershipBadge` is CSR-only.** The consuming page's
  Astro frontmatter decides whether to emit the `client:idle`
  directive (via `Astro.locals.session`); the badge component
  reads the session store only post-hydration. See
  [`membership-badge.md`](./membership-badge.md).

## Contract

### Definition of Done

DoD is split across stages so incremental commits can land green
without having to satisfy clauses that depend on later stages.
Stages are cumulative.

#### Scaffold DoD (Stage 1 — empty package shell)

- [ ] `packages/sites` exists as a pnpm workspace package named
      `@pelilauta/sites`, picked up by `pnpm-workspace.yaml`.
- [ ] Three sub-exports declared in `package.json`:
      `./server`, `./components`, `./i18n` (empty barrels
      permitted until the stage that populates them).
- [ ] Module directories exist per §Module Structure:
      `src/{schemas,api,server,components,i18n}/`.
- [ ] Workspace dependencies listed in `package.json`:
      `@pelilauta/models`, `@pelilauta/firebase`,
      `@pelilauta/i18n`, `@pelilauta/auth`,
      `@pelilauta/utils`, `@pelilauta/cyan`, `zod`.
- [ ] `vitest.config.ts` present; mirrors the
      `envPrefix` / `envDir` convention used by
      `packages/firebase`.
- [ ] Package passes `pnpm check`.

#### Read & Render DoD (Stage 2 — unblocks `TopSitesStream`)

- [ ] `SiteSchema` validates against legacy Firestore data
      unchanged, with legacy tolerance encoded directly on the
      schema and via `migrateLegacySiteFields` applied in the
      parse path.
- [ ] `createSite(partial?)` factory exported from
      `schemas/SiteSchema.ts` — returns a fully-populated `Site`
      with defaults filled in. Does NOT write to Firestore.
- [ ] `getSites(limit, { order, public, uid })` returns
      `Site[]` with documented defaults (`order='flowTime'`,
      `public=true`).
- [ ] `getSite(key)` returns the parsed `Site` for an existing
      doc, `undefined` for a missing doc, and propagates
      Firestore + Zod errors to the caller.
- [ ] `systemToNoun(system)` returns the v17 mapping for known
      systems, `"homebrew"` for unknown (plus a `logWarn`).
- [ ] `i18n/index.ts` exports `fi` and `en` trees containing at
      least `sites:title`.
- [ ] `SiteCard.svelte` exists at
      `packages/sites/src/components/SiteCard.svelte` per
      [`site-card.md`](./site-card.md).
- [ ] `MembershipBadge.svelte` exists at
      `packages/sites/src/components/MembershipBadge.svelte` per
      [`membership-badge.md`](./membership-badge.md).
- [ ] Front-page `TopSitesStream` (per
      [`../front-page/top-sites-stream/spec.md`](../front-page/top-sites-stream/spec.md))
      renders against this package without any host-side
      schema/accessor stubs.

#### Authoring DoD (Stage 3+ — TBD sub-specs)

Authoring surfaces (write APIs, editors, members management,
handouts, characters, clocks, page-tree CRUD, settings, the
`/sites` directory and `/sites/[siteKey]` routes) are out of
scope for this parent spec; each lands as its own sub-spec
under `specs/pelilauta/sites/<feature>/spec.md` when work
begins.

### Regression Guardrails

- `SiteSchema` must always preserve every v17 field shape.
  Any field rename or restructure is a breaking data-contract
  change and out of scope without an explicit, separately
  approved migration spec.
- `getSites`'s `public` parameter MUST map to the storage
  predicate `hidden === false`. Removing or weakening that
  predicate would expose hidden sites in the public stream — a
  data-leak regression.
- `MembershipBadge.svelte` MUST NOT be referenced from
  `server/` exports; it is CSR-only and lives behind
  `./components`.
- The `sites` namespace key in the i18n composition is
  informally proposed by this package; the host file is
  authoritative.

### Testing Scenarios

#### Scenario: Parse site from Firestore document

```gherkin
Given a raw Firestore document with Timestamp fields and legacy
  customPageKeys / sortOrder values
When parsed through SiteSchema.parse() after migrateLegacySiteFields()
Then dates are converted to Date objects
And customPageKeys is mapped to !usePlainTextURLs when the latter is missing
And legacy sortOrder values "created" / "updated" map to "createdAt" / "flowTime"
And a valid Site is returned
```

#### Scenario: createSite factory produces a valid blank Site

```gherkin
Given no source object
When createSite() is called
Then the returned Site satisfies SiteSchema.parse() as a valid Site
And name defaults to "[...]"
And system defaults to "homebrew"
And hidden defaults to false
And license defaults to "0"
And owners is an array (the empty default ?? per emptySite legacy comment)
```

#### Scenario: getSites returns paginated public sites

```gherkin
Given the sites collection has 20 docs (15 with hidden=false, 5 with hidden=true)
When getSites(10) is called with default options (order=flowTime, public=true)
Then 10 sites are returned sorted by flowTime descending
And only documents with hidden=false are included
```

#### Scenario: getSites with uid filter returns sites the uid owns

```gherkin
Given the sites collection has 5 sites where owners array-contains "u-alice"
And the same collection has other sites with different owners
When getSites(20, { uid: "u-alice" }) is called
Then exactly the 5 sites where owners contains "u-alice" are returned
```

#### Scenario: getSite returns a parsed Site for an existing doc

```gherkin
Given the sites collection contains a document at sites/{key}
When getSite(key) is called
Then a Site parsed through SiteSchema is returned
And the Site's key matches the requested key
And legacy field migration is applied via migrateLegacySiteFields
```

#### Scenario: getSite returns undefined for a missing doc

```gherkin
Given the sites collection has no document at sites/{key}
When getSite(key) is called
Then undefined is returned
And no parse is attempted
```

#### Scenario: getSite propagates Firestore errors

```gherkin
Given a Firestore network or permission failure on sites/{key}
When getSite(key) is called
Then the underlying error propagates to the caller
And no fallback value is substituted
```

#### Scenario: systemToNoun maps known systems

```gherkin
Given the v17 systemToNounMapping table contains an entry for "dnd5e"
When systemToNoun("dnd5e") is called
Then the mapped noun is returned
And no warning is logged
```

#### Scenario: systemToNoun falls back for unknown systems

```gherkin
Given a Site with system "made-up-game-name"
When systemToNoun(site.system) is called
Then "homebrew" is returned
And a warning is logged via @pelilauta/utils/log
```

#### Scenario: Sites i18n sub-export ships sites:title

```gherkin
Given a Locales registry assembled by the host that assigns @pelilauta/sites/i18n to the "sites" namespace
When the host-bound t resolves "sites:title" with locale "fi"
Then it returns "Sivustot"
And the same key resolves to "Sites" for locale "en"
```
