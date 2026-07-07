---
feature: Top Threads Stream
status: approved
last_major_review: 2026-04-30
parent_spec: ../spec.md
---

# Feature: Top Threads Stream

> Reverse-spec'd from `pelilauta-17/src/components/server/FrontPage/TopThreadsStream.astro` and companions. Replaces the placeholder Threads region in the parent front-page spec.

## Blueprint

### Context

The Top Threads Stream is the medium (primary) region of the front-page triad. It surfaces the most recent public discussion threads as a vertical list of preview cards, giving visitors and returning users an immediate read on community activity. It replaces the placeholder cards in the parent front-page spec once the data layer is available.

### Architecture

- **Component:** `app/pelilauta/src/components/front-page/TopThreadsStream.astro` — Astro component, server-rendered in the page's frontmatter, mounted into the medium column of `cn-content-triad` on the front page.
- **Sub-specs:**
  - [`thread-card.md`](./thread-card.md) — the per-row `ThreadCard` component contract (rendering, byline composition, v17-parity migration debt).
- **Sub-components:**
  - `ThreadCard` from `@pelilauta/threads` (Svelte 5 component) — renders an individual thread preview as a `CnCard` from the DS, including the author byline (composed via `ProfileLink`). Contract owned by [`thread-card.md`](./thread-card.md).
  - `CnCard` from `@cyan` — DS card primitive (used via `ThreadCard`).
- **Data sources** (resolved in the Astro frontmatter):
  - **Threads:** the most recent **5** public threads, sorted by `flowTime` descending.
  - **Channels:** the channel directory (slug → icon mapping). Cached at module/process level since the channel set changes rarely.
  - **Author profiles:** for each thread, the author profile is resolved via `getProfile(thread.owners[0])` from `@pelilauta/profiles/server`. **The author uid is read from `owners[0]`, not from `thread.author`** — `author` is a v17 legacy denormalization preserved by the schema for storage compatibility, but consumers MUST NOT read it. All resolutions are issued in parallel through `Promise.all` so the 5 reads happen concurrently. The `"-"` sentinel and missing-owner short-circuit to `null` inside `getProfile`; the resulting `Profile | null` is passed to `ThreadCard`'s `authorProfile` prop.
  - **Per-card derived values:** for each thread, the frontmatter resolves
    the plain-text snippet (`markdownToPlainText(thread.markdownContent, 220)`),
    the cover URL (`thread.poster ?? thread.images?.[0]?.url`), the channel
    icon (`channels.find(c => c.slug === thread.channel)?.icon`), the channel
    slug (`thread.channel`, treated as a slug per the v17 data contract), and
    the channel-link label (`t("threads:thread.inChannel", { topic })` where
    `topic` is the channel's display name when resolved or the slug as
    fallback). These are passed to `ThreadCard` as discrete props so the
    component is render-from-props — see [`thread-card.md`](./thread-card.md).
  - Threads + channels are read through `@pelilauta/threads/server` (source: `packages/threads/src/server/`):
    - `getThreads(limit, { order, public })` — generic threads accessor. Defaults: `order = 'flowTime'`, `public = true`. This widget calls `getThreads(5)`.
    - `getChannels()` — full channel directory.
  - The HTTP API endpoints (`/api/threads.json`, `/api/meta/channels.json`) call the same module — DRY between SSR and HTTP. The SSR component itself does NOT make HTTP calls.
- **Data Models:**
  - `Thread` — from `@pelilauta/threads`, extends `ContentEntry` from `@pelilauta/models`.
  - `Channel` — from `@pelilauta/threads`. **Not an Entry**; channels are stored as an array on a single Firestore document (v17 contract preserved unchanged in v20). Fields: `slug`, `name`, `description`, `icon` (default `"discussion"`), `category`, `threadCount`, plus optional denormalised `latestThread` / `latestReply` snapshots.
- **i18n:**
  - Host-owned app keys: `pelilauta:action.showMore` (show-more link), `pelilauta:error.fetch` (error block). Defined in `app/pelilauta/src/locales/app/`.
  - Threads-owned keys: `threads:title` (stream `<h2>` — the canonical Discussions heading, shared with the future `/channels` index `<h1>`) and `threads:thread.inChannel` (cross-surface "in {topic}" phrase, resolved here and passed to `ThreadCard` as `channelLinkLabel`). `{topic}` receives `Channel.name` verbatim — channel names are not per-locale (v17 carryover), so an English UI may show a Finnish channel name. Defined in `@pelilauta/threads/i18n`.
  - Profiles-owned key: `profiles:anonymous.nick` (the anonymous-author fallback used in card bylines). Defined in `@pelilauta/profiles/i18n`. Resolved via `t()` in this component's frontmatter and passed to each `ThreadCard` as `anonymousLabel`.
  - All resolved through the host-bound `t` from `app/pelilauta/src/i18n.ts`.
- **Content lang:** Each rendered `ThreadCard` stamps `lang={thread.locale}` on its root element per the i18n spec's DOM lang attribution rule. `TopThreadsStream` itself emits no `lang` attribute — it's a chrome container.
- **Constraints:**
  - Inherits anonymous-SSR (no `client:` directives) and apps-never-override-DS (no `<style>` blocks, inline `style=""`, or local utility classes) from [`ARCHITECTURE.md`](../../../../ARCHITECTURE.md) §Component Model and `AGENTS.md`.
  - **Read in-process.** The component reads via the shared internal accessor module (`@pelilauta/threads/server`). HTTP-shell concerns (status, headers, ETag) live on the API endpoints that wrap the same module.
  - **Error isolation.** A failure in either accessor call renders the localized error block in place of the list; the rest of the front page is unaffected. Errors are logged via the host's logger.
  - **Bounded result set.** The list contains at most 5 threads. Older threads are reachable via the "show more" link to `/channels`.
  - **Empty state non-erroneous.** Zero threads renders the empty list with the "show more" link still present, status 200.
  - **Channel fallback.** If a thread's `channel` slug does not match any known channel, the card renders without an icon and the link label substitutes the slug for `{topic}` (e.g. "Aiheessa yleinen"). Slug-cased prose is acceptable transient UX, not a regression.

## Contract

### Definition of Done

- [ ] `TopThreadsStream.astro` exists at the path above and is mounted into the medium column of the front-page triad.
- [ ] Renders up to 5 public threads sorted by `flowTime` descending (`getThreads(5)` with default `order` and `public`).
- [ ] Each thread renders as a `ThreadCard` with title, snippet, channel context, author byline, and a link to `/threads/{key}`.
- [ ] Per-card data prep happens in this component's frontmatter, not inside `ThreadCard`. For each thread the frontmatter computes `snippet`, `coverUrl`, `channelSlug`, `channelLinkLabel` (via `t("threads:thread.inChannel", { topic })`), and `channelIcon`, and passes them as props.
- [ ] Author profiles for the rendered threads are resolved upstream of the card via `Promise.all(threads.map(t => getProfile(t.owners[0])))` and passed as the `authorProfile` prop. The author uid is read from `owners[0]`, never from the legacy `author` field. The `anonymousLabel` prop is sourced from `t("profiles:anonymous.nick")`.
- [ ] Each rendered card has `lang={thread.locale}` on its root element.
- [ ] A "show more" link to `/channels` is always present, regardless of result count or error state.
- [ ] On data-fetch failure, a localized error block (`pelilauta:error.fetch`) replaces the list; the rest of the front page renders normally.
- [ ] Component contains no `<script>` tags, no `client:` directives, no `<style>` blocks, no inline styles, no utility/local classes.
- [ ] No use of `fetch(Astro.url.origin + ...)` — data is loaded via the shared internal accessor module.
- [ ] The shared accessor module is also the source the public HTTP API endpoints (`/api/threads.json`, `/api/meta/channels.json`) call — no duplicate query logic.

### Regression Guardrails

- The result-set ceiling stays at 5 unless the parent front-page spec changes the triad layout. More than 5 cards in this column breaks the visual rhythm and pushes the small columns below the fold on common viewports.
- The "show more" link points to `/channels` (the discoverable index of all threads).
- Errors are caught, logged via the host's logger, and replaced with the localized error block; front-page rendering returns 200. Author-profile read failures isolate per-thread — one bad profile read renders that thread with `authorProfile = null`, the rest of the stream renders normally.
- An empty thread list renders successfully (status 200) with the "show more" link still present.
- UX strings come through the host-bound `t` exported from `app/pelilauta/src/i18n.ts`.
- Author profile resolution lives in this component's frontmatter, upstream of `ThreadCard`. `ThreadCard` is profile-display, not profile-fetching.
- The author uid is read from `thread.owners[0]`. The legacy `thread.author` field is preserved by the schema for storage compatibility but consumers ignore it; reading it is a regression because it may carry stale or malformed data (e.g. an array).

### Testing Scenarios

#### Scenario: Renders the most recent 5 public threads as cards

```gherkin
Given getThreads(5) returns 5 public threads sorted by flowTime descending (drawn from a larger pool)
When the front page is rendered
Then the Top Threads Stream contains exactly 5 ThreadCard elements
And each card links to "/threads/{key}" for its thread
And the cards appear in flowTime-descending order
```

#### Scenario: Empty thread list renders without error

```gherkin
Given getThreads(5) returns zero threads
When the front page is rendered
Then the Top Threads Stream renders no ThreadCard elements
And the "show more" link to /channels is still present
And no error block is shown
And the response status is 200
```

#### Scenario: Data-fetch failure shows the localized error block

```gherkin
Given getThreads(5) throws
When the front page is rendered
Then the Top Threads Stream contains the localized error message for "pelilauta:error.fetch"
And the "show more" link to /channels is still present
And the response status is 200
And the rest of the front page renders normally
```

#### Scenario: Threads with unknown channel slug render without an icon

```gherkin
Given a thread has channel = "ghost-channel-that-no-longer-exists"
When the Top Threads Stream renders
Then the card for that thread renders without an icon (no fallback placeholder)
And the card still renders title, snippet, and the link to /threads/{key}
```

#### Scenario: Each card receives a resolved profile and the anonymous label

```gherkin
Given getThreads(5) returns 5 public threads with various authors
When the front page is rendered
Then exactly 5 getProfile calls are issued in parallel, each with thread.owners[0] as the uid
And no read of thread.author is issued anywhere in the stream
And each ThreadCard receives the resolved Profile | null as authorProfile
And each ThreadCard receives t("profiles:anonymous.nick") as anonymousLabel
```

> Per-card byline rendering — the "render via ProfileLink, never bare `<a>`/`<span>`" contract — lives in [`thread-card.md`](./thread-card.md).

#### Scenario: Each card stamps the thread's content locale

```gherkin
Given a thread with locale = "en" is in the result set
And the viewer's uxLocale is "fi"
When the Top Threads Stream renders
Then the card root element for that thread has lang="en"
And the surrounding stream container has no lang attribute (inherits from <html lang="fi">)
```

