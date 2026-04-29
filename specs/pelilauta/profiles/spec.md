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

The first feature of this package is **`ProfileLink`** — an SSR-by-default citation of a uid as a clickable link. Twenty-four v17 surfaces consume it (channels, thread cards, thread list items, thread detail, replies, search, sites, inbox, admin, history, tags). Most mount it as `client:only="svelte"` purely because v17 had no SSR variant. The v20 SSR variant is the unblocker for those surfaces; in particular, [`channels/spec.md`](../channels/spec.md) and the future thread-card spec are blocked on it.

Reverse-engineered from `pelilauta-17` sources at:

- `src/components/svelte/app/ProfileLink.svelte` — the CSR component
- `src/schemas/ProfileSchema.ts` — full profile schema + parser/migrator
- `src/stores/profiles/index.ts` — CSR cache + `PublicProfileSchema` (the lighter shape)
- `src/pages/api/profiles/[uid].json.ts` — public read endpoint
- `src/pages/profiles/[uid].astro` — profile page (out of scope for v20 MVP)

### Architecture

#### Package

- **Location:** `packages/profiles/` (workspace module, not independently published — shares the v20 release cycle).
- **Sub-exports** (mirror the auth-package shape):
  - `./server` — SSR-safe schemas, types, server accessors (`getProfile(uid)`, `getProfileSummaries(uids[])`). Zero `firebase/client` imports. Importable from `.astro` frontmatter.
  - `./client` — CSR-only profile cache atom + `getProfileAtom(uid)` for reactive components. Imports `@pelilauta/firebase/client`. Anonymous-reachable host modules use `import type` only.
  - `./components` — Svelte 5 / Astro UI components. SSR `ProfileLink.astro` is the first inhabitant.
  - `./i18n` — locale strings owned by the package.

```
packages/profiles/
  package.json              → name @pelilauta/profiles, sub-export map
  src/
    server/
      index.ts              → barrel
      schemas.ts            → ProfileSchema, ProfileSummarySchema, constants, legacy-tolerant parsing
      getProfile.ts         → getProfile(uid) — single profile, full shape
      getProfileSummaries.ts → getProfileSummaries(uids[]) — deduped batch resolver, summary shape only
    client/
      index.ts              → barrel
      profileCache.ts       → persistent atom + getProfileAtom(uid) reactive accessor
    components/
      index.ts              → barrel
      ProfileLink.astro     → SSR-by-default citation; renders <a href="/profiles/{uid}">{nick}</a> or anonymous fallback
    i18n/
      index.ts              → exports fi, en — locale strings under the profiles namespace
```

#### What stays in `app/pelilauta/`

- `pages/profiles/[uid].astro` — profile-page route (composition; consumes `getProfile(uid)` from the package).
- `pages/api/profiles/[uid].json.ts` — public read endpoint. Profiles package provides the schema + accessor; the host owns the API route. This mirrors v17's placement and the host-owns-routes rule. May relocate into the package in a future spec if other patterns warrant it.

#### Schemas

Two schemas are exported, with deliberate shape differences:

- **`ProfileSchema`** — full profile. Returned by `GET /api/profiles/{uid}.json` and consumed by `/profiles/{uid}` page rendering.
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

- **`ProfileSummarySchema`** — light shape for citations. Returned by the batch resolver, consumed by `ProfileLink` and any other surface citing a user.
  ```
  ProfileSummarySchema (z.object)
    key: string                    ← uid
    nick: string
    avatarURL: string (optional)
    username: string                ← URL slug
  ```

Legacy tolerance is encoded directly on `ProfileSchema` (and `ProfileSummarySchema`) via `.preprocess` / `.transform` per the threads-spec pattern — there is no separate `parseProfile()` / `migrateProfile()` wrapper. Coalescings preserved verbatim from v17:

- `photoURL` → `avatarURL` (legacy field name).
- Missing `nick` → `"N.N."`.
- Missing `username` → `toFid(nick)` (slug-derive from the nick).
- `links` array filtered to entries with `{ url: string URL, label: 1..50 chars }`; malformed entries dropped, not rejected.
- `tags` and `lovedThreads` filtered to string arrays; non-strings dropped, not rejected.
- Missing optional fields stay absent (no `.default([])` for `tags`, `lovedThreads`, `links` — consumers handle `undefined`).

**Storage:** `profiles/{uid}` Firestore doc. v17 contract preserved verbatim. Constant: `PROFILES_COLLECTION_NAME = 'profiles'`.

#### Server accessors (`./server`)

- **`getProfile(uid: string): Promise<Profile | null>`**
  - Reads `profiles/{uid}` via `firebase-admin`. Returns `null` when the doc is missing or fails parse. Errors propagate (do not swallow) — caller handles.
  - Used by the `/profiles/{uid}` page render and the `/api/profiles/{uid}.json` endpoint.
- **`getProfileSummaries(uids: string[]): Promise<Map<string, ProfileSummary | null>>`**
  - Deduped batch fetcher. Strips falsy and `"-"` (anonymous sentinel) from input. Issues one `getAll` (or batched `getDoc` parallel) call per cache miss. Returns a Map from uid to `ProfileSummary | null` (`null` for not-found).
  - Used by every page that pre-resolves a list of citations upstream — channels directory, thread card, search results, history, etc.
  - Rationale: rendering N profile links one-at-a-time is N Firestore reads; batching turns it into 1.

#### Client accessor (`./client`)

- **`getProfileAtom(uid: string): ReadableAtom<ProfileSummary | undefined>`**
  - Returns a nanostores atom that resolves to `undefined` while loading and to a `ProfileSummary` when ready (or to the anonymous fallback when not-found / error).
  - Backed by a `persistentAtom('profiles', {})` keyed-cache (localStorage). Same persistence model as v17.
  - Subscribes lazy-fetch the profile from `GET /api/profiles/{uid}.json` if not cached.
  - Used only by surfaces that need *reactive* updates (e.g. settings page where the user is editing their own nick). Most profile-citation use cases prefer the SSR path.

#### Components (`./components`)

- **`ProfileLink.astro`** — SSR-by-default. Two prop shapes (mutually exclusive):
  - `<ProfileLink profile={summary} />` — receives a pre-resolved `ProfileSummary`. Renders synchronously. **Preferred** for pages that already batch-resolve their citations upstream.
  - `<ProfileLink uid={uid} />` — receives a uid only; the component awaits `getProfile(uid)` at SSR time. Fallback for one-off citations where upstream pre-resolution is overkill. Single Firestore read per call — do not use this in lists.
  - Render states (both prop shapes):
    - **Empty / `"-"` sentinel / not-found:** render the anonymous label inside a `<span>` (no link). Uses i18n key `profiles:anonymous.nick`.
    - **Resolved:** `<a href="/profiles/{key}">{nick}</a>` — `{key}` is the uid. The link uses the default DS link styling; no special `cn-nick` class. (v17 used `<a class="cn-nick">`; v20 defers that DS reverse-spec — see Migration Debt — and ships a plain link in the meantime.)
  - The SSR variant has **no loading state**. Data is resolved synchronously by the time the component renders.

A CSR sibling (`ProfileLink.svelte`) is **not** part of MVP. It lands when an actual reactive use case (e.g. settings page subscribing to the cache) requires it. See §Out of Scope.

#### API contracts

- **`GET /api/profiles/{uid}.json`** — public profile fetch endpoint. Owned by the host (`app/pelilauta/src/pages/api/profiles/[uid].json.ts`).
  - **Body:** `ProfileSchema`-shaped JSON.
  - **Headers:** `ETag` (sha1 of body), `Cache-Control: s-maxage=60, stale-while-revalidate=300`. `If-None-Match` honoured (`304` on match). v20 adds the ETag (v17 did not have one).
  - **Status codes:** `200` on found; `400` on missing uid path param; `404` on profile not found.
  - Anonymous-reachable. No authentication required.

#### Anonymous-uid sentinel

The `"-"` string is a load-bearing sentinel that appears in `Thread.owners[0]` and `Thread.author` when no real owner is set ("anonymous author" / "deleted user", per [`threads/spec.md`](../threads/spec.md) §"-" owner sentinel). The profiles package treats `"-"` and the empty string identically: not a uid, not in the profiles collection, resolves to the anonymous fallback in every surface. `getProfileSummaries(["uid-a", "-", "", "uid-b"])` strips `"-"` and `""` from the query and returns a Map containing only `"uid-a"` and `"uid-b"`.

Callers MUST NOT pass `"-"` to `getProfile(uid)` or `<ProfileLink uid="-">` expecting a doc fetch — both correctly fall through to the anonymous fallback, but the read is wasted.

#### Dependencies

- [`@pelilauta/firebase`](../firebase/spec.md) — `firebase-admin` (server) and `firebase/firestore` (client) for profile reads.
- [`@pelilauta/utils`](../models/spec.md) — `toFid()` (nick-to-slug helper used by username derivation), `logError`, `logDebug`.
- `nanostores` — atoms in `./client`.
- `svelte`, `astro` — `./components`.
- **Profiles MUST NOT import from `@pelilauta/auth`.** Account state and profile state are separate concerns sharing a uid as a join key. The session store knows nothing about profile fields; the profile store knows nothing about claims. A future "edit your own profile" flow consumes both packages but does not collapse them.

#### Constraints

- **`./server` is SSR-safe.** No `firebase/client` imports, no `nanostores` imports, no Svelte component imports. Importable from `.astro` frontmatter without dragging the client SDK into the SSR bundle.
- **Profiles ≠ account.** No imports from `@pelilauta/auth/*`. The session store's projected `SessionProfile` (the signed-in user's own nick/avatar) is a snapshot from claims, not a profile-doc read; that mechanism stays in auth.
- **Anonymous fallback is the safe behaviour.** Every "uid not found", every empty/sentinel uid, every fetch failure resolves to the anonymous label. No surface ever shows a raw uid as text.
- **Storage shape is preserved verbatim.** `profiles/{uid}` document fields, the legacy `photoURL` coalesce, the v17 `parseProfile` quirks — all preserved. v20 adds optional fields with `.default(...)` where useful but renames or restructures nothing.
- **Anonymous-reachable host modules** (e.g. `pages/login.astro`, `pages/index.astro` anonymous branch) MUST `import type` only from `@pelilauta/profiles/client`. Value imports defeat the "anonymous surfaces ship zero CSR for profile cache" guardrail.
- **Apps never override the package.** Pages and consumers MUST NOT inline a profile-link rendering with bare `<a>` tags. Use `ProfileLink`. Missing affordances (e.g. inline avatar, hover card) are profiles-package bugs to escalate, not patch-at-call-site exceptions.

### Out of Scope (deferred to future specs)

- **`/profiles/{uid}` page.** The profile-page route is a separate feature spec under this package once MVP ProfileLink ships. It will own the page chrome, bio rendering, links section, etc.
- **CSR `ProfileLink.svelte`.** Not in MVP. Lands when a reactive use case demands it.
- **Profile editing UX (`ProfileTool` and friends).** v17 has a `ProfileTool.svelte` for editing your own nick/bio/avatar/links. v20 will spec this separately as the second feature of the profiles package, gated by the auth/session boundary.
- **Avatar variants.** `ProfileLink` shows the nick text only in MVP. An avatar-prefixed variant (`<ProfileChip>` or similar) is a future component once cyan has a chip primitive.
- **Profile search / discovery.** Not part of MVP.
- **Migration of v17 `migrateProfile` legacy handling.** v17 has both `parseProfile` (canonical) and `migrateProfile` (a one-time fix-up for very old docs). v20 folds the legacy field handling into `ProfileSchema` itself via `.preprocess` so all parses are migration-tolerant; the standalone `migrate*` function is not ported.

## Contract

### Definition of Done

DoD is split across stages. Each stage MUST leave the host build green and MUST NOT regress existing surfaces. Stages are cumulative.

#### Stage 1 — Package shell + ProfileLink + batch resolver

- [ ] `packages/profiles/` exists as a pnpm workspace package named `@pelilauta/profiles`, picked up by `pnpm-workspace.yaml`.
- [ ] All four sub-exports declared in `package.json`: `./server`, `./client`, `./components`, `./i18n`. Empty barrels permitted at scaffold; populated by the rest of this stage.
- [ ] `ProfileSchema` and `ProfileSummarySchema` ported from v17 with legacy tolerance encoded directly via `.preprocess` / `.transform`. No standalone `parseProfile()` / `migrateProfile()` wrappers.
- [ ] `getProfile(uid: string): Promise<Profile | null>` — server accessor, single profile, full shape, returns `null` on missing doc.
- [ ] `getProfileSummaries(uids: string[]): Promise<Map<string, ProfileSummary | null>>` — deduped batch fetcher; strips falsy and `"-"` sentinel from input; one batched read per call.
- [ ] `ProfileLink.astro` ships under `./components`. Accepts `{ profile?: ProfileSummary }` OR `{ uid?: string }`. Renders the resolved nick as a link to `/profiles/{uid}`, or the anonymous fallback `<span>` for empty/sentinel/not-found.
- [ ] `./server` has zero `firebase/client` imports and zero Svelte/Astro imports. Importable from `.astro` frontmatter.
- [ ] `./client` ships `getProfileAtom(uid)` backed by a persistent atom + lazy fetch from `/api/profiles/{uid}.json`, mirroring v17 semantics but living in this package.
- [ ] `./i18n` ships `profiles:anonymous.nick` (fi: "Tuntematon" or v17 equivalent; en: "Anonymous").
- [ ] Existing host-side `pages/api/profiles/{uid}.json.ts` continues to work unchanged at this stage; the package provides the schema + accessor it consumes.
- [ ] No file outside `packages/profiles/` value-imports from `@pelilauta/profiles/client` if it is anonymous-reachable.
- [ ] `pnpm check`, `pnpm check:types`, `pnpm test`, `pnpm build` all green.

#### Stage 2 — Adopt across known consumers

- [ ] `app/pelilauta/src/pages/api/profiles/[uid].json.ts` migrates to import schema + accessor from `@pelilauta/profiles/server` (no behaviour change, just provenance).
- [ ] `/api/profiles/{uid}.json` gains an `ETag` header and honours `If-None-Match` revalidation.
- [ ] At least one consumer surface adopts the SSR `ProfileLink` end-to-end as a proof of integration. Channels directory and the thread card are the canonical first adopters; either ships in this stage and unblocks the other.
- [ ] No surface still mounts `<ProfileLink client:only="svelte" />` as a workaround for the missing SSR variant; remaining CSR uses, if any, must be justified by an actual reactive use case.

### Regression Guardrails

- **Profiles MUST NOT import from `@pelilauta/auth`.** A value import or a type import from the auth package is a structural bug. The two packages share a uid as a join key; nothing else.
- **`./server` MUST NOT import `firebase/client`, `nanostores`, or any Svelte component.** Anything importable from `.astro` frontmatter must remain SSR-safe.
- **Storage shape is preserved.** No renames, no retypes, no structural moves on `profiles/{uid}`. The `photoURL → avatarURL` coalesce stays.
- **Anonymous fallback is the universal not-found path.** No surface ever shows a raw uid; no surface ever shows "undefined" or empty-string display.
- **`"-"` and empty string are treated identically by every accessor and component.** Both resolve to anonymous. `getProfileSummaries(["-"])` returns an empty Map, not `{ "-": null }`.
- **The SSR `ProfileLink` MUST NOT mount Firestore-client code.** A regression that ships the CSR cache atom into the SSR bundle is a bundle-shape regression.

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

#### Scenario: getProfile returns null on missing doc

```gherkin
Given no profile doc exists at profiles/uid-x
When getProfile("uid-x") is called
Then the result is null
And no exception is thrown
```

#### Scenario: getProfileSummaries strips empty and "-" sentinel uids

```gherkin
Given an input array ["uid-a", "-", "", "uid-b"]
When getProfileSummaries(input) is called
Then the underlying batch read targets exactly two ids: uid-a and uid-b
And the returned Map contains entries only for uid-a and uid-b
```

#### Scenario: getProfileSummaries dedupes repeated uids in input

```gherkin
Given an input array ["uid-a", "uid-a", "uid-b", "uid-a"]
When getProfileSummaries(input) is called
Then the underlying batch read targets exactly two ids: uid-a and uid-b
```

#### Scenario: getProfileSummaries returns null for not-found uids

```gherkin
Given uid-a exists in profiles and uid-b does not
When getProfileSummaries(["uid-a", "uid-b"]) is called
Then the returned Map has uid-a -> ProfileSummary
And the returned Map has uid-b -> null
```

#### Scenario: ProfileLink renders the anonymous fallback when uid is empty

```gherkin
Given <ProfileLink uid="" /> is rendered at SSR
When the page output is inspected
Then a <span> contains the value of profiles:anonymous.nick
And no <a> element is emitted
```

#### Scenario: ProfileLink renders the anonymous fallback for the "-" sentinel

```gherkin
Given <ProfileLink uid="-" /> is rendered at SSR
When the page output is inspected
Then a <span> contains the value of profiles:anonymous.nick
And no <a> element is emitted
And no Firestore read is issued for the "-" uid
```

#### Scenario: ProfileLink renders an anchor when given a pre-resolved profile

```gherkin
Given <ProfileLink profile={ key: "uid-a", nick: "Ada", avatarURL: "...", username: "ada" } /> is rendered at SSR
When the page output is inspected
Then an <a> element targets href="/profiles/uid-a"
And the link text is "Ada"
And the element carries the cn-nick class
```

#### Scenario: ProfileLink resolves a uid synchronously at SSR time

```gherkin
Given a profile doc exists at profiles/uid-a with nick "Ada"
When <ProfileLink uid="uid-a" /> is rendered at SSR
Then exactly one Firestore read is issued for uid-a
And the rendered output is an anchor to /profiles/uid-a with text "Ada"
```

#### Scenario: ProfileLink renders the anonymous fallback when the uid is not found

```gherkin
Given no profile doc exists at profiles/uid-x
When <ProfileLink uid="uid-x" /> is rendered at SSR
Then the rendered output is the anonymous fallback <span>
And no <a> element is emitted
```

#### Scenario: /api/profiles/{uid}.json honours ETag revalidation

```gherkin
Given a prior response carried ETag "E1"
When a request arrives with If-None-Match: E1 and the profile doc has not changed
Then the response status is 304 with no body
```

#### Scenario: /api/profiles/{uid}.json returns 404 for missing profile

```gherkin
Given no profile doc exists at profiles/uid-x
When GET /api/profiles/uid-x.json is requested
Then the response status is 404
```

## Migration Debt and Decisions

> Captured for the user's review during v20 implementation. NOT part of the v20 contract.

### Bugs / anomalies in the v17 source (do not propagate)

- **`stores/profiles/index.ts` declares its own `PublicProfileSchema`** distinct from `ProfileSchema`. Two schemas for the same concept in different files — confusing. v20 collapses to one schema file (`packages/profiles/src/server/schemas.ts`) with both shapes side-by-side and consistent naming (`ProfileSchema` + `ProfileSummarySchema`).
- **v17 has both `parseProfile` and `migrateProfile`** with overlapping legacy-handling logic. v20 folds all legacy handling into `ProfileSchema.parse()` via `.preprocess` — single entry point.
- **i18n key inconsistency.** v17 `ProfileLink.svelte` uses `t("app.anonymous.nick")` (dot-separated, host namespace); `stores/profiles/index.ts` uses `t('app:meta.anonymous')` (colon namespace, different key). v20 standardises on `profiles:anonymous.nick` owned by the package.
- **`fetchProfileEntry` is marked deprecated in v17** but still used. Drop in v20 — `getProfileSummaries` covers the batch case and `getProfileAtom` covers the reactive case.
- **`localStorage`-persistent profile cache** raises a privacy question: nicks and avatars get cached on the device per visited uid. Preserved verbatim for v20 parity (CSR ergonomics; the cache only contains data that was already public). Document the implication; revisit if a privacy review surfaces concerns.
- **v17 `<cn-loader inline>` web-component tag** in ProfileLink. The SSR variant has no loading state; the future CSR variant uses the v20 cyan loader primitive.
- **v17 `<a class="cn-nick">` DS class.** Deferred for v20 MVP. ProfileLink ships with a plain default-style link; the cyan-4 reverse-spec for `cn-nick` (or whatever "nick chip" primitive replaces it) is its own future work. When the DS primitive lands, ProfileLink switches to it without a v20-side spec amendment.
- **The `migrateProfile` `links` filter chain** does the same job twice (manual filter then `ProfileLinkSchema.safeParse`). v20's single `.preprocess` on `ProfileSchema.links` does it once.

### Decisions for v20

1. **URL slug for the profile page** _(decided 2026-04-29)_: ProfileLink emits `/profiles/{uid}`. The `/profiles/{uid}` and `/profiles/{username}` routes can both resolve to the same page (a future page-routing concern, not part of this spec); ProfileLink itself always cites by uid. Rationale: uid is stable and always present; username is slug-derived from nick on first save with no collision enforcement, so it's not safe as the canonical identity link.
2. **API route placement** _(decided 2026-04-29)_: `/api/profiles/{uid}.json` stays in the host (`app/pelilauta/src/pages/api/profiles/[uid].json.ts`). The host owns the HTTP shell (status codes, ETag, cache headers); the package provides the schema and `getProfile(uid)` server accessor that the route imports. Matches `pages/api/auth/session.ts`'s placement. Driven by the project-level `ARCHITECTURE.md` §Package boundaries rule — packages serve cognitive boundaries and dependency direction, not multi-host reuse.
3. **Pre-resolved `profile` prop vs. `uid` prop on `ProfileLink`:** ship both. Pages that batch-resolve upstream pass `profile`; one-off citations pass `uid` and accept the per-call read. Document the perf-vs-ergonomics tradeoff so reviewers nudge list-rendering surfaces toward the batch path.
4. **CSR `ProfileLink.svelte` scope for MVP:** **omit it.** Most v17 surfaces mounting CSR ProfileLink were doing so only because no SSR variant existed. Settings (the one true reactive use case) gets the CSR variant when its spec lands.
5. **`cn-nick` DS class** _(decided 2026-04-29 — deferred)_: ProfileLink ships with the default DS link style for v20 MVP. The cyan-4 reverse-spec for a "nick chip" primitive is out of scope here; when that DS primitive lands, ProfileLink adopts it without amending this spec.
6. **Anonymous fallback copy and rationale** _(decided 2026-04-29)_: "Tuntematon" (fi) / "Anonymous" (en) — preserved from v17. Load-bearing: when a former user deletes their account, their content (threads, replies) intentionally stays on the platform as part of the community history (per repeated EULA warnings before deletion). The anonymous label is what readers see in place of the deleted user's citation. The schema-level `"N.N."` fallback (used when a profile doc exists but has no nick) is a *separate* state and stays distinct: `"N.N."` means "active user who hasn't set a nick"; the anonymous label means "deleted user / unknown uid / `-` sentinel". Both states must remain distinguishable in surfaces and logs.

### Surfaces unblocked by Stage 1 (consumers in dependency order)

> Not part of this spec's DoD. Listed here so the integration order is visible.

- [`channels/spec.md`](../channels/spec.md) — directly blocked.
- Thread card (front-page `TopThreadsStream`, channel thread list) — directly blocked.
- Thread list items (channel thread list, search results, history pages, tag pages).
- Thread detail (`ThreadInfoSection`).
- Replies (`ReplyArticle`, `ForkThreadApp`).
- Sites surfaces (players, owners, handout meta, history) — separate spec but consumes the same primitive.
- Inbox notifications, admin pages — lower priority but same primitive.
