---
feature: Thread Sidebar — Metadata Block
status: draft
maturity: design
last_major_review: 2026-06-01
parent_spec: ./spec.md
---

# Feature: Thread Sidebar — Metadata Block

## Blueprint

### Context

**Route:** `/threads/[threadKey]` (right column of the reader container)

The metadata block is the first widget that fills the otherwise-empty sidebar slot in the thread detail page's `cn-content-golden` reader container. It tells the reader, at a glance, *when* the thread was posted, *who* posted it, and *which channel* it lives in.

It is rendered as plain metadata — three lines (or three inline items) without a card wrapper. The v20 design system intentionally moved away from wrapping every sidebar block in `cn-card`; the block sits directly inside the sidebar slot and inherits the surrounding spacing rhythm from the content-grid primitive.

### Architecture

- **Component location:** `packages/threads/src/components/ThreadMetadata.astro`. Domain content (it names Thread concepts), so it lives in the threads package per the DS-vs-domain boundary, not in cyan.
- **Framework:** Astro. The block is static, has no interactive state, and renders fully on the server. The only interactive child it composes is `ProfileLink` from `@pelilauta/profiles/components` (Svelte 5), which already runs SSR-clean and needs no `client:*` directive.
- **Props:**
  - `thread: Thread` — required, for `thread.createdAt` (or `flowTime` — see below) and the channel slug.
  - `authorProfile: Profile | null` — the resolved owner profile, passed in by the host page. `null` indicates an anonymous / deleted author and the embedded `ProfileLink` renders the anonymous fallback.
  - `channelName: string` — the resolved display name of the channel (from the channel directory). If the slug is not found in the directory, the host passes the slug itself as a fallback.
  - `locale: string` — used by the date formatter to choose between relative ("3 hours ago") and absolute (`YYYY-MM-DD`) phrasing.
- **Host page wiring** (`app/pelilauta/src/pages/threads/[threadKey]/index.astro`):
  - Calls `getProfile(thread.owners[0])` and `getChannels()` upstream of the component, per the SSR Data Flow rule (no fetches inside Svelte / Astro templates).
  - Resolves the channel display name by `channels.find(c => c.slug === thread.channel)?.name ?? thread.channel`.
  - Passes everything as props into the existing sidebar `<aside>` in the reader container.
- **Date display:** uses the same relative/absolute heuristic as `formatDateLabel` in `app/pelilauta/src/components/front-page/buildTopThreadCards.ts` — within 72 hours, relative phrasing via `Intl.RelativeTimeFormat`; older than that, ISO date (`YYYY-MM-DD`). This keeps the front page and the detail page consistent.
- **Date source: `thread.createdAt`, NOT `thread.flowTime`.** This is a deliberate divergence from v17, which displayed `flowTime`. `flowTime` is bumped every time a reply is added to the thread (it's the field that drives "recently active" sorting on the front page); using it as the headline metadata date would tell a reader "this thread was posted moments ago" the instant someone else replied, which is wrong. The block answers "when was this thread posted?" — that is `createdAt`. v17's use of `flowTime` here was a mistake that is being corrected in v20, not parity.
- **Channel link:** href = `/channels/{slug}`; text = the resolved channel display name (not the slug).
- **i18n:** the surrounding phrasing ("Posted by X in Y") is the host's call. The component is allowed to interleave plain text between the date / `ProfileLink` / channel link if a locale demands it, but the canonical content is "date · author · channel" with locale-specific connective text driven by existing `threads:thread.inChannel` (Finnish: "Aiheessa {topic}"; English: "In {topic}").
- **No card wrapper.** The block is a plain semantic container — an `<address>` or `<dl>` or a series of `<p>`s, implementer's choice — without `cn-card`, `cn-bubble`, or any other wrapping DS component.

### Dependencies

- `@pelilauta/profiles/server` — `getProfile`, `Profile` type (host page).
- `@pelilauta/profiles/components` — `ProfileLink` (composed by the metadata block).
- `@pelilauta/threads/server` — `getChannels`, `Thread` type (host page).
- `@pelilauta/threads/i18n` — `threads:thread.inChannel` key for the connective phrasing.
- Parent reader container — [`./spec.md`](./spec.md). This widget fills the sidebar slot defined there.

### Constraints

- The block is 100% SSR; no `client:*` directives anywhere in its tree. (Its `ProfileLink` child also SSRs cleanly.)
- The block contains no `cn-card`, `cn-bubble`, or other DS card-style wrapper component.
- The block fetches no data itself. Profile and channel directory are resolved upstream by the host page and passed in as props.
- The block reads `thread.owners[0]` to identify the author, never `thread.author` (per the parent threads spec — `author` is a v17 legacy denormalization).
- The displayed timestamp is `thread.createdAt`, not `flowTime`.

## Contract

### Definition of Done

- [ ] `ThreadMetadata.astro` exists at `packages/threads/src/components/ThreadMetadata.astro` and is exported from `@pelilauta/threads/components`.
- [ ] The component renders three pieces of metadata in this logical order: thread creation date, author (via `ProfileLink`), channel link.
- [ ] When `authorProfile` is `null`, `ProfileLink` renders its anonymous fallback (`"Anonymous"` or the locale-equivalent); no broken link, no empty `<a>`.
- [ ] The channel renders as an anchor to `/channels/{slug}` with the resolved channel display name as text. When the host passes the slug as the display name (channel not found in the directory), the link still renders correctly.
- [ ] The thread date renders via the same `formatDateLabel` heuristic used on the front page — relative within 72 h, ISO `YYYY-MM-DD` beyond — sourced from `thread.createdAt`.
- [ ] The host page (`app/pelilauta/src/pages/threads/[threadKey]/index.astro`) fetches `getProfile(thread.owners[0])` and `getChannels()` in its frontmatter (parallel with the existing `prepareInitialReplies` call) and passes the resolved values into `<aside><ThreadMetadata ... /></aside>` inside the `cn-content-golden` sidebar slot.
- [ ] The component contains no `cn-card`, `cn-bubble`, or other DS card-style wrapper element.
- [ ] No `client:*` directive is added by this change.
- [ ] Anonymous SSR of `/threads/{key}` remains cache-shareable: the metadata block renders byte-identically for all anonymous viewers given the same Firestore state.

### Regression Guardrails

- The block reads `thread.owners[0]` for the author uid, not `thread.author`.
- The block displays `thread.createdAt`, not `thread.flowTime`. A reader looking at the date should see *when the thread was posted*, not "moments ago" because someone just replied.
- Profile and channel lookups stay in the host frontmatter, never in the `.astro` template body or any nested component. If the SSR Data Flow rule is violated, replies and metadata fetches will serialise instead of parallelising, slowing the page.
- The sidebar slot inside `cn-content-golden` continues to contain exactly one element child (the `<aside>` wrapping `<ThreadMetadata>`), per [`./spec.md`](./spec.md) — adding the metadata block does not change the parent layout contract.

### Testing Scenarios

#### Scenario: Metadata block renders date, author, and channel link

```gherkin
Given a Thread with createdAt = 2026-03-01, owners[0] = "uid-ada", channel = "yleinen"
And a Profile with key = "uid-ada", nick = "Ada"
And the channel directory contains { slug: "yleinen", name: "Yleinen" }
When ThreadMetadata is rendered with thread, authorProfile = Ada, channelName = "Yleinen"
Then the rendered HTML contains a formatted date string for 2026-03-01
And the rendered HTML contains an anchor with href = "/profiles/uid-ada" and visible text "Ada"
And the rendered HTML contains an anchor with href = "/channels/yleinen" and visible text "Yleinen"
And the rendered HTML contains no element with the class "cn-card"
```

#### Scenario: Anonymous / deleted author falls back without a broken link

```gherkin
Given a Thread with owners[0] = "-"
And authorProfile = null
When ThreadMetadata is rendered
Then the author position renders ProfileLink's anonymous fallback text
And the rendered HTML contains no anchor pointing at "/profiles/-"
And the rendered HTML contains no empty <a> element
```

#### Scenario: Channel display name falls back to slug when not in directory

```gherkin
Given a Thread with channel = "unknown-channel"
And the channel directory does not contain "unknown-channel"
And the host passes channelName = "unknown-channel" (the slug fallback)
When ThreadMetadata is rendered
Then the channel link href is "/channels/unknown-channel"
And the channel link text is "unknown-channel"
```

#### Scenario: Date prefers thread.createdAt over flowTime

```gherkin
Given a Thread with createdAt = 2025-01-01 and flowTime = 2026-05-30 (recent reply)
When ThreadMetadata is rendered on 2026-06-01
Then the rendered date reflects 2025-01-01 (absolute ISO form, not "yesterday")
```

#### Scenario: Host page wires the sidebar slot

```gherkin
Given the thread detail page renders for an existing thread
When the page is requested
Then the sidebar slot inside cn-content-golden contains one <aside> element
And the <aside> contains the rendered metadata block
And the host frontmatter has invoked getProfile and getChannels in parallel with prepareInitialReplies
```

#### Scenario: SSR produces no client-side JS for the metadata block

```gherkin
Given an anonymous viewer GETs /threads/{key}
When the response HTML is inspected
Then the metadata block's markup contains no astro-island element
And no JavaScript module is loaded on behalf of ThreadMetadata or ProfileLink
```
