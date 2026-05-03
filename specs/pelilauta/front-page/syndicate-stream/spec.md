---
feature: SyndicateStream
status: draft
maturity: design
last_major_review: 2026-05-03
parent_spec: ../spec.md
---

# Feature: SyndicateStream

> Sub-feature of [Front Page](../spec.md). SyndicateStream is the
> "Blog-roll" small-column widget that surfaces recent posts from the
> Finnish-language RPG community feeds (Myrrys.com,
> Roolipelitiedotus.fi) inside the front-page content triad.
>
> Forward-ported from v18 source at
> `.tmp/pelilauta-17/src/components/server/FrontPage/SyndicateStream/`
> (`SyndicateStream.astro` + `SyndicatePost.astro`) and the API route
> `.tmp/pelilauta-17/src/pages/api/rss-feeds.json.ts`. (The folder
> name is `pelilauta-17/` for legacy reasons but the checked-out
> source is `pelilauta@18.13.3` — see `.tmp/pelilauta-17/package.json`.)
> v20 has no implementation yet; this spec captures the carry-forward
> contract.

## Blueprint

### Context

SyndicateStream is an SSR-only widget that lists recent posts from
external RPG community blogs alongside the front-page's threads
stream and latest-sites stream. It exists to keep the front page
"alive" with off-platform community activity — surfacing the
Finnish RPG ecosystem's blog-roll without requiring users to
subscribe to RSS feeds themselves.

v20 consolidates v18's two stacked per-source sections into a
**single merged stream of up to five posts**, ranked by recency
across all configured feeds, with a per-feed "guaranteed floor" so
that a partner feed (Myrrys) is never crowded out of the stream by
a high-volume sibling feed. Each post card carries a source
attribution so the merged origin remains legible.

### Architecture

- **Page composition:** mounted in `app/pelilauta/src/pages/index.astro`
  inside the front-page's secondary small column, alongside
  `TopThreadsStream` and `TopSitesStream`. Mounted with Astro's
  `server:defer` so the slow third-party RSS fetch does not block the
  rest of the page's first byte. A fallback section renders in its
  place during the deferred SSR window.
- **Components (host-side, app-feature scope):**
  - `app/pelilauta/src/components/front-page/SyndicateStream.astro` —
    top-level widget. Reads the cached feed data from the host's own
    API route, merges all configured feeds into one chronological
    list, applies the guaranteed-floor rule, takes the top N (N=5),
    and renders one `SyndicatePost` per surviving entry. Items are
    separated by an `<hr>` divider (the DS-blessed separator
    primitive) so the merged stream reads as a single content
    column.
  - `app/pelilauta/src/components/front-page/SyndicatePost.astro` —
    individual post item. **Does not use `CnCard`.** SyndicatePost is
    much lighter than a content card: no cover, no actions, no
    elevation, no notify/alert flags. It is composed from existing
    DS parts: a `<section>` wrapper, source attribution as a
    `<p class="text-caption">` with a link to the source's
    `homeUrl`, the post title as a heading element with a link to
    the post URL, and the `contentSnippet` as a single body `<p>`.
    The widget owns no `<style>` block — typography composes
    `.text-caption` and the `.text-hN` utilities; the divider above
    each item is the DS `<hr>` primitive.

  See §"DS-vs-domain boundary" (ARCHITECTURE.md): SyndicatePost is
  domain-shaped (its API names a "post" and the markup carries the
  `Roolipelitiedotus.fi` / `Myrrys.com` source labels), so it lives
  in the host app, not in cyan. If a second consumer for this shape
  appears (a comment-stream item, a syndicated-event item, etc.),
  the right move is to extract a name-agnostic DS primitive
  (e.g. `CnFeedItem` with `eyebrow` / `title` / `body` slots), not
  to add `CnSyndicatePost` to cyan.
- **API route (host-owned, tier 1 per ARCHITECTURE.md):**
  - `app/pelilauta/src/pages/api/rss-feeds.json.ts` — `GET` handler
    that fetches the configured RSS feeds in parallel with a per-feed
    timeout, validates each item shape, slices to the per-feed item
    limit, and returns a JSON map `{ <feedName>: RSSItem[], ... }`.
    Response carries `Cache-Control: s-maxage=600,
    stale-while-revalidate=86400` so Netlify's edge cache absorbs
    bursts and the third-party feeds are queried at most every ten
    minutes per region.
- **Data shape:**
  ```ts
  type RSSItem = {
    title: string;          // post headline
    link: string;           // post permalink (external)
    pubDate: string;        // RFC-822 / RFC-2822 date string from the feed
    contentSnippet: string; // plain-text preview the parser extracted
  };

  type FeedData = {
    [feedName: string]: RSSItem[]; // e.g. { myrrys: [...], roolipelitiedotus: [...] }
  };
  ```
- **Feed configuration (config-driven, arbitrary list):** the API
  route reads its feed list from
  `app/pelilauta/src/_rss-feeds.config.ts` — a TypeScript module
  at the app's `src/` root, alongside `src/i18n.ts`. This is
  app-level configuration, not feature implementation, and lives
  where editors naturally look for it: at the surface of the
  app, not buried under the route that consumes it. The leading
  `_` is a soft convention signalling "config, not a feature
  module." The module exports a typed `RSSFeedConfig[]` array;
  the route imports it and iterates. Not hardcoded inline in the
  route, not in environment variables. The list is arbitrary in
  length; sources can be added or removed by editing the config
  file. Each entry declares:
  - `name` — the JSON key in the response and the source-attribution
    label rendered in each card's eyebrow slot.
  - `url` — the feed endpoint.
  - `homeUrl` — the source's homepage URL, used as the eyebrow link
    target on each card.
  - `limit` — the per-feed item count to fetch (default 3).
  - `guaranteed` (optional, default `false`) — when `true`, the
    merged top-N stream MUST include at least one post from this
    feed if the feed returned any posts. See §Merge algorithm
    below.
  v20 ships with the v18 carry-forward entries (`myrrys` /
  `https://www.myrrys.com/blog/rss.xml` / 3 / `guaranteed: true`;
  `roolipelitiedotus` / `https://roolipelitiedotus.fi/feed/` / 3)
  but the route makes no assumption about the count or names.

- **Merge algorithm (host-side, in `SyndicateStream.astro` or a
  pure helper):**
  1. Flatten the API response (`{ [feedName]: RSSItem[] }`) into
     `Array<RSSItem & { source: string }>`, annotating each item
     with its feed name.
  2. Sort by `pubDate` descending (most recent first). Ties are
     broken alphabetically by `source` for stability.
  3. Take the natural top N (N = 5) as the candidate stream.
  4. For each `guaranteed` feed: if the candidate stream contains
     no item from that feed and the feed has at least one available
     item not in the stream, replace the chronologically oldest
     non-guaranteed item in the stream with the most recent
     available item from that feed. Repeat for each guaranteed
     feed in config order. Items already added by a prior
     guaranteed-feed substitution are not eligible to be evicted.
  5. The final stream is rendered in the same chronological order
     after substitutions (sort the survivors by `pubDate`
     descending one more time).
  6. If the merged candidate pool is smaller than N, render fewer
     than N cards. The widget does not pad with placeholders.

  Concretely: with two feeds, three posts each, and `myrrys`
  guaranteed — if the natural top 5 contains 0 Myrrys posts (all 3
  Roolipelitiedotus posts are more recent than any Myrrys post and
  fill 3 slots, plus 2 more from a third feed), the algorithm
  evicts the oldest non-Myrrys post from the candidate stream and
  inserts the most recent Myrrys post.
- **External dependency:** `rss-parser` (carry-forward from v18,
  audit-gated — see §Decisions #5).
- **Constraints:**
  - **Anonymous = SSR-only.** The widget renders with zero client-side
    JavaScript. No `client:` directives, no Firebase imports, no
    auth-bound logic. This matches the front-page anonymous-SSR
    contract.
  - **Independent error isolation.** A failure on one feed must not
    take down the others. The API route resolves each feed's promise
    individually and substitutes an empty array on failure; the
    failing feed contributes no items to the merge, surviving feeds
    contribute normally, and the merged stream renders whatever
    survives.
  - **Render-from-API.** The widget reads only what the API route
    returns. It does not parse RSS itself, does not import the
    parser, and does not know feed URLs. The boundary is the JSON
    response shape.
  - **No app-local layout CSS.** Per the front-page contract, the
    widget composes DS primitives only — `.text-caption` and the
    `.text-hN` utilities for typography, the global `<hr>`
    primitive (`packages/cyan/src/core/dividers.css`) for item
    separation. SyndicatePost does NOT use `CnCard` (see
    §Architecture — `CnCard` is too heavy for this surface).
    Missing primitives are DS bugs, not page workarounds.
  - **Deferred render is mandatory.** The widget must mount under
    `server:defer` so that a slow or unreachable feed does not delay
    the rest of the page's HTML response. The fallback slot renders a
    column-shaped placeholder during the defer window.

### Stream visual structure

The widget renders a single column of up to five `SyndicatePost`
items, in chronological order (most recent at the top). Items are
separated by `<hr>` dividers (the DS-blessed separator primitive
from `packages/cyan/src/core/dividers.css`). There is no
per-source heading, no per-source poster, and no special
inter-section divider — source attribution lives on each item
individually.

Per item (`SyndicatePost`):

- **Source attribution** — a `<p class="text-caption">` containing
  an `<a href={homeUrl}>{sourceName}</a>`. The `.text-caption`
  utility supplies the caption-style typography (uppercase,
  tracked) for the label.
- **Title** — a heading element wrapping `<a href={post.link}>{post.title}</a>`.
  The heading level is the implementer's call (see §Decisions —
  `<h3>` reads as a peer to other front-page section items;
  `<h4>` keeps the v18 visual hierarchy).
- **Body** — a single `<p>` containing `post.contentSnippet`. No
  rich HTML; the API has already stripped to plain text.
- **No "Read more" link.** The title link target IS the post URL;
  a redundant footer link adds noise without affording new
  navigation.

## Contract

### Definition of Done

- [ ] `SyndicateStream.astro` renders a single chronological list of
      up to five `SyndicatePost` cards inside the front-page's
      secondary small triad column.
- [ ] `SyndicateStream.astro` reads its data only from the
      `/api/rss-feeds.json` route — no direct RSS parsing, no
      hardcoded feed URLs, no per-feed knowledge baked into the
      widget.
- [ ] The merge algorithm sorts all returned items by `pubDate`
      descending, takes the top 5, and applies the
      `guaranteed`-feed substitution rule: any feed marked
      `guaranteed: true` in config that returned at least one
      post and is missing from the natural top 5 evicts the oldest
      non-guaranteed post in the stream and inserts its most
      recent post. Substitutions iterate over guaranteed feeds in
      config order; items added by a prior substitution are not
      evicted.
- [ ] When the merged candidate pool has fewer than 5 items, the
      widget renders fewer than 5 cards and does not pad with
      placeholders.
- [ ] `rss-feeds.json.ts` imports its feed list from
      `app/pelilauta/src/_rss-feeds.config.ts` (no inline list,
      no env vars), fetches all configured feeds in parallel with
      a per-feed timeout, validates each item against the
      `RSSItem` shape, slices to each feed's configured item
      limit, and returns `Content-Type: application/json` with
      `Cache-Control: s-maxage=600, stale-while-revalidate=86400`.
      The route makes no assumption about the number or names of
      feeds.
- [ ] A failure or timeout on one feed does not break the rest —
      the failing feed contributes no items to the merge, surviving
      feeds contribute normally, and the stream renders whatever
      survives.
- [ ] The widget mounts under `server:defer` on
      `app/pelilauta/src/pages/index.astro` with a column-shaped
      fallback in the named `fallback` slot.
- [ ] `SyndicatePost.astro` does not import or compose `CnCard`. It
      renders a `<section>` containing a source-attribution `<p
      class="text-caption">` (linking to `homeUrl`), a heading-level
      title element (linking to the post URL), and a body `<p>`
      with the `contentSnippet`.
- [ ] `SyndicateStream.astro` separates rendered `SyndicatePost`
      items with `<hr>` between them (the DS divider primitive
      styled by `packages/cyan/src/core/dividers.css`); no
      app-local divider class.
- [ ] No `<style>` blocks, inline `style=""`, or app-local layout
      classes in `SyndicateStream.astro` or `SyndicatePost.astro`.
      Typography composes `.text-caption` and the `.text-hN`
      utilities; separation composes the global `<hr>` primitive.
      Missing primitives escalate to `packages/cyan/`.
- [ ] Zero client-side JavaScript: no `client:` directives anywhere
      in the widget tree.

### Regression Guardrails

- **Independent error isolation.** A test must demonstrate that one
  feed timing out does not zero the other feed's posts in the
  rendered output.
- **Cache headers are part of the contract.** The API route's
  `s-maxage=600, stale-while-revalidate=86400` is what makes the
  defer window survivable on cold cache. Removing or shortening
  these without an explicit decision is a regression.
- **No external network call from the component.** The component
  fetches `${Astro.url.origin}/api/rss-feeds.json` only. Any direct
  RSS parser import inside the component is a regression — the
  separation of concerns (API caches, component renders) is the
  reason for the API route's existence.
- **Defer mount is mandatory.** Removing `server:defer` would make
  the front-page TTFB depend on third-party feed latency. This is a
  documented regression, not a tuning knob.
- **No client JS.** The widget tree is fully SSR. Any `client:`
  directive added is a regression against the anonymous-SSR-only
  rule.

### Testing Scenarios

#### Scenario: Stream merges feeds and shows the top 5 by recency

```gherkin
Given the /api/rss-feeds.json route returns
  { myrrys: [M1, M2, M3], roolipelitiedotus: [R1, R2, R3] }
And M1 is the most recent of all six posts
And M2, R1, R2, R3, M3 follow in descending pubDate order
When SyndicateStream renders
Then exactly 5 SyndicatePost items render
And they appear in chronological order: M1, M2, R1, R2, R3
And M3 is omitted (oldest, did not make the top 5)
```

#### Scenario: Guaranteed feed substitutes into a stream that excluded it

```gherkin
Given the /api/rss-feeds.json route returns
  { myrrys: [M1, M2, M3], roolipelitiedotus: [R1, R2, R3], extra: [X1, X2, X3] }
And R1, R2, R3, X1, X2 are the five most recent posts (no Myrrys post in the natural top 5)
And myrrys is configured with guaranteed: true
And M1 is the most recent Myrrys post
When SyndicateStream renders
Then exactly 5 SyndicatePost items render
And one of them is M1
And the candidate item evicted to make room is the chronologically oldest non-guaranteed post
   (here: X2)
```

#### Scenario: Guaranteed feed with zero posts does not force a substitution

```gherkin
Given the /api/rss-feeds.json route returns
  { myrrys: [], roolipelitiedotus: [R1, R2, R3] }
And myrrys is configured with guaranteed: true
When SyndicateStream renders
Then 3 SyndicatePost items render (R1, R2, R3)
And no eviction is attempted (myrrys returned no candidates)
And no error is rendered
```

#### Scenario: Source attribution and title links

```gherkin
Given a stream containing one item from "myrrys"
And myrrys is configured with homeUrl "https://www.myrrys.com"
When the item renders
Then a <p class="text-caption"> contains an <a> with href "https://www.myrrys.com" and text "Myrrys.com" (or the configured display name)
And the title element contains an <a> with href equal to the post.link
And the body contains a single <p> with text equal to post.contentSnippet
And the rendered SyndicatePost contains no nav.actions, no .cover, no CnCard root <article>
```

#### Scenario: Items are separated by DS dividers

```gherkin
Given a stream of 5 items
When SyndicateStream renders
Then 4 <hr> elements appear between consecutive items
And the first item has no <hr> preceding it
And no app-local divider class is used
```

#### Scenario: Pool smaller than N renders fewer cards without padding

```gherkin
Given the /api/rss-feeds.json route returns
  { myrrys: [M1, M2], roolipelitiedotus: [R1] }
When SyndicateStream renders
Then exactly 3 SyndicatePost items render
And no placeholder or "no more posts" filler is rendered
```

#### Scenario: API route is reachable from the front page's deferred render

```gherkin
Given the front page is requested
When the deferred SyndicateStream slot resolves
Then the widget reads /api/rss-feeds.json from Astro.url.origin
And the response carries Content-Type: application/json
And the response carries Cache-Control with s-maxage=600 and stale-while-revalidate=86400
```

#### Scenario: API route survives a single-feed failure

```gherkin
Given the myrrys feed times out
And the roolipelitiedotus feed responds normally
When /api/rss-feeds.json is invoked
Then the response status is 200
And the response body contains { myrrys: [], roolipelitiedotus: [3 items] }
And the failure is logged via logError
```

#### Scenario: Component contains no client-side JavaScript

```gherkin
Given the front page is built
When the rendered HTML for the SyndicateStream subtree is inspected
Then no script tags marked for client hydration appear inside it
And no client:* directives are present in SyndicateStream.astro or SyndicatePost.astro
```

## Migration Debt and Decisions

### v18 patterns that do not carry forward to v20

- **`cn-icon` lit custom element.** v18 used the `<cn-icon noun="...">`
  custom element. v20 uses `CnIcon.svelte` from `@cyan/components`.
  The widget composes the Svelte component instead.
- **App-local utility classes.** v18 markup uses `class="text-h4"`,
  `class="text-h5"`, `class="text-small"`, `class="text-caption"`,
  `class="border-t pt-1 mb-2"`, `class="w-16-9 poster"`,
  `class="toolbar justify-center"`, `class="text button"`,
  `class="column-s flex flex-col"`, `class="flex items-center my-2"`,
  `class="hoverable"`, `class="icon"`. Of these, `text-caption`
  exists in v20; the rest are either v18 cyan-css carry-overs or
  Tailwind-ish utilities. v20 composes DS primitives instead — the
  port may surface missing primitives that need DS escalation
  before this widget ships.
- **Inline `style="text-decoration: none;"`.** v18's
  `SyndicatePost.astro` carries an inline style on the title link.
  v20 link-decoration handling for inline-text links is a DS
  concern — inline style here is a v18 leak.
- **Hardcoded `/myrrys-proprietary/...` URLs.** v18 references
  `/myrrys-proprietary/letl/letl_gm_screen_splash-690.webp` and
  `/myrrys-proprietary/fair-use/srs-logo.webp` via the public-symlink
  pattern. v20 imports these via the `@myrrys/proprietary` workspace
  package so Astro/Vite hashes the assets at build time.
- **5-second timeout in the component.** v18's `SyndicateStream.astro`
  wraps its own `fetch` to the API route with a 5-second
  `AbortController` timeout — in addition to the API route's own
  3-second per-feed timeout. The component-level timeout is
  redundant under `server:defer` (the defer window already bounds
  TTFB) and is a likely candidate for removal in v20.
- **Two stacked feed sections.** v20 merges into one stream; the
  per-source `<h3>` heading + post-list + section CTA pattern is
  replaced by a single chronological column. The per-section
  "Read more" CTA is also gone (each card's title link goes
  directly to the post URL).
- **Per-card "Read more" caption link.** v18's `SyndicatePost.astro`
  rendered a `<p class="text-caption text-right"><a>Read more</a></p>`
  below the snippet, redundant with the title link. v20 drops it.
- **`CnCard` for syndicate items.** v18 used a card-shaped
  `<section>` with a top-border divider. v20 considered porting
  to `CnCard` but rejected: SyndicatePost has no cover, no
  actions, no elevation distinction, and shares no behaviour with
  the rest of the card surface. Composing DS parts (`.text-caption`,
  the heading utilities, `<hr>`) is the better fit; if a recurring
  shape emerges, escalate to a name-agnostic DS primitive.

### Decisions for v20 (open)

1. **Feed list — RESOLVED 2026-05-02: arbitrary, config-driven.**
   The API route reads from a colocated config file rather than a
   hardcoded list. v20 launches with the v18 entries (Myrrys,
   Roolipelitiedotus) but adding a third feed is a config-file edit,
   not a code change. See §Architecture →
   "Feed configuration (config-driven, arbitrary list)".
2. **Asymmetric Myrrys poster — RESOLVED 2026-05-02 (moot).** v20
   merges feeds into one stream; per-feed sections are gone, so
   per-section posters do not exist. If we ever want a "feature
   block" promoting a partner feed, it becomes a separate widget,
   not a wart on this one.
3. **Section heading icons — RESOLVED 2026-05-02 (moot).** No
   per-section heading exists in the merged-stream design. Source
   attribution is a text label in each card's eyebrow, not an icon.
   The `myrrys-scarlet` noun in v20 cyan-iconography is no longer
   on this widget's path; the icon's status is independent of this
   spec.
4. **`d20` divider between sections — RESOLVED 2026-05-02 (moot).**
   No inter-section divider in the merged-stream design. Items are
   separated by the DS `<hr>` primitive.
5. **Parser library — RESOLVED 2026-05-03: carry forward `rss-parser`,
   audit-gated.** v18 uses `rss-parser ^3.13.0`
   (`.tmp/pelilauta-17/package.json`, imported in
   `src/pages/api/rss-feeds.json.ts`). `3.13.0` is also the latest
   release on npm; the package has not published since 2023-04-11.
   The dependency is small and battle-tested; the API surface
   (`Parser.parseURL`, `feed.items`) maps directly onto v20's needs.

   v20 carries it forward at the same major version under one
   precondition: when the implementing PR lands, `pnpm audit` MUST
   be clean for `rss-parser` and its transitive deps (notably
   `xml2js` and `entities`, both of which have had CVE history).
   If the audit surfaces an unfixable advisory, fall back to a
   bespoke RSS parser built on `linkedom` (or similar SSR-safe
   DOM library) rather than holding the carry-forward open.
6. **Should this become a package? — RESOLVED 2026-05-02.** Per
   ARCHITECTURE.md §"Module independence and sub-shapes",
   syndication is neither a first-class entry module (no Firestore,
   no schemas) nor an attached module (does not augment entries).
   It is an app-feature: lives in `app/pelilauta/`, no
   `packages/syndication/` needed unless a second consumer appears.
7. **i18n strings.** No "Read more" labels remain in v20's stream
   (the title link is the post URL — no redundant footer link).
   Source attribution labels (e.g. `Myrrys.com`) come from the
   feed config's `name` field; they are content, not chrome, and
   are not translated.

8. **Title heading level.** v20 has `.text-h1` through `.text-h4`;
   no `.text-h5` exists. The implementer picks the title's heading
   element (`<h3>` keeps the document outline coherent —
   front-page section heading would be `<h2>` — or `<h4>` keeps
   the post title visually subordinate). Either is fine; if a
   smaller scale is needed and `.text-h5` would solve it, escalate
   as a typography-spec change rather than papering over with
   inline style.

9. **Date display.** v20 cards do not show `pubDate` directly. The
   merge sort uses it but it is not surfaced in the rendered card
   in this spec. If a date is wanted later (e.g. relative "2 days
   ago"), it lands on the same render-from-props path as
   `dateLabel` on `ThreadCard` — pre-rendered upstream by the
   merge helper, not formatted in the component.

10. **Tie-breaking on identical pubDate.** Two posts with the same
    `pubDate` sort by `source` alphabetically (stable sort). Not
    load-bearing; documented for predictability.

11. **Multiple guaranteed feeds, more than N total.** If a config
    declares more guaranteed feeds than the stream length (e.g.
    six guaranteed feeds, N=5), the algorithm guarantees feeds in
    config order until the stream is full; later guaranteed feeds
    miss out. This is a degenerate config, but the precedence is
    deterministic and documented.

### Source provenance

- v18 widget: `.tmp/pelilauta-17/src/components/server/FrontPage/SyndicateStream/SyndicateStream.astro`
- v18 post item: `.tmp/pelilauta-17/src/components/server/FrontPage/SyndicateStream/SyndicatePost.astro`
- v18 API route: `.tmp/pelilauta-17/src/pages/api/rss-feeds.json.ts`
- v18 mount point: `.tmp/pelilauta-17/src/pages/index.astro` (inside
  the front-page's secondary small column, with `server:defer` and a
  fallback)
