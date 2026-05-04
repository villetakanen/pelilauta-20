---
feature: Sites (Game-Site Sub-App)
status: draft
maturity: design
last_major_review: 2026-05-04
parent_spec: ../spec.md
---

# Feature: Sites (Game-Site Sub-App)

> Reverse-spec'd from `.tmp/pelilauta-17/src/schemas/SiteSchema.ts`,
> `.tmp/pelilauta-17/src/firebase/server/sites.ts`, the route tree
> under `.tmp/pelilauta-17/src/pages/sites/`, and the API tree under
> `.tmp/pelilauta-17/src/pages/api/sites/`. (The folder name is
> `pelilauta-17/` for legacy reasons but the checked-out source is
> `pelilauta@18.13.3`.)

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

1. The package shell (workspace package, four sub-exports).
2. The schema (`SiteSchema`, v17 contract preserved verbatim).
3. The minimum read-side accessors (`getSites`, `getSite`).
4. The reusable view components: `SiteCard` (flat sibling spec
   [`site-card.md`](./site-card.md)) and `MembershipBadge` (flat
   sibling spec [`membership-badge.md`](./membership-badge.md)).
5. The system-noun mapping (Site `system` → cyan icon noun).
6. The `sites:title` i18n key.
7. The HTTP API surface (`/api/sites.json`) wrapping the
   accessors.
8. The directory route (`/sites`) skeleton.

Authorship surfaces (write APIs, editors, page-tree CRUD,
handouts, characters, clocks, players management, settings) are
out of scope for the MVP and listed as TBD sub-specs below — they
will get their own contracts when each lands.

### Architecture

- **Package:** `packages/sites/` — workspace package
  `@pelilauta/sites`, picked up by `pnpm-workspace.yaml`.

- **Firestore storage** (v17 contract preserved verbatim — no
  breaking data changes):
  - `sites/{siteKey}` — site documents.
  - `sites/{siteKey}/pages/{pageKey}` — page sub-collection
    (page-tree CRUD is out of scope for the MVP — the schema
    references and `pageRefs` array are preserved on
    `SiteSchema` for forward compatibility).
  - `sites/{siteKey}/handouts/{handoutKey}` — handouts (TBD
    sub-spec).
  - `sites/{siteKey}/characters/{characterKey}` — characters
    (TBD sub-spec).
  - `sites/{siteKey}/clocks/{clockKey}` — clocks (TBD
    sub-spec).
  - Path constant: `SITES_COLLECTION_NAME = 'sites'` (carry
    forward from
    `.tmp/pelilauta-17/src/schemas/SiteSchema.ts:5`).

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
      writeSite.ts           → write site doc (TBD sub-spec)
      updateSite.ts          → update site fields (TBD sub-spec)
      deleteSite.ts          → delete site + sub-collections (TBD sub-spec)
    server/                  → SSR-safe re-exports (schemas, types, read accessors, systemToNoun)
    client/                  → Client-only exports (writes, listeners, interactive UI) — TBD
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
| `@pelilauta/sites/client` | Write operations, Firestore `onSnapshot` listeners, interactive Svelte components | No (client only) |
| `@pelilauta/sites/components` | Svelte / Astro components (`SiteCard.svelte` SSR-safe; `MembershipBadge.svelte` CSR-only) | Partial |
| `@pelilauta/sites/i18n` | `export const fi`, `export const en` — locale strings only, no runtime code | Yes |

#### Site Schema (v20)

Extends `EntrySchema` from `@pelilauta/models`. Field shape is
preserved verbatim from
`.tmp/pelilauta-17/src/schemas/SiteSchema.ts`; v20 adds no
optional or required fields, renames nothing, and retypes nothing
without an explicit user-approved schema-change spec. The card
and the directory list consume only a subset, but every field is
carried so per-site detail pages and editors round-trip cleanly:

```
SiteSchema extends EntrySchema
  // Core
  name: string (default "[...]")
  system: string (default "homebrew")
  description: string (optional)
  homepage: string (optional)
  license: string (default "0")

  // Visibility
  hidden: boolean (default false)

  // Media / assets
  posterURL: string (optional)
  avatarURL: string (optional)
  backgroundURL: string (optional)
  assets: AssetSchema[] (optional)

  // Page organisation
  sortOrder: 'name' | 'createdAt' | 'flowTime' | 'manual' (default 'name')
  customPageKeys: boolean (default false)
  usePlainTextURLs: boolean (default false)
  pageRefs: PageRefSchema[] (optional)
  pageCategories: CategoryRefSchema[] (optional)

  // Players
  players: string[] (optional)
  usePlayers: boolean (optional)

  // Features / options
  useClocks: boolean (optional)
  useHandouts: boolean (optional)
  useRecentChanges: boolean (optional)
  useSidebar: boolean (default true)
  sidebarKey: string (optional)
  useCharacters: boolean (optional)
  useCharacterKeeper: boolean (optional)
  characterKeeperSheetKey: string (optional)
```

The schema also ships the inherited `EntrySchema` fields (`key`,
`createdAt`, `updatedAt`, `flowTime`, `owners`).

##### Legacy field migration

`.tmp/pelilauta-17/src/schemas/SiteSchema.ts` ships a
`migrateLegacySiteFields(data)` helper that:

- Inverts `customPageKeys` to `usePlainTextURLs` when the latter
  is missing.
- Maps legacy `sortOrder` values (`'created' → 'createdAt'`,
  `'updated' → 'flowTime'`).

v20 ports this helper verbatim to
`packages/sites/src/schemas/migrateLegacySiteFields.ts` and
applies it inside the parse path of every read accessor (mirrors
v17's `serverDB.collection('sites').doc(...).get()` →
`SiteSchema.parse(migrateLegacySiteFields(...))` pattern). Without
this, legacy docs would parse with stale field semantics.

#### PageRef and CategoryRef

Embedded array shapes preserved verbatim. Page-tree storage moved
from a separate Firestore collection to the embedded `pageRefs`
array in v16; v20 keeps that. `PageRefSchema` fields:
`key`, `name`, `author`, `category` (optional), `flowTime`,
`order` (optional). `CategoryRefSchema` fields: `slug`, `name`.

#### Accessor Surfaces

- `getSites(limit: number, options?: { order?: 'flowTime'; public?: boolean; uid?: string }): Promise<Site[]>`
  - Defaults: `order = 'flowTime'`, `public = true`. The
    `public` option maps to the storage predicate `hidden ===
    false` (see Constraints — accessor parameter names are
    modern; the storage shape is v17 verbatim).
  - The `uid` option, when supplied, additionally filters to
    sites where `owners` array-contains `uid` — mirrors v18's
    `?uid=` query parameter on `/api/sites`.
  - Sorts ascending in storage (Firestore `orderBy('flowTime',
    'desc')`) and the accessor sorts descendingly again
    in-memory after parse (v18 carry-forward; the redundant
    in-memory sort is defensive against parse-time field
    coercions).
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

#### HTTP API

- `app/pelilauta/src/pages/api/sites.json.ts` (host-owned, tier
  1 per `ARCHITECTURE.md`) — `GET` handler that wraps
  `getSites`. Accepts `?limit`, `?uid`, and `?public`-bound
  query parameters; returns `Content-Type: application/json` with
  `Cache-Control: s-maxage=180, stale-while-revalidate=600` and
  an `ETag` derived from the response body (carry-forward from
  v18's `/api/sites` route at
  `.tmp/pelilauta-17/src/pages/api/sites/index.ts`).
- The route exists for external HTTP consumers (and DRY between
  SSR and HTTP). SSR consumers (e.g. `TopSitesStream.astro`) read
  in-process via `getSites` directly — the route is not their
  data path.

#### Routes (host-owned)

- `/sites` — directory page. Lists sites in flowTime-descending
  order, paginated. Detailed contract is a future sub-spec
  (`directory/spec.md`, TBD); the MVP only requires that the
  show-more link from
  [`../front-page/top-sites-stream/spec.md`](../front-page/top-sites-stream/spec.md)
  resolves to a real, non-404 page.
- `/sites/[siteKey]` — single-site landing page (TBD sub-spec).
- `/sites/[siteKey]/[pageKey]` — wiki-page render (TBD
  sub-spec).
- `/sites/[siteKey]/{handouts,characters,clocks,members,settings,…}`
  — TBD sub-specs for each authoring surface.

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
- `@pelilauta/firebase/client` — client-side Firestore writes,
  listeners, auth (consumed by `MembershipBadge` and future
  CSR surfaces).
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
- **`migrateLegacySiteFields` runs inside the parse path.**
  Read accessors invoke it before `SiteSchema.parse(...)` so
  legacy docs that pre-date `usePlainTextURLs` and the modern
  `sortOrder` values still parse cleanly.
- **The `server/` entry point is the only path that imports
  `@pelilauta/firebase/server`.** The `client/` entry point
  exclusively uses `@pelilauta/firebase/client`. Mixing breaks
  SSR/CSR isolation.
- **Page-level Astro components and routes live in
  `app/pelilauta`.** This package owns schemas, accessors, and
  reusable components — not routes.
- **Schemas extend `EntrySchema` from `@pelilauta/models`.**
  Field shapes are not duplicated.
- **Accessor parameter names mirror modern API ergonomics, not
  storage names.** `getSites({ public })` because callers
  reason in modern terms; the implementation maps `public:
  true` to the v17 storage predicate `hidden === false`. This
  matches the `CLAUDE.md` carve-out for accessor naming —
  "API ergonomics, not a contract change."
- **`./i18n` sub-export is locale strings only.** No runtime
  code, no side effects, no imports beyond the
  `NestedTranslation` type.
- **`SiteCard` and `MembershipBadge` are the only DS-shaped
  components shipped at MVP.** Authoring components (editor,
  settings, members table, page-tree editors) are TBD sub-specs
  and do not ship in the MVP.
- **`MembershipBadge` is CSR-only and never renders on
  unauthenticated pages.** The mount decision (whether to emit
  the `client:idle` directive at all) is made by the consuming
  page in its Astro frontmatter via `Astro.locals.session`. The
  badge component itself MUST NOT attempt to read or import the
  session store at module-evaluation time on the server. See
  [`membership-badge.md`](./membership-badge.md).

## Contract

### Definition of Done

DoD is split across stages so incremental commits can land green
without having to satisfy clauses that depend on later stages.
Stages are cumulative.

#### Scaffold DoD (Stage 1 — empty package shell)

- [ ] `packages/sites` exists as a pnpm workspace package named
      `@pelilauta/sites`, picked up by `pnpm-workspace.yaml`.
- [ ] All four sub-exports declared in `package.json`:
      `./server`, `./client`, `./components`, `./i18n` (empty
      barrels permitted until the stage that populates them).
- [ ] Module directories exist per §Module Structure:
      `src/{schemas,api,server,client,components,i18n}/`.
- [ ] Workspace dependencies listed in `package.json`:
      `@pelilauta/models`, `@pelilauta/firebase`,
      `@pelilauta/i18n`, `@pelilauta/auth`,
      `@pelilauta/utils`, `@pelilauta/cyan`, `zod`.
- [ ] `vitest.config.ts` present; mirrors the
      `envPrefix` / `envDir` convention used by
      `packages/firebase`.
- [ ] `server/` barrel has zero client SDK imports (trivially
      true while empty; becomes load-bearing at stage 2).
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
- [ ] `app/pelilauta/src/pages/api/sites.json.ts` wraps
      `getSites` with the carry-forward cache headers (see
      §HTTP API).
- [ ] `app/pelilauta/src/pages/sites/index.astro` renders the
      directory page skeleton — at minimum, `<Page>` shell, a
      list of `SiteCard` for non-hidden sites in
      flowTime-descending order, and a working route at `/sites`
      so the front-page show-more link resolves to a real page.
      Detailed contract is a future sub-spec.
- [ ] `server/` entry still has zero client SDK imports.
- [ ] Front-page `TopSitesStream` (per
      [`../front-page/top-sites-stream/spec.md`](../front-page/top-sites-stream/spec.md))
      renders against this package without any host-side
      schema/accessor stubs.

#### Authoring DoD (Stage 3+ — TBD sub-specs)

Authoring stages (write APIs, editors, members management,
handouts, characters, clocks, page-tree CRUD, settings) are
out of scope for this parent spec and land with their own
contracts. Listed here as forward references:

- `directory/spec.md` (TBD) — `/sites` directory page contract
  beyond the MVP skeleton (pagination, filtering, search).
- `detail/spec.md` (TBD) — `/sites/[siteKey]` landing-page
  contract.
- `pages/spec.md` (TBD) — `/sites/[siteKey]/[pageKey]` wiki
  render and the `pages` sub-collection.
- `members/spec.md` (TBD) — players management UI and
  invitations.
- `handouts/spec.md` (TBD) — handouts CRUD.
- `characters/spec.md` (TBD) — characters / character-keeper
  CRUD.
- `clocks/spec.md` (TBD) — clocks CRUD.
- `editor/spec.md` (TBD) — site-create and site-settings
  editors.

### Regression Guardrails

- `SiteSchema` must always preserve every v17 field shape.
  Any field rename or restructure is a breaking data-contract
  change and out of scope without an explicit, separately
  approved migration spec.
- `getSites`'s `public` parameter MUST map to the storage
  predicate `hidden === false`. Removing or weakening that
  predicate would expose hidden sites in the public stream — a
  data-leak regression.
- `server/` MUST NOT import any `firebase/firestore` client
  modules.
- `MembershipBadge.svelte` MUST NOT be referenced from
  `server/` exports; it is CSR-only and lives behind
  `./components`.
- The `sites` namespace key in the i18n composition is
  informally proposed by this package; the host file is
  authoritative.
- HTTP API cache headers
  (`Cache-Control: s-maxage=180, stale-while-revalidate=600`,
  `ETag`) are part of the contract — removing or shortening
  them is a regression against v18 carry-forward.

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

#### Scenario: /api/sites.json honours the limit query parameter

```gherkin
Given the sites collection has 20 non-hidden sites
When GET /api/sites.json?limit=5 is called
Then the response status is 200
And the body is a JSON array of 5 Site objects
And the response carries Content-Type: application/json
And the response carries Cache-Control: s-maxage=180, stale-while-revalidate=600
And the response carries an ETag header
```

#### Scenario: /sites directory renders for the front-page show-more link

```gherkin
Given the front-page TopSitesStream renders with a show-more link to "/sites"
When that link is followed (anonymous viewer)
Then the response status is 200
And the page renders inside the host <Page> shell
And at least one SiteCard is rendered for an existing public site
And the response is fully SSR (no client:* directives in the rendered HTML for an anonymous viewer)
```

#### Scenario: Sites i18n sub-export ships sites:title

```gherkin
Given a Locales registry assembled by the host that assigns @pelilauta/sites/i18n to the "sites" namespace
When the host-bound t resolves "sites:title" with locale "fi"
Then it returns "Sivustot"
And the same key resolves to "Sites" for locale "en"
```
