---
feature: Profiles (Public Identity Vertical)
status: draft
maturity: design
last_major_review: 2026-04-29
parent_spec: ../spec.md
---

# Feature: Profiles (Public Identity Vertical)

## Blueprint

### Context

The Profiles microfrontend owns the **public-facing identity** of accounts: the `nick`, `avatarURL`, `username`, `bio`, and link/tag adornments that other users see. It is a sibling vertical to threads, not part of auth.

> **Profile ≠ account.** An *account* is the auth-layer signed-in identity (uid + Firebase claims + session cookie). A *profile* is the display-side projection of that identity (`nick`, `avatarURL`, …). Anyone — including signed-out visitors — can resolve a profile by uid; only the account holder can edit theirs. The two concerns share a uid as their join key but have different read scopes, write scopes, lifetime, and consumers. v17 conflated them by colocating the profile cache inside `stores/profiles/index.ts` next to the session store; v20 separates them.

The MVP feature of this package is **`ProfileLink`** — an SSR citation that renders a resolved `Profile` as a clickable link to the user's profile page (or an anonymous fallback when no profile is available). Twenty-four v17 surfaces consume something equivalent (channels, thread cards, thread list items, thread detail, replies, search, sites, inbox, admin, history, tags). [`channels/spec.md`](../channels/spec.md) and the future thread-card spec are directly blocked on it.

A sibling primitive, **`AvatarLink`** ([`../avatar-link/spec.md`](../avatar-link/spec.md)), provides the avatar-only counterpart: `<a href="/profiles/{uid}"><CnAvatar/></a>` for resolved profiles, bare `<CnAvatar/>` for the anonymous fallback. Same prop pattern as `ProfileLink` (profile-as-prop, upstream-resolved). `ReplyArticle` is the immediate consumer; surfaces that need both citations render `ProfileLink` + `AvatarLink` as siblings.

Reverse-engineered from `pelilauta-17` sources at:

- `src/components/svelte/app/ProfileLink.svelte` — the v17 CSR component
- `src/schemas/ProfileSchema.ts` — full profile schema + parser/migrator
- `src/stores/profiles/index.ts` — v17 CSR cache + `PublicProfileSchema` (the lighter shape)

### Architecture

#### Package

- **Location:** `packages/profiles/` (workspace module, not independently published — shares the v20 release cycle).
- **Sub-exports:**
  - `./server` — schema, type, server accessor (`getProfile(uid)`). `firebase-admin` only. Importable from `.astro` frontmatter.
  - `./components` — Svelte components. `ProfileLink.svelte`.
  - `./i18n` — locale strings owned by the package.
- **No `./client` sub-export.** v20 has no CSR profile consumer; the package is SSR-only.

```
packages/profiles/
  package.json
  src/
    server/
      index.ts                 → barrel
      schemas.ts               → ProfileSchema, constants, legacy-tolerant parsing
      getProfile.ts            → getProfile(uid) — single profile read
    components/
      index.ts                 → barrel
      ProfileLink.svelte       → SSR profile→nick→anchor (zero JS, no client: directive)
      AvatarLink.svelte        → SSR profile→avatar-anchor (sibling to ProfileLink; see ../avatar-link/spec.md)
    i18n/
      index.ts                 → fi, en — locale strings under the profiles namespace
```

#### Schema

```
ProfileSchema (z.object)
  key: string                    ← Firestore doc id, equals uid
  username: string                ← URL-slug-shaped handle (toFid(nick) when missing)
  nick: string                    ← display name; defaults to "N.N." when missing
  avatarURL: string (optional)   ← coalesces from legacy photoURL → avatarURL
  bio: string (optional)
  tags: string[] (optional)
  lovedThreads: string[] (optional)
  links: ProfileLink[] (optional) ← { url: URL, label: string (1..50) }
```

`ProfileLink.svelte` reads only `key` and `nick` from a resolved `Profile`; consumers only need those fields populated when constructing a citation. The rest of the schema serves the future `/profiles/{uid}` page render.

Legacy tolerance is encoded directly via `.preprocess` per the threads-spec pattern — there is no separate `parseProfile()` / `migrateProfile()` wrapper. Coalescings preserved verbatim from v17:

- `photoURL` → `avatarURL` (legacy field name).
- Missing `nick` → `"N.N."`.
- Missing `username` → `toFid(nick)` (slug-derive from the nick).
- `links` array filtered to entries with `{ url: string URL, label: 1..50 chars }`; malformed entries dropped, not rejected.
- `tags` and `lovedThreads` filtered to string arrays; non-strings dropped, not rejected.
- Missing optional fields stay absent (no `.default([])` for `tags`, `lovedThreads`, `links` — consumers handle `undefined`).

**Storage:** `profiles/{uid}` Firestore doc. v17 contract preserved verbatim. Constant: `PROFILES_COLLECTION_NAME = 'profiles'`.

#### Server accessor (`./server`)

- **`getProfile(uid: string): Promise<Profile | null>`**
  - Reads `profiles/{uid}` via `firebase-admin`. Returns `null` on missing doc, `"-"` / empty uid, and parse failure.
  - On parse failure, calls `logError` so the malformed doc is observable.
  - Pages render N citations by resolving N profiles upstream (`Promise.all(uids.map(getProfile))` in Astro frontmatter), then passing each resolved `Profile | null` into `<ProfileLink profile={...} />`. No batch primitive in the package; if a real scale problem ever surfaces, that's a separate spec.

#### Components (`./components`)

- **`ProfileLink.svelte`** — SSR Svelte component. One prop shape:
  - `<ProfileLink profile={profile} anonymousLabel={t("profiles:anonymous.nick")} />` — receives a pre-resolved `Profile | null | undefined`. Renders synchronously. No async, no fetch, no atom.
  - Render states:
    - **Resolved (`profile` is non-null):** `<a href="/profiles/{key}">{nick}</a>`.
    - **Nullish (`profile` is null/undefined):** `<span>{anonymousLabel}</span>` (no link). Covers empty uid, `"-"` sentinel, not-found, and parse-failure cases — all of which produce `null` at the `getProfile` boundary upstream.
- **Composition.** Astro pages (`*.astro`) and Svelte components (`*.svelte`) both compose `ProfileLink` directly. Astro renders Svelte components at SSR without a `client:*` directive, shipping zero JS. The component is mountable in either context with no syntax difference.
- The anchor target `/profiles/{uid}` is not built yet; it 404s during alpha and starts resolving when the profile-page spec lands.
- **i18n consumption pattern:** the package ships locale strings under `./i18n` (`profiles:anonymous.nick`); the host wires them into its `createT` registry (see `app/pelilauta/src/i18n.ts`); call sites pass the resolved string in via `anonymousLabel`. Mirrors how `ThreadCard` consumes `t("profiles:anonymous.nick")` in `TopThreadsStream.astro`.

#### Anonymous-uid sentinel

The `"-"` string is a load-bearing sentinel that appears in `Thread.owners[0]` and `Thread.author` when no real owner is set ("anonymous author" / "deleted user", per [`threads/spec.md`](../threads/spec.md) §"-" owner sentinel). `getProfile("-")` and `getProfile("")` both short-circuit to `null` before any Firestore read. Consumers passing the resulting `null` into `<ProfileLink>` get the anonymous fallback render. The component itself doesn't know about the sentinel — it lives entirely in the accessor.

#### Dependencies

- [`@pelilauta/firebase`](../firebase/spec.md) — `firebase-admin` for profile reads.
- [`@pelilauta/utils`](../models/spec.md) — `toFid()`, `logError`.
- [`@pelilauta/i18n`](../i18n/spec.md) — `NestedTranslation` type for the `./i18n` locale exports.
- `svelte` — for `./components`.

#### Constraints

- **The package is SSR-only.** No `firebase/client`, no `nanostores`, no Svelte component imports anywhere in `packages/profiles/src/**`. Enforced by a `noRestrictedImports` override in `biome.json`.
- **Profiles MUST NOT import from `@pelilauta/auth`.** Account state and profile state share a uid as a join key; nothing else. The session store's projected `SessionProfile` is a snapshot from claims, not a profile-doc read; that mechanism stays in auth.
- **Anonymous fallback is the safe behaviour.** Every "uid not found", every empty/sentinel uid, every parse failure resolves to the anonymous label. No surface ever shows a raw uid as text. No surface ever 5xxs because of a malformed legacy doc.
- **Storage shape is preserved verbatim.** `profiles/{uid}` document fields, the legacy `photoURL` coalesce, the v17 `parseProfile` quirks — all preserved.
- **Apps never override the package.** Pages MUST NOT inline a profile-link rendering with bare `<a>` tags. Use `ProfileLink`.

### Out of Scope

- **`/profiles/{uid}` page route.** Separate feature spec. ProfileLink anchors to it during alpha and 404s until that route lands; that's intentional.

## Contract

### Definition of Done

- [ ] `packages/profiles/` exists as a pnpm workspace package named `@pelilauta/profiles`, picked up by `pnpm-workspace.yaml`.
- [ ] Three sub-exports in `package.json`: `./server`, `./components`, `./i18n`.
- [ ] `ProfileSchema` ported with legacy tolerance encoded directly via `.preprocess`. No standalone `parseProfile()` / `migrateProfile()` wrappers.
- [ ] `getProfile(uid)` returns `null` on missing doc, `"-"` / empty uid, and parse failure (with `logError` on parse failure).
- [ ] `ProfileLink.svelte` accepts `{ profile?: Profile | null; anonymousLabel?: string }`. Renders an anchor for resolved profiles; `<span>{anonymousLabel}</span>` for nullish.
- [ ] Package source is SSR-only: enforced by `biome.json` `noRestrictedImports` override on `packages/profiles/src/**`. Consumers MUST NOT mount `ProfileLink` with a `client:*` directive.
- [ ] `./i18n` ships `profiles:anonymous.nick` (fi: "Tuntematon"; en: "Anonymous"), wired into `app/pelilauta/src/i18n.ts`.
- [ ] `pnpm check`, `pnpm check:types`, `pnpm test`, `pnpm build` all green.

### Regression Guardrails

- **Profiles MUST NOT import from `@pelilauta/auth`.** A value or type import from the auth package is a structural bug.
- **The package is SSR-only.** No `firebase/client` or `nanostores` under `packages/profiles/src/**`. Enforced by `biome.json`. `ProfileLink.svelte` MUST be rendered without a `client:*` directive at consumption sites.
- **Storage shape is preserved.** No renames, no retypes, no structural moves on `profiles/{uid}`. The `photoURL → avatarURL` coalesce stays.
- **Anonymous fallback is the universal not-found path.** No surface shows a raw uid; no surface shows "undefined" or empty-string display; no surface 5xxs because of a malformed profile doc.
- **`"-"` and empty string are treated identically.** Both short-circuit `getProfile` to `null` and `<ProfileLink>` to the anonymous fallback before any Firestore read.
- **Parse failures degrade to `null`, never throw.** `logError` is called so malformed docs are observable.

### Testing Scenarios

#### Scenario: ProfileSchema parses a valid doc

```gherkin
Given a Firestore profiles/{uid} document with key, username, nick, and avatarURL
When ProfileSchema.parse(doc) is called
Then the result has all four fields preserved
And no field is added beyond the schema's declared shape
```

#### Scenario: ProfileSchema falls back nick to "N.N." when missing

```gherkin
Given a profile doc missing the nick field
When ProfileSchema.parse(doc) is called
Then the result has nick === "N.N."
```

#### Scenario: ProfileSchema coalesces legacy photoURL into avatarURL

```gherkin
Given a profile doc with photoURL set and avatarURL absent
When ProfileSchema.parse(doc) is called
Then the result has avatarURL set to the photoURL value
And the photoURL field is not present on the result
```

#### Scenario: ProfileSchema derives username from nick when missing

```gherkin
Given a profile doc with nick "Ada Lovelace" and no username
When ProfileSchema.parse(doc) is called
Then the result has username derived via toFid("Ada Lovelace")
```

#### Scenario: ProfileSchema filters malformed link entries

```gherkin
Given a profile doc whose links array contains one valid entry { url, label } and one entry missing label
When ProfileSchema.parse(doc) is called
Then the result has links of length 1
And the malformed entry is silently dropped
```

#### Scenario: getProfile returns null on missing or unparseable doc

```gherkin
Given no profile doc exists at profiles/uid-x
Or the doc at profiles/uid-x fails ProfileSchema.parse
When getProfile("uid-x") is called
Then the result is null
And no exception is thrown
```

#### Scenario: getProfile short-circuits the "-" sentinel and empty uid

```gherkin
Given uid is "-" or the empty string
When getProfile(uid) is called
Then the result is null
And no Firestore read is issued
```

#### Scenario: ProfileLink renders an anchor when given a profile

```gherkin
Given <ProfileLink profile={ key: "uid-a", nick: "Ada", username: "ada" } /> is rendered at SSR
When the page output is inspected
Then an <a> element targets href="/profiles/uid-a"
And the link text is "Ada"
```

#### Scenario: ProfileLink renders the anonymous fallback when profile is nullish

```gherkin
Given <ProfileLink profile={null} anonymousLabel="Anonymous" /> is rendered at SSR
When the page output is inspected
Then a <span> contains "Anonymous"
And no <a> element is emitted

Given <ProfileLink anonymousLabel="Anonymous" /> (profile prop omitted) is rendered at SSR
When the page output is inspected
Then a <span> contains "Anonymous"
And no <a> element is emitted
```

## Migration Debt and Decisions

> Captured for the user's review during v20 implementation. NOT part of the v20 contract.

### Bugs / anomalies in the v17 source (do not propagate)

- **`stores/profiles/index.ts` declares its own `PublicProfileSchema`** distinct from `ProfileSchema`. v20 collapses to one schema file with both shapes side-by-side and consistent naming (`ProfileSchema` + `ProfileSummarySchema`).
- **v17 has both `parseProfile` and `migrateProfile`** with overlapping legacy-handling logic. v20 folds all legacy handling into `ProfileSchema.parse()` via `.preprocess` — single entry point.
- **i18n key inconsistency.** v17 `ProfileLink.svelte` uses `t("app.anonymous.nick")` (dot-separated, host namespace); `stores/profiles/index.ts` uses `t('app:meta.anonymous')` (colon namespace, different key). v20 standardises on `profiles:anonymous.nick` owned by the package.
- **`fetchProfileEntry` is marked deprecated in v17** but still used. Drop in v20 — `getProfileSummaries` covers the batch case.
- **The `migrateProfile` `links` filter chain** does the same job twice (manual filter then `ProfileLinkSchema.safeParse`). v20's single `.preprocess` on `ProfileSchema.links` does it once.

### Decisions for v20

1. **URL slug for the profile page** _(decided 2026-04-29)_: ProfileLink emits `/profiles/{uid}`. Rationale: uid is stable and always present; username is slug-derived from nick on first save with no collision enforcement, so it's not safe as the canonical identity link.
2. **ProfileLink prop shape** _(decided 2026-04-29)_: single `profile` prop. The component does not fetch; pages resolve profiles upstream via `getProfile` and pass the result in. Earlier drafts proposed a uid-prop auto-fetch shape; dropped because it encourages per-render Firestore reads inside leaf components.
3. **Anonymous fallback copy and rationale** _(decided 2026-04-29)_: "Tuntematon" (fi) / "Anonymous" (en) — preserved from v17. Load-bearing: when a user deletes their account, their content (threads, replies) intentionally stays as part of the community history (per repeated EULA warnings before deletion). The anonymous label is what readers see in place of the deleted user's citation. The schema-level `"N.N."` fallback (used when a profile doc exists but has no nick) is a *separate* state and stays distinct: `"N.N."` means "active user who hasn't set a nick"; the anonymous label means "deleted user / unknown uid / `-` sentinel". Both states must remain distinguishable in surfaces and logs.
