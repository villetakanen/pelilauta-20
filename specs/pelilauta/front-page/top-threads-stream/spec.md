---
feature: Top Threads Stream
status: stable
maturity: implementation
last_major_review: 2026-04-30
parent_spec: ../spec.md
---

# Feature: Top Threads Stream

> Reverse-engineered from `pelilauta-17/src/components/server/FrontPage/TopThreadsStream.astro`
> (`.tmp/pelilauta-17/src/components/server/FrontPage/TopThreadsStream.astro`)
> with companion files `ThreadCard.astro` and `src/pages/api/threads.json.ts`.
> This is the data-bound replacement for the placeholder Threads region in the parent front-page spec.

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
  - **Per-card derived values:** for each thread, the frontmatter resolves the
    plain-text snippet (`markdownToPlainText(thread.markdownContent, 220)`),
    the cover URL (`thread.poster ?? thread.images?.[0]?.url`), the channel
    icon (`channels.find(c => c.slug === thread.channel)?.icon`), and the
    channel slug (`thread.channel`, treated as a slug per the v17 data
    contract). These are passed to `ThreadCard` as discrete props so the
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
  - Threads-owned keys: `threads:title` (stream `<h2>` — the canonical Discussions heading, shared with the future `/channels` index `<h1>`) and `threads:card.inChannel` (consumed by `ThreadCard`). Defined in `@pelilauta/threads/i18n`.
  - Profiles-owned key: `profiles:anonymous.nick` (the anonymous-author fallback used in card bylines). Defined in `@pelilauta/profiles/i18n`. Resolved via `t()` in this component's frontmatter and passed to each `ThreadCard` as `anonymousLabel`.
  - All resolved through the host-bound `t` from `app/pelilauta/src/i18n.ts`.
- **Content lang:** Each rendered `ThreadCard` stamps `lang={thread.locale}` on its root element per the i18n spec's DOM lang attribution rule. `TopThreadsStream` itself emits no `lang` attribute — it's a chrome container.
- **Constraints:**
  - **Pure SSR.** No `client:` directives on the stream itself. `ThreadCard` may have its own islands for reactions/subscriptions but the list and links render server-side.
  - **No self-HTTP from the SSR component.** The component reads via the shared internal accessor module above. Calling `fetch(${Astro.url.origin}/api/...)` from a server component is forbidden — it adds a failure mode and a network hop for code already reachable in-process.
  - **Error isolation.** A failure in either accessor call renders the localized error block in place of the list; the rest of the front page is unaffected. Errors are logged via the host's logger, not propagated.
  - **Bounded result set.** The list contains at most 5 threads. Older threads are reachable via the "show more" link to `/channels`.
  - **Empty state is non-erroneous.** Zero threads renders an empty list with the "show more" link still present. Zero threads MUST NOT be reported as an error.
  - **Channel fallback.** If a thread's `channel` slug does not match any known channel, the card renders **without an icon** — the new `cn-card` supports icon omission and that is the desired UX, not a generic placeholder icon.
  - **App never overrides DS.** No `<style>` blocks, inline `style=""`, or local utility classes. Layout comes from `Page` + `cn-content-triad`; presentation comes from `cn-card`. Tailwind-style utility classes from v17 (`flex flex-col`, `text-caption`, `border-b`, `m-0`, etc.) do not exist in v20 and are not ported.

## Contract

### Definition of Done

- [ ] `TopThreadsStream.astro` exists at the path above and is mounted into the medium column of the front-page triad.
- [ ] Renders up to 5 public threads sorted by `flowTime` descending (`getThreads(5)` with default `order` and `public`).
- [ ] Each thread renders as a `ThreadCard` with title, snippet, channel context, author byline, and a link to `/threads/{key}`.
- [ ] Per-card data prep happens in this component's frontmatter, not inside `ThreadCard`. For each thread the frontmatter computes `snippet`, `coverUrl`, `channelSlug`, and `channelIcon` and passes them as props.
- [ ] Author profiles for the rendered threads are resolved upstream of the card via `Promise.all(threads.map(t => getProfile(t.owners[0])))` and passed as the `authorProfile` prop. The author uid is read from `owners[0]`, never from the legacy `author` field. The `anonymousLabel` prop is sourced from `t("profiles:anonymous.nick")`.
- [ ] Each rendered card has `lang={thread.locale}` on its root element.
- [ ] A "show more" link to `/channels` is always present, regardless of result count or error state.
- [ ] On data-fetch failure, a localized error block (`pelilauta:error.fetch`) replaces the list; the rest of the front page renders normally.
- [ ] Component contains no `<script>` tags, no `client:` directives, no `<style>` blocks, no inline styles, no utility/local classes.
- [ ] No use of `fetch(Astro.url.origin + ...)` — data is loaded via the shared internal accessor module.
- [ ] The shared accessor module is also the source the public HTTP API endpoints (`/api/threads.json`, `/api/meta/channels.json`) call — no duplicate query logic.

### Regression Guardrails

- The result-set ceiling MUST stay at 5 unless the parent front-page spec changes the triad layout — more than 5 cards in this column breaks the visual rhythm and pushes the small columns below the fold on common viewports.
- The "show more" link MUST point to `/channels` (the discoverable index of all threads), not a per-channel page.
- Errors in this stream MUST NOT propagate out of the component. Front page rendering MUST NOT 5xx because of a Firestore hiccup. Errors include author-profile read failures — a single bad profile read MUST NOT take down the stream.
- An empty thread list MUST render successfully (200) — no 404, no error block.
- The component MUST NOT depend on `@pelilauta/i18n` directly; UX strings come through the host-bound `t` exported from `app/pelilauta/src/i18n.ts`.
- Author profile resolution MUST happen upstream of card rendering (in this component's frontmatter), not inside `ThreadCard`. The `ThreadCard` is profile-display, not profile-fetching.
- The author uid MUST be read from `thread.owners[0]`. Reading `thread.author` is a regression — that field is a v17 legacy denormalization and may carry stale or malformed data (e.g. an array). The schema normalizes it back to `owners[0]` on parse, but consumers should ignore the field entirely.

### Testing Scenarios

#### Scenario: Renders the most recent 5 public threads as cards

```gherkin
Given getThreads(5) returns 5 public threads sorted by flowTime descending (drawn from a larger pool)
When the front page is rendered
Then the Top Threads Stream contains exactly 5 ThreadCard elements
And each card links to "/threads/{key}" for its thread
And the cards appear in flowTime-descending order
```

- **Playwright E2E Test:** `app/pelilauta/e2e/front-page-top-threads.spec.ts`

#### Scenario: Empty thread list renders without error

```gherkin
Given getThreads(5) returns zero threads
When the front page is rendered
Then the Top Threads Stream renders no ThreadCard elements
And the "show more" link to /channels is still present
And no error block is shown
And the response status is 200
```

- **Playwright E2E Test:** `app/pelilauta/e2e/front-page-top-threads.spec.ts`

#### Scenario: Data-fetch failure shows the localized error block

```gherkin
Given getThreads(5) throws
When the front page is rendered
Then the Top Threads Stream contains the localized error message for "threads:frontpage.error.fetchFailed"
And the "show more" link to /channels is still present
And the response status is 200
And the rest of the front page renders normally
```

- **Playwright E2E Test:** `app/pelilauta/e2e/front-page-top-threads.spec.ts`

#### Scenario: Threads with unknown channel slug render without an icon

```gherkin
Given a thread has channel = "ghost-channel-that-no-longer-exists"
When the Top Threads Stream renders
Then the card for that thread renders without an icon (no fallback placeholder)
And the card still renders title, snippet, and the link to /threads/{key}
```

- **Vitest Unit Test:** `app/pelilauta/src/components/front-page/TopThreadsStream.test.ts`

#### Scenario: Each card cites its author via ProfileLink

```gherkin
Given getThreads(5) returns 5 public threads with various authors
And one thread has owners[0] = "-" (anonymous sentinel)
And one thread has an owners[0] whose profile doc does not exist
When the front page is rendered
Then exactly 5 getProfile calls are issued in parallel, each with thread.owners[0] as the uid
And each card renders the resolved nick as a link to /profiles/{uid} when the profile exists
And cards for the "-" sentinel and the missing profile render the localized anonymous label inside a <span>
And no card inlines a bare <a> or <span> for the byline — every author citation goes through ProfileLink
And no read of thread.author is issued anywhere in the stream
```

#### Scenario: Each card stamps the thread's content locale

```gherkin
Given a thread with locale = "en" is in the result set
And the viewer's uxLocale is "fi"
When the Top Threads Stream renders
Then the card root element for that thread has lang="en"
And the surrounding stream container has no lang attribute (inherits from <html lang="fi">)
```

- **Playwright E2E Test:** `app/pelilauta/e2e/front-page-top-threads.spec.ts`

