---
feature: Threads (Discussions Sub-App)
---

# Feature: Threads (Discussions Sub-App)

## Blueprint

### Context

The Threads package owns the entire "Discussions" vertical of Pelilauta — schema, CRUD operations, UI components, data fetching, channel directory, and locale strings for forum threads and their replies. This is the primary content type on the platform: users create discussion threads in channels, reply to them, react with loves, and optionally syndicate to Bluesky.

### Architecture

- **Package:** `packages/threads/`
- **Firestore storage** (v17 contract preserved verbatim — no breaking data changes):
  - `stream/{threadKey}` — thread documents
  - `stream/{threadKey}/comments/{replyKey}` — reply sub-collection
  - `meta/threads` — single document holding the channel directory in a `topics` array field. Path constant: `CHANNELS_META_REF = 'meta/threads'`.

#### Module Structure

```
packages/threads/
  src/
    schemas/
      ThreadSchema.ts        → Zod schema (legacy-tolerant), Thread type, createThread() factory
      ReplySchema.ts         → Zod schema (legacy-tolerant), Reply type
      ChannelSchema.ts       → Zod schema (legacy-tolerant), Channel type, constants
    api/
      getThreads.ts          → paginated query by flowTime/createdAt, channel/visibility filters
      getThread.ts           → single thread by key
      getReplies.ts          → replies for a thread
      getChannels.ts         → full channel directory (read-through cache)
      writeThread.ts         → write thread doc + update channel metadata (uses createThread() factory for blanks)
      updateThread.ts        → update thread fields
      deleteThread.ts        → delete thread + replies
      addReply.ts            → write reply + increment replyCount + update flowTime
      updateReply.ts         → update reply content
      deleteReply.ts         → delete reply
      reactions.ts           → love/unlove + count tracking
      bluesky.ts             → syndication: post to Bluesky, store URI/URL on thread
    server/                  → SSR-safe re-exports (schemas, types, read-only fetches)
    client/                  → Client-only exports (writes, listeners, interactive UI)
    components/              → Svelte 5 / Astro UI components
      ThreadCard.svelte      → preview card used in lists/streams (built on cn-card)
      ThreadDetail.svelte    → full thread view with metadata
      ThreadEditor.svelte    → create/edit form (title, content, channel, tags, files)
      DiscussionSection.svelte → reply list with real-time Firestore listener
      ReplyArticle.svelte    → single reply display
      ReplyDialog.svelte     → compose/edit reply
      BlueskyCard.svelte     → syndication status display
    i18n/
      index.ts               → exports fi, en — locale strings for the threads namespace
```

#### Sub-path Exports

| Export path | Contains | Safe for SSR? |
|---|---|---|
| `@pelilauta/threads/server` | Schemas, types, read-only accessors (`getThreads`, `getThread`, `getReplies`, `getChannels`), constants | Yes |
| `@pelilauta/threads/client` | Write operations, Firestore `onSnapshot` listeners, interactive Svelte components | No (client only) |
| `@pelilauta/threads/components` | Svelte / Astro components (some SSR-renderable, some need `client:` directive) | Partial |
| `@pelilauta/threads/i18n` | `export const fi`, `export const en` — locale strings only, no runtime code | Yes |

#### Thread Schema (v20)

Extends `ContentEntrySchema` from `@pelilauta/models`:

```
ThreadSchema extends ContentEntrySchema
  title: string (required)
  channel: string (required)
  siteKey: string (optional)
  poster: string (optional, URL)
  images: ImageArray (optional, [{url, alt}])
  replyCount: number (optional, default 0)
  lovedCount: number (optional, default 0)
  labels: string[] (optional, admin-managed)
  youtubeId: string (optional)
  quoteRef: string (optional, thread key for quotes)
  blueskyPostUrl: string (optional, URL)
  blueskyPostUri: string (optional, AT Protocol URI)
  blueskyPostCreatedAt: Date (optional)
  owners: string[] (min 1)
  author: string (derived from owners[0])
```

#### Reply Schema (v20)

Extends `ContentEntrySchema` from `@pelilauta/models`:

```
ReplySchema extends ContentEntrySchema
  images: ImageArray (optional)
  quoteRef: string (optional)
  threadKey: string (required)
  owners: string[] (min 1)
```

#### Channel Schema (v20)

**Not** an Entry — channels are stored as an array of plain objects on the `meta/threads` document. v17 contract is preserved verbatim.

```
ChannelSchema (z.object)
  slug: string (required, also acts as the identity)
  name: string (required)
  description: string (default "")
  icon: string (default "discussion")
  threadCount: number (default 0)
  category: string (optional, no default — see below)
  flowTime: number (optional)
  latestThread: { key, createTime, author }? (denormalised snapshot, EntryMetadataSchema)
  latestReply:  { key, createTime, author }? (denormalised snapshot, EntryMetadataSchema)

ChannelsSchema = z.array(ChannelSchema)
```

`ChannelSchema` is ported from v17 with one deliberate change: it does NOT coalesce `category` to a default. Other coalescings (`description: ''` when missing, `icon: 'discussion'` when missing, `flowTime: 0` when missing) are preserved and encoded directly on the schema via `.default(...)` / `z.preprocess(...)`. Legacy docs without `category` parse with `category: undefined`; consumers handle that. Call sites use `ChannelSchema.parse(raw)` — there is no separate `parseChannel()` wrapper.

**Constants** (`packages/threads/src/schemas/ChannelSchema.ts`):
- `CHANNELS_META_REF = 'meta/threads'`
- `CHANNEL_DEFAULT_SLUG = 'yleinen'`
- `CHANNEL_DEFAULT_ICON = 'discussion'`

#### Accessor Surfaces

- `getThreads(limit: number, options?: { order?: 'flowTime' | 'createdAt'; public?: boolean }): Promise<Thread[]>`
  - Defaults: `order = 'flowTime'`, `public = true`. Mirrors storage field names — `public` is the on-disk boolean, not a renamed alias.
- `getThread(key: string): Promise<Thread | undefined>`
- `getReplies(threadKey: string): Promise<Reply[]>`
- `getChannels(): Promise<Channel[]>` — reads the `meta/threads` doc, parses `topics` through `ChannelsSchema`, returns the array. Module-level cached; cache invalidated on channel writes.

#### i18n

The `./i18n` sub-export ships only static locale data — no runtime, no side effects. Initial owned key set:

- `threads:card.inChannel` — label preceding a channel link on a thread card.
- `threads:frontpage.showMore` — "show more" link text on front-page streams.
- `threads:frontpage.error.fetchFailed` — error block text on front-page streams.

The host (`app/pelilauta/src/i18n.ts`) imports from `@pelilauta/threads/i18n` and assigns the trees to the `threads` namespace. See [`../i18n/spec.md`](../i18n/spec.md) for the engine contract and host composition rules.

### Dependencies

- `@pelilauta/models` — `ContentEntrySchema`, `EntrySchema`, `ImageArraySchema`, `toDate()`
- `@pelilauta/firebase/server` — server-side Firestore reads for SSR _(spec name; physical path TBD per `specs/pelilauta/firebase/spec.md`)_
- `@pelilauta/firebase/client` — client-side Firestore writes, listeners, auth _(spec name; physical path TBD)_
- `@pelilauta/i18n` — used only for the `NestedTranslation` type by the `./i18n` sub-export
- `zod` — schema validation

### Constraints

- **No breaking data contract changes.** Firestore document shapes from v17 (threads, replies, the `meta/threads` channels array) are preserved verbatim. v20 may add optional fields with `.default()` on schemas — never rename, retype, or restructure existing fields.
- **The `server/` entry point is the only path that imports `@pelilauta/firebase/server`.** The `client/` entry point exclusively uses `@pelilauta/firebase/client`. Mixing breaks SSR/CSR isolation.
- **Page-level Astro components live in `app/pelilauta`.** This package owns schemas, accessors, and reusable components — not routes.
- **Schemas extend `ContentEntrySchema` / `EntrySchema` from `@pelilauta/models`.** Field shapes are not duplicated.
- **SSR uses one-shot queries.** Real-time `onSnapshot` listeners run only after client hydration.
- **Accessor parameter names mirror storage field names.** `getThreads({ public })` because storage uses `public`. No API-level renames that diverge from the on-disk shape.
- **`./i18n` sub-export is locale strings only.** No runtime code, no side effects, no imports beyond the `NestedTranslation` type.
- **Host owns the `threads` namespace assignment.** This package proposes the namespace name in this spec; the host's i18n composition seam decides where the strings hang.

## Contract

### Definition of Done

DoD is split across three ship stages so incremental commits can land green
without having to satisfy clauses that depend on later stages. Stages are
cumulative: stage 2 assumes stage 1 is green, stage 3 assumes stage 2.

#### Scaffold DoD (Stage 1 — empty package shell)

- [ ] `packages/threads` exists as a pnpm workspace package named `@pelilauta/threads`, picked up by `pnpm-workspace.yaml`
- [ ] All four sub-exports declared in `package.json`: `./server`, `./client`, `./components`, `./i18n` (empty barrels permitted until the stage that populates them)
- [ ] Module directories exist per §Module Structure: `src/{schemas,api,server,client,components,i18n}/`
- [ ] Workspace dependencies listed in `package.json`: `@pelilauta/models`, `@pelilauta/firebase`, `@pelilauta/i18n`, `zod`; dev deps sufficient for vitest + svelte component tests
- [ ] `vitest.config.ts` present; mirrors the `envPrefix` / `envDir` convention used by `packages/firebase`
- [ ] `server/` barrel has zero client SDK imports (trivially true while empty; becomes load-bearing at stage 2)
- [ ] Package passes `pnpm check`

#### Read & Render DoD (Stage 2 — unblocks `TopThreadsStream`)

- [ ] `ThreadSchema`, `ReplySchema`, and `ChannelSchema` validate against legacy Firestore data unchanged, with legacy tolerance encoded directly on the schema (no separate `parseX()` wrapper — callers use `Schema.parse(raw)`)
- [ ] `ThreadSchema.parse(raw)` accepts legacy data (string images → `[{url, alt}]`, missing author → derived from `owners[0]`, Timestamp → Date) via `z.preprocess` / `.transform` on the schema
- [ ] `ChannelSchema.parse(raw)` is ported from v17 with `category` default removed; other coalescings (`description`, `icon`, `flowTime`) preserved via `.default(...)`
- [ ] `createThread(source?, key?)` factory exported from `schemas/ThreadSchema.ts` — returns a fully-populated `Thread` with defaults filled in (blank titles, empty owners sentinel, current timestamps). Does NOT write to Firestore.
- [ ] `getThreads(limit, { order, public })` returns `Thread[]` with documented defaults (`order='flowTime'`, `public=true`)
- [ ] `getReplies(threadKey)` returns `Reply[]` sorted by `createdAt` ascending
- [ ] `getChannels()` reads `meta/threads`, parses `topics` through `ChannelsSchema`, returns the array
- [ ] `i18n/index.ts` exports `fi` and `en` trees containing at least the initial owned key set above
- [ ] `ThreadCard.svelte` renders a thread as a card built on `cn-card`
- [ ] `server/` entry still has zero client SDK imports now that it carries real content
- [ ] Vitest scenarios below that reference schemas, read accessors, `ThreadCard`, and i18n pass
- [ ] `passWithNoTests` removed from `vitest.config.ts`

#### Writes & Syndication DoD (Stage 3 — user authorship)

- [ ] CRUD operations for threads (create/update/delete) work via the `client/` API
- [ ] CRUD operations for replies (add/update/delete) work via the `client/` API
- [ ] Adding a reply bumps the parent thread's `flowTime` and increments `replyCount`
- [ ] Deleting a thread cascades to its reply sub-collection
- [ ] Love/unlove reactions update `lovedCount` atomically
- [ ] Bluesky syndication creates posts and stores `blueskyPostUri` / `blueskyPostUrl` / `blueskyPostCreatedAt` on the thread
- [ ] `ThreadDetail`, `ThreadEditor`, `DiscussionSection`, `ReplyArticle`, `ReplyDialog`, and `BlueskyCard` components render
- [ ] `DiscussionSection`'s real-time `onSnapshot` listener runs only after client hydration (never during SSR)
- [ ] Vitest scenarios below that reference writes and syndication pass

### Regression Guardrails

- `ThreadSchema` must always require `title`, `channel`, and `owners` (min 1).
- `flowTime` must update when a reply is added (bumps thread in stream).
- Deleting a thread must also delete its reply sub-collection.
- `server/` must not import any `firebase/firestore` client modules.
- The `meta/threads` channels storage shape MUST NOT change. Any "modernization" to per-doc storage is a breaking data contract change and out of scope for v20.
- `getThreads`'s parameter names MUST remain mirrors of storage field names. If storage adds/renames a field, accessors track it; accessors do not invent independent names.
- The `threads` namespace key in the i18n composition is informally proposed by this package; the host file is authoritative. This spec MUST NOT assert a namespace claim that bypasses the host seam.

### Testing Scenarios

#### Scenario: Parse thread from Firestore document

```gherkin
Given a raw Firestore document with Timestamp fields and legacy string images
When parsed through ThreadSchema.parse()
Then dates are converted to Date objects
And string images are converted to [{url, alt}] format
And a valid Thread is returned
```

- **Vitest Unit Test:** `packages/threads/src/schemas/ThreadSchema.test.ts`

#### Scenario: createThread factory produces a valid blank Thread

```gherkin
Given no source object
When createThread() is called
Then the returned Thread satisfies ThreadSchema.parse() as a valid Thread
And createdAt/updatedAt are set to the current time
And owners is a non-empty array (sentinel "-" when no author supplied)
And replyCount and lovedCount are 0

Given a partial source object with { title: "X", channel: "yleinen" }
When createThread(source) is called
Then title and channel are preserved from source
And missing fields receive factory defaults
```

- **Vitest Unit Test:** `packages/threads/src/schemas/ThreadSchema.test.ts`

#### Scenario: getThreads returns paginated public threads

```gherkin
Given the stream collection has 20 public threads
When getThreads(10) is called with default options
Then 10 threads are returned sorted by flowTime descending
And only documents with public=true are included
```

- **Vitest Unit Test:** `packages/threads/src/api/getThreads.test.ts`

#### Scenario: getThreads honours an order override

```gherkin
Given the stream collection has 20 public threads
When getThreads(10, { order: 'createdAt' }) is called
Then 10 threads are returned sorted by createdAt descending
```

- **Vitest Unit Test:** `packages/threads/src/api/getThreads.test.ts`

#### Scenario: getChannels reads the meta/threads topics array

```gherkin
Given the meta/threads document contains a topics array of 5 channel objects
When getChannels() is called
Then 5 Channel objects are returned, each parsed through ChannelSchema
And channel.icon defaults to "discussion" when missing on a doc
And channel.category is undefined when missing on a doc (no implicit default)
```

- **Vitest Unit Test:** `packages/threads/src/api/getChannels.test.ts`

#### Scenario: ChannelSchema does not default category

```gherkin
Given a channel object missing the category field
When parsed through ChannelSchema.parse()
Then the result has category === undefined
And other missing fields receive their documented defaults (description "", icon "discussion", flowTime 0)
```

- **Vitest Unit Test:** `packages/threads/src/schemas/ChannelSchema.test.ts`

#### Scenario: Reply bumps thread flowTime

```gherkin
Given a thread with flowTime T
When a reply is added
Then the thread's flowTime is updated to a value greater than T
And replyCount is incremented by 1
```

- **Vitest Unit Test:** `packages/threads/src/api/addReply.test.ts`

#### Scenario: Threads i18n sub-export ships the initial key set

```gherkin
Given a Locales registry assembled by the host that assigns @pelilauta/threads/i18n to the "threads" namespace
When the host-bound t resolves "threads:frontpage.showMore" with locale "fi"
Then it returns a non-empty Finnish string
And the same key resolves to a non-empty English string for locale "en"
```

- **Vitest Unit Test:** `packages/threads/src/i18n/index.test.ts`
