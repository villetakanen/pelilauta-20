---
feature: Threads (Discussions Sub-App)
---

# Feature: Threads (Discussions Sub-App)

## Blueprint

### Context

The Threads package owns the entire "Discussions" vertical of Pelilauta — schema, CRUD operations, UI components, and data fetching for forum threads and their replies. This is the primary content type on the platform: users create discussion threads in channels, reply to them, react with loves, and optionally syndicate to Bluesky.

### Architecture

- **Package:** `packages/threads/`
- **Firestore collections:**
  - `stream/{threadKey}` — thread documents
  - `stream/{threadKey}/comments/{replyKey}` — reply sub-collection

#### Module Structure

```
packages/threads/
  src/
    schemas/
      ThreadSchema.ts       → Zod schema, Thread type, parseThread(), createThread()
      ReplySchema.ts         → Zod schema, Reply type, parseReply()
    api/
      fetchThreads.ts        → paginated query by flowTime, channel filter
      fetchThread.ts         → single thread by key
      fetchReplies.ts        → replies for a thread
      createThread.ts        → write thread doc + update channel metadata
      updateThread.ts        → update thread fields
      deleteThread.ts        → delete thread + replies
      addReply.ts            → write reply + increment replyCount + update flowTime
      updateReply.ts         → update reply content
      deleteReply.ts         → delete reply
      reactions.ts           → love/unlove + count tracking
      bluesky.ts             → syndication: post to Bluesky, store URI/URL on thread
    components/              → Svelte 5 UI components
      ThreadListItem.svelte  → card/row for thread in a list
      ThreadDetail.svelte    → full thread view with metadata
      ThreadEditor.svelte    → create/edit form (title, content, channel, tags, files)
      DiscussionSection.svelte → reply list with real-time Firestore listener
      ReplyArticle.svelte    → single reply display
      ReplyDialog.svelte     → compose/edit reply
      BlueskyCard.svelte     → syndication status display
    ssr/                     → SSR-safe re-exports (schemas, types, read-only fetches)
    csr/                     → Client-only exports (writes, listeners, interactive UI)
```

#### SSR / CSR Split

| Export path | Contains | Safe for SSR? |
|---|---|---|
| `@threads/ssr` | Schemas, types, `fetchThreads`, `fetchThread`, `fetchReplies`, read-only server queries | Yes |
| `@threads/csr` | Write operations, Firestore `onSnapshot` listeners, interactive Svelte components | No (client only) |
| `@threads/components` | All Svelte components (some SSR-renderable, some need `client:` directive) | Partial |

#### Thread Schema (v20)

Extends `ContentEntrySchema` from `@models`:

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

Extends `ContentEntrySchema` from `@models`:

```
ReplySchema extends ContentEntrySchema
  images: ImageArray (optional)
  quoteRef: string (optional)
  threadKey: string (required)
  owners: string[] (min 1)
```

### Dependencies

- `@models` — `ContentEntrySchema`, `EntrySchema`, `ImageArraySchema`, `toDate()`
- `@firebase/server` — server-side Firestore reads for SSR
- `@firebase/client` — client-side Firestore writes, listeners, auth
- `zod` — schema validation

### Anti-Patterns

- Do not import `@firebase/client` in SSR code paths — use the `ssr/` entry point
- Do not put page-level Astro components here — `app/pelilauta` owns routing and pages
- Do not duplicate `ContentEntrySchema` fields — extend from `@models`
- Do not use Firestore `onSnapshot` for initial SSR render — SSR uses one-shot queries, client hydrates with listeners for real-time updates

## Contract

### Definition of Done

- [ ] `packages/threads` exists as a pnpm workspace package
- [ ] `ThreadSchema` and `ReplySchema` validate against Firestore data
- [ ] `parseThread()` handles legacy data (string images, missing author, Timestamp dates)
- [ ] `fetchThreads()` returns paginated `Thread[]` sorted by `flowTime` descending
- [ ] `fetchReplies()` returns `Reply[]` sorted by `createdAt` ascending
- [ ] CRUD operations for threads and replies work via client API
- [ ] Bluesky syndication creates/tracks posts
- [ ] `ssr/` entry has zero client SDK imports
- [ ] At least one Svelte component (`ThreadListItem`) renders a thread as a card
- [ ] Package passes `pnpm check` and unit tests

### Regression Guardrails

- `ThreadSchema` must always require `title`, `channel`, and `owners` (min 1)
- `flowTime` must update when a reply is added (bumps thread in stream)
- Deleting a thread must also delete its reply sub-collection
- SSR entry must not import any `firebase/firestore` client modules

### Testing Scenarios

#### Scenario: Parse thread from Firestore document

```gherkin
Given a raw Firestore document with Timestamp fields and legacy string images
When parsed through parseThread()
Then dates are converted to Date objects
And string images are converted to [{url, alt}] format
And a valid Thread is returned
```

- **Vitest Unit Test:** `packages/threads/src/schemas/ThreadSchema.test.ts`

#### Scenario: Fetch paginated threads

```gherkin
Given the stream collection has 20 public threads
When fetchThreads({ limit: 10 }) is called
Then 10 threads are returned sorted by flowTime descending
And a cursor is provided for the next page
```

- **Vitest Unit Test:** `packages/threads/src/api/fetchThreads.test.ts`

#### Scenario: Reply bumps thread flowTime

```gherkin
Given a thread with flowTime T
When a reply is added
Then the thread's flowTime is updated to a value greater than T
And replyCount is incremented by 1
```

- **Vitest Unit Test:** `packages/threads/src/api/addReply.test.ts`

#### Scenario: Thread list renders on front page

```gherkin
Given the front page fetches recent threads via SSR
When the page loads
Then ThreadListItem components display title, channel, and reply count
```

- **Playwright E2E Test:** `app/pelilauta/e2e/front-page.spec.ts`
