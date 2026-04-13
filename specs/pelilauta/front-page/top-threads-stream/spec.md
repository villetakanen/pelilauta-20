---
feature: Top Threads Stream
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
- **Sub-components:**
  - `ThreadCard` from `@pelilauta/threads` (Svelte 5 component) — renders an individual thread preview as a `cn-card` from the DS.
  - `cn-card` from `@cyan` — DS card primitive (used via `ThreadCard`).
- **Data sources** (resolved in the Astro frontmatter):
  - **Threads:** the most recent **5** public threads, sorted by `flowTime` descending.
  - **Channels:** the channel directory (slug → icon mapping). Cached at module/process level since the channel set changes rarely.
  - Both are read through `@pelilauta/threads/server` (source: `packages/threads/src/server/`):
    - `getThreads(limit, { order, public })` — generic threads accessor. Defaults: `order = 'flowTime'`, `public = true`. This widget calls `getThreads(5)`.
    - `getChannels()` — full channel directory.
  - The HTTP API endpoints (`/api/threads.json`, `/api/meta/channels.json`) call the same module — DRY between SSR and HTTP. The SSR component itself does NOT make HTTP calls.
- **Data Models:**
  - `Thread` — from `@pelilauta/threads`, extends `ContentEntry` from `@pelilauta/models`.
  - `Channel` — from `@pelilauta/threads`. **Not an Entry**; channels are stored as an array on a single Firestore document (v17 contract preserved unchanged in v20). Fields: `slug`, `name`, `description`, `icon` (default `"discussion"`), `category`, `threadCount`, plus optional denormalised `latestThread` / `latestReply` snapshots.
- **i18n:**
  - Strings used: `threads:frontpage.showMore`, `threads:frontpage.error.fetchFailed`, `threads:card.inChannel` (consumed by `ThreadCard`).
  - Owned by `@pelilauta/threads/i18n` and assigned to the `threads` namespace in the host composition seam (see [`../../i18n/spec.md`](../../i18n/spec.md)).
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
- [ ] Each thread renders as a `ThreadCard` with title, snippet, channel context, and a link to `/threads/{key}`.
- [ ] Each rendered card has `lang={thread.locale}` on its root element.
- [ ] A "show more" link to `/channels` is always present, regardless of result count or error state.
- [ ] On data-fetch failure, a localized error block (`threads:frontpage.error.fetchFailed`) replaces the list; the rest of the front page renders normally.
- [ ] Component contains no `<script>` tags, no `client:` directives, no `<style>` blocks, no inline styles, no utility/local classes.
- [ ] No use of `fetch(Astro.url.origin + ...)` — data is loaded via the shared internal accessor module.
- [ ] The shared accessor module is also the source the public HTTP API endpoints (`/api/threads.json`, `/api/meta/channels.json`) call — no duplicate query logic.

### Regression Guardrails

- The result-set ceiling MUST stay at 5 unless the parent front-page spec changes the triad layout — more than 5 cards in this column breaks the visual rhythm and pushes the small columns below the fold on common viewports.
- The "show more" link MUST point to `/channels` (the discoverable index of all threads), not a per-channel page.
- Errors in this stream MUST NOT propagate out of the component. Front page rendering MUST NOT 5xx because of a Firestore hiccup.
- An empty thread list MUST render successfully (200) — no 404, no error block.
- The component MUST NOT depend on `@pelilauta/i18n` directly; UX strings come through the host-bound `t` exported from `app/pelilauta/src/i18n.ts`.

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

#### Scenario: Each card stamps the thread's content locale

```gherkin
Given a thread with locale = "en" is in the result set
And the viewer's uxLocale is "fi"
When the Top Threads Stream renders
Then the card root element for that thread has lang="en"
And the surrounding stream container has no lang attribute (inherits from <html lang="fi">)
```

- **Playwright E2E Test:** `app/pelilauta/e2e/front-page-top-threads.spec.ts`

