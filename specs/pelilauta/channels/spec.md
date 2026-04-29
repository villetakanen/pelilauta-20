---
feature: Channels (Meta-List)
status: draft
maturity: design
last_major_review: 2026-04-29
parent_spec: ../spec.md
---

# Feature: Channels (Meta-List)

## Blueprint

### Context

The Channels feature is the **directory page** for the Discussions vertical: a single anonymous-SSR route at `/channels` that lists every discussion channel grouped by category, with a per-channel "latest activity" summary. It is the primary navigation surface from the front page into individual channels — each row links to `/channels/{slug}`, where the per-channel thread browser (a separate feature) takes over.

This spec covers the meta-list page and the components and API endpoints that feed it. The component code lives **inside `packages/threads/`** (the channel directory is a threads-package surface, not a host surface), but the spec is top-level because the directory is a bespoke navigation feature with its own contract, not a sub-feature of "threads".

Scope this spec excludes:

- The per-channel thread browser at `/channels/[channel]` (a different surface; will be specced separately).
- The `Channel` schema and `getChannels()` / `getChannelsWithStats()` accessors — those live in [`../threads/spec.md`](../threads/spec.md) §Channel Schema and §Accessor Surfaces.
- Channel admin (`/admin/channels`) — separate spec.

Reverse-engineered from `pelilauta-17` sources at:

- `src/pages/channels/index.astro`
- `src/components/server/channels/{ChannelsApp,ChannelsList,ChannelInfoRow,ChannelListInfoCell}.astro`
- `src/pages/api/channels-with-stats.json.ts`
- `src/pages/api/meta/channels.json.ts`
- `src/utils/server/channels.ts`

### Architecture

#### Route

- **`/channels`** — anonymous-SSR directory. Lists every channel grouped by `category`, with each row showing the channel icon, name link, description, thread count, and a "latest activity" cell. The page mounts no CSR for the directory itself; the host's fab tray and authenticated chrome (if present) are layered on by `Page.astro` via slots.

#### Host components (`app/pelilauta/src/`)

- `pages/channels/index.astro` — anonymous-SSR landing page. Renders the channels-package directory component, attaches the host's poster, footer credits, and fab-tray slot content. No data fetching or schema work happens at this level — the page is composition only.

#### Channels-package components (`packages/threads/src/components/`)

> The channel meta-list lives in the threads package alongside the data accessors and schema it consumes. The components are domain-shaped (no `Cn**` namespace) and compose DS primitives underneath.

- `ChannelsApp.astro` — the directory orchestrator. SSR-fetches `/api/channels-with-stats.json`, parses through `ChannelsWithStatsSchema`, hands the array to `ChannelsList`. Emits an `<h1 class="sr-only">` carrying the discussions title for accessibility/SEO. On fetch failure, parse failure, or an empty array response, the page-level frontmatter sets `Astro.response.status = 500` and renders the host's error layout instead of the directory — see §Failure modes.
- `ChannelsList.astro` — categorisation. Groups input by `channel.category` and emits one `<section>` per distinct category, with the category name as the section header. Categories are derived from data at render time — there is no registry. Channels with no category fall under the `"Pelilauta"` bucket.
- `ChannelInfoRow.astro` — single channel row: channel icon, channel name as a link to `/channels/{slug}`, channel description, thread count label, and the latest-activity cell.
- `ChannelListInfoCell.astro` — latest-activity cell with three states:
  - `latestThread` is non-null AND `latestUpdatedThread` is non-null AND has a different key → render both a "latest created" link and a "latest replied" link with timestamp + author profile link.
  - `latestThread` is non-null AND (`latestUpdatedThread` is null OR shares the key) → render a single "latest is newest" italic note (no link).
  - `latestThread` is null → cell renders nothing about thread activity (empty channel; the `threadCount` label on the row already conveys the state).

#### API contracts consumed

- **`GET /api/channels-with-stats.json`** — aggregated directory + stats endpoint.
  - **Body:** `ChannelsWithStatsSchema` array. Each entry is a `Channel` plus `stats: { latestThread: Thread | null, latestUpdatedThread: Thread | null }`.
  - **Headers:** `ETag` (sha1 of body), `Cache-Control: s-maxage=120, stale-while-revalidate=300`. `If-None-Match` honoured (`304` on match).
  - **Server:** reads the channel directory via `getChannels()`, then for each channel parallel-fetches the latest thread by `createdAt desc` and by `flowTime desc`. Per-channel failures degrade to `{ latestThread: null, latestUpdatedThread: null }` — the channel still appears. The denormalised `latestThread` / `latestReply` snapshots on the channel doc are NOT used as the source of truth — they are aspirational v17 fields with no writer-side population in v20. Treat them as legacy noise.
  - **Empty-channels response:** `200` with `[]` body. The endpoint is a data primitive — an empty array is a valid response at the data layer. The page consuming it (`/channels`) is responsible for treating empty as fatal; that is a UX-layer concern, not a data-layer one. (v17 returned `404` here, conflating the layers — that is corrected in v20; see Migration Debt.)
- **`GET /api/meta/channels.json`** — bare directory (no stats).
  - **Body:** `ChannelsSchema` array. No `stats` field.
  - **Headers:** `ETag` (sha1 of body), `Cache-Control: s-maxage=3600, stale-while-revalidate`.
  - **Used by:** other surfaces that need the directory without paying for stats (e.g. the per-channel page resolving `slug → Channel`). The meta-list page itself uses the with-stats endpoint.
  - Applies the schema's legacy-tolerant defaults during parse (per `ChannelSchema` in [`../threads/spec.md`](../threads/spec.md)).

Both routes are read-only and anonymous-reachable. Neither requires authentication.

#### Failure modes

`/channels` treats two distinct upstream conditions as fatal at the page layer, even though both are HTTP-correct at the data layer:

1. **Fetch failure** — `/api/channels-with-stats.json` is unreachable, returns non-2xx, or the JSON body fails `ChannelsWithStatsSchema.parse()`.
2. **Empty directory** — the fetch succeeds with `200 []` (the API's correct response when `meta/threads.topics` is empty or missing).

Both cases trigger the same page-level response:

- `Astro.response.status = 500`
- `Cache-Control: no-store` on the response (CDNs MUST NOT pin a 500 from a transient outage or a temporarily-empty directory).
- The host's 500 error layout renders in place of `ChannelsList`. No partial directory, no empty state — the page is fatal-or-correct.
- Both branches log loudly via `logError` with distinguishable codes (e.g. `'channels.fetch_failed'` vs. `'channels.empty_directory'`) so ops can tell drift from outage in logs without reading the body.

Pelilauta is unusable without channels; rendering a half-broken UI in either state is worse than a clean error page.

#### SEO and head metadata

- Title: `t('seo:channels.title')`. Description: `t('seo:channels.description')`. OG image: a host-owned poster URL.
- Single visible heading hierarchy: the `<h1>` inside `ChannelsApp` is `sr-only`; each category renders an `<h2>` with the category name; each channel row renders an `<h3>` with the channel name. Removing or downgrading the `<h1>` is a SEO/a11y regression.

#### Cache headers

| Surface | Header |
|---|---|
| `/channels` HTML (200 OK) | _inherited from the host's anonymous-SSR default_ |
| `/channels` HTML (500) | `Cache-Control: no-store` |
| `/api/channels-with-stats.json` | `s-maxage=120, stale-while-revalidate=300`, `ETag` |
| `/api/meta/channels.json` | `s-maxage=3600, stale-while-revalidate`, `ETag` |

ETags are emitted on both endpoints; clients revalidate via `If-None-Match` and receive `304` when the body is unchanged.

#### Dependencies

- [`@pelilauta/threads`](../threads/spec.md) — `ChannelSchema`, `ChannelsSchema`, `ChannelsWithStatsSchema`, `Channel`, `ChannelWithStats`, `getChannels()`, `getChannelsWithStats()`. Schema/accessor contracts owned there.
- [`@pelilauta/profiles`](../profiles/spec.md) — `ProfileSummary` schema, `getProfile(uid)` / batch resolver, and the SSR `ProfileLink` component used by the latest-activity cell. **Blocking dependency** — see §Blocked on.
- [`@pelilauta/firebase/server`](../firebase/spec.md) — server-side Firestore reads behind both API routes.
- `@pelilauta/cyan` — DS primitives (icon, card, layout, typography). All visual styling composes DS primitives; no inline styles, no app-local `<style>`.
- `@pelilauta/i18n` — translation engine (consumed by the host).
- **Channels-owned keys all ship from `@pelilauta/threads/i18n`**, including both UX keys (`threads:forum.title`, `threads:channel.threadCount`, `threads:channel.latest.*`) and SEO keys (`seo:channels.title`, `seo:channels.description`). The threads package owns every string for the surfaces it renders; the `seo:` prefix is organisational, not an ownership boundary. Host-only keys (`app:shortname`, etc.) continue to live in the host's own i18n.

#### Constraints

- **Anonymous-SSR.** `/channels` requires no session, no Firebase client SDK, no `AuthHandler`, no `AuthChrome` mount on the directory itself. Authenticated chrome layers via `Page.astro` only when `Astro.locals.uid` is set.
- **Zero CSR for the directory.** The list of channels and the latest-activity cells are fully server-rendered. No `client:` directives on `ChannelsApp`, `ChannelsList`, `ChannelInfoRow`, or `ChannelListInfoCell`. The latest-activity cell consumes the SSR `ProfileLink` from [`@pelilauta/profiles`](../profiles/spec.md) (its first feature) — see §Blocked on.
- **Categories derive from data, not from a registry.** `ChannelsList` groups by distinct values of `channel.category` at render time. Adding a new category is a Firestore write, not a code change. Channels with no category bucket under `"Pelilauta"`.
- **Apps never override the DS.** Pages and channels-package components MUST NOT use inline `style="…"` attributes or page-local `<style>` blocks for layout, typography, or theming. Missing layout primitives are DS bugs and must be escalated to cyan.
- **No breaking data contract changes.** The `meta/threads.topics` array shape MUST NOT be changed by this surface (per `feedback_no_breaking_data_contracts`). Schema-level legacy tolerance lives in `ChannelSchema` (threads spec).
- **Cache-revalidation is always cheap.** Both API routes MUST emit `ETag` headers and honour `If-None-Match`. Stat-fetch errors degrade per-channel; they do not fail the whole response.

#### Blocked on

This spec is **blocked on `@pelilauta/profiles`** ([`../profiles/spec.md`](../profiles/spec.md)). The latest-activity cell needs an SSR-rendered profile link backed by a uid-deduped batch resolver — that primitive lives in the profiles microfrontend (the first feature of which is `ProfileLink`). Implementation of the channels directory does not start until profiles MF Stage 1 (package shell + ProfileLink + `getProfileSummaries(uids)` server batch fetcher) is shippable. The thread-card surface has the same blocking dependency on the same primitive.

The integration shape, once profiles ships:

- `getChannelsWithStats()` is wrapped (or extended) by an upstream resolver that collects the union of `latestThread.author` / `latestUpdatedThread.author` uids across the response, calls `getProfileSummaries(uids)` once per page render, and inlines `{ uid, nick, avatarURL } | null` into each thread snapshot. `null` covers the `"-"` anonymous sentinel and the not-found case — the cell renders the anonymous label in both.
- `ChannelListInfoCell` consumes the prepared `ProfileSummary` directly via `<ProfileLink profile={…} />` — no per-cell lookup, no Svelte island.
- The hydration is an additive API-response-shape change to `/api/channels-with-stats.json`. Firestore storage shape is unchanged.

### Out of Scope (deferred to future specs)

- **Per-channel thread browser.** The page at `/channels/[channel]` — its SSR thread seed, "load more" pagination, channel-scoped search box, channel-scoped FAB — is a separate feature spec (`specs/pelilauta/threads/channel-page/spec.md` or similar). The directory only links to those pages.
- **Authenticated personalisation** of the directory: favourites, last-visited, unread counts. Out of scope for the v20 MVP.
- **Reordering / featured channels.** Display order within a category is whatever the upstream array iteration order produces (Firestore `meta/threads.topics`). No featured-channel concept.
- **Per-channel RSS / feed surfaces.** v17's `pages/rss/` is not part of the directory; covered separately if/when ported.
- **Channel admin UI** (`/admin/channels`). Separate spec.
- **A non-error empty state for `/channels`.** Empty-but-valid is treated as a system error (500), not as a happy empty UI. See §Failure modes. If a future feature wants a "no channels yet, here's how to seed them" admin onboarding flow, that is a separate surface.

## Contract

### Definition of Done

- [ ] `/channels` renders as anonymous SSR with no Firebase client SDK in the bundle and no `AuthHandler` / `AuthChrome` mounted on the directory itself.
- [ ] Every channel from `meta/threads.topics` appears under exactly one category section. Channels missing a category bucket under `"Pelilauta"`.
- [ ] Each row shows the channel icon, name link to `/channels/{slug}`, description, thread count label, and the latest-activity cell.
- [ ] The latest-activity cell renders three distinct states (latest+updated-different, single-or-same, no-thread).
- [ ] `GET /api/channels-with-stats.json` returns `ChannelsWithStatsSchema`-shaped JSON with ETag headers and honours `If-None-Match` revalidation. Empty directory returns `200` with `[]` — the endpoint is HTTP-correct at the data layer; the consuming page (`/channels`) is what flips empty to 500.
- [ ] `/channels` returns HTTP 500 with `Cache-Control: no-store` and the host's 500 error layout when the channels fetch fails OR when the response is an empty array. The two cases are distinguishable in logs.
- [ ] `GET /api/meta/channels.json` returns `ChannelsSchema`-shaped JSON with ETag headers and honours `If-None-Match` revalidation. Legacy-tolerant defaults from `ChannelSchema` apply.
- [ ] Per-channel stats failure on `/api/channels-with-stats.json` degrades to `{ latestThread: null, latestUpdatedThread: null }` for that channel without failing the rest of the response.
- [ ] No inline `style="…"` attributes or app-local `<style>` blocks in `pages/channels/index.astro` or any channels-package directory component. All layout composes DS primitives.

### Regression Guardrails

- Anonymous paint of `/channels` MUST NOT load the Firebase client SDK or mount `AuthHandler`/`AuthChrome` on the directory itself. The directory components must remain CSR-free.
- The page-level `<h1>` (even when `sr-only`) MUST remain present. Each category MUST emit an `<h2>` and each channel row an `<h3>`.
- The `meta/threads.topics` array shape MUST NOT change. The directory is a read-only consumer.
- Both API endpoints MUST emit ETags. Removing them is a CDN/revalidation regression.
- The API endpoint MUST return `200 []` on an empty directory — not `404`, not `500`. v17's `404` was an HTTP-semantics violation that conflated the data and UX layers; v20 fixes it by separating them.
- The page MUST flip to 500 when the directory is empty OR the fetch fails. Rendering a happy empty UI for missing channels is a UX regression; Pelilauta is unusable without channels.
- A 500 from `/channels` MUST carry `Cache-Control: no-store`. CDN-pinning a 500 turns a transient outage into a sustained outage.

### Testing Scenarios

#### Scenario: /channels renders the directory grouped by category

```gherkin
Given the meta/threads document holds 5 channels across 2 distinct categories
When an anonymous visitor requests "/channels"
Then the response is 200 with HTML
And exactly one <section> is emitted per distinct category value
And every channel appears under exactly one category section
And each row shows the channel icon, name link, description, and threadCount label
And no Firebase client SDK chunk is requested
```

#### Scenario: /channels falls back the missing-category bucket to "Pelilauta"

```gherkin
Given a channel with no category field
When the directory renders
Then that channel is grouped under the "Pelilauta" section
```

#### Scenario: latest-activity cell renders the "latest is newest" state

```gherkin
Given a channel whose stats.latestThread is non-null and stats.latestUpdatedThread is null
When the directory renders
Then the cell shows a "latestIsNewest" italic note
And no "latest replied" link is rendered

Given a channel whose stats.latestThread.key === stats.latestUpdatedThread.key
When the directory renders
Then the cell shows a "latestIsNewest" italic note
And no "latest replied" link is rendered
```

#### Scenario: latest-activity cell renders both pointers when distinct

```gherkin
Given a channel whose stats.latestThread and stats.latestUpdatedThread reference different keys
When the directory renders
Then the cell shows a "latest created" link to /threads/{latestThread.key}
And the cell shows a "latest replied" link to /threads/{latestUpdatedThread.key}
And each link carries its respective timestamp and author profile link
```

#### Scenario: latest-activity cell is silent when the channel has no threads

```gherkin
Given a channel whose stats.latestThread is null
When the directory renders
Then the latest-activity cell renders nothing about thread activity
And the row's threadCount label still appears
```

#### Scenario: /api/channels-with-stats.json honours ETag revalidation

```gherkin
Given a prior response carried ETag "E1"
When a request arrives with If-None-Match: E1 and the body has not changed
Then the response status is 304 with no body
```

#### Scenario: /api/channels-with-stats.json degrades per-channel on stats failure

```gherkin
Given the channel directory contains 3 channels
And the latest-thread query for one of them throws
When /api/channels-with-stats.json is requested
Then the response status is 200
And all 3 channels are present in the body
And the failing channel's stats are { latestThread: null, latestUpdatedThread: null }
```

#### Scenario: /api/channels-with-stats.json returns 200 with [] on an empty directory

```gherkin
Given the meta/threads document contains no channels
When /api/channels-with-stats.json is requested
Then the response status is 200
And the body is an empty JSON array
```

#### Scenario: /channels renders a 500 when the channels fetch fails

```gherkin
Given /api/channels-with-stats.json is unreachable (network error or non-2xx response)
When an anonymous visitor requests "/channels"
Then the response status is 500
And the response carries Cache-Control: no-store
And the host's 500 error layout is rendered
And no partial directory is rendered
And a logError entry is emitted with the "channels.fetch_failed" code
```

#### Scenario: /channels renders a 500 when the directory is empty

```gherkin
Given /api/channels-with-stats.json returns 200 with an empty JSON array
When an anonymous visitor requests "/channels"
Then the response status is 500
And the response carries Cache-Control: no-store
And the host's 500 error layout is rendered
And no empty-state list is rendered
And a logError entry is emitted with the "channels.empty_directory" code
```

#### Scenario: /api/meta/channels.json applies legacy-tolerant defaults

```gherkin
Given the meta/threads document holds a channel object missing icon, description, threadCount, and flowTime
When /api/meta/channels.json is requested
Then the response status is 200
And the channel parses with icon="discussion", description="", threadCount=0, flowTime=0
```

## Migration Debt and Decisions

> Captured for the user's review during v20 implementation. NOT part of the v20 contract — call-site decisions, anomalies in the v17 source, and DS-escalation candidates.

### Bugs / anomalies in the v17 source (do not propagate)

- **`/api/channels-with-stats.json` returns `404` on an empty channel list with an empty array body.** The resource exists; it's just empty. v17 conflated the data and UX layers — "no channels" is fatal at the page, but the API endpoint should still report what it actually found. v20 splits them: API returns `200 []`, page returns `500`. (Already pinned in §Definition of Done.)
- **`ChannelsWithStatsSchema` declares `stats.latestThread: z.nullable(z.any())`** with a comment about circular-dependency avoidance. v20 must resolve this — forward-declared `ThreadSchema`, schema split, or a typed nullable. `z.any()` defeats the purpose of having a schema.
- **`ChannelListInfoCell.astro:20,27` mounts `<ProfileLink … client:only="svelte"/>` per row.** That's one Svelte island per channel on an anonymous-SSR page that should ship zero CSR for the directory. v20 replaces this with the SSR `ProfileLink` from `@pelilauta/profiles` consuming a pre-resolved `ProfileSummary` — see §Blocked on.
- **`getChannelsWithStats()` re-fetches every channel's latest threads on every cache miss.** That is `2 × N` parallel Firestore reads on cache miss. **Decided for v20: keep this pattern (Option A).** The 2-minute CDN cache absorbs most repeats; N is small (<100 channels in practice); the alternative (denormalised `latestThread` / `latestReply` snapshots already declared on `ChannelSchema`) requires writer-side discipline on every thread/reply create path and introduces a permanent drift failure mode if any writer skips the update. The schema fields exist but are aspirational — v20 ignores them on the read path.

### Migration debt to scrub on the way in

- **`cn-icon` web-component tags** are used directly in `ChannelInfoRow.astro:13`. v20's component is `CnIcon` from cyan; web-component tags are gone.
- **Tailwind-flavoured utility classes** throughout (`text-h4`, `text-h5`, `text-small`, `text-low`, `text-caption`, `flex-row`, `border-b`, `m-0`, `mt-1`, `mb-0`, `cols-2`, `surface`, `flex-none`, `no-underline`, `hover-underline`, `sm-only`). v20 composes DS primitives instead.
- **Bare custom-element layout in `ChannelInfoRow.astro`** (`<article class="surface cols-2">`). The 2-column row layout (info on the left, latest-activity on the right, stacked on small viewports) is migration debt regardless. The implementation path is fixed in §Decisions: `/reverse-spec` against cyan-4 for an info-row / list-row / media-object precedent first; if one exists, port it into v20 cyan and compose; if none exists, build `ChannelInfoRow.astro` in `packages/threads/components/` from existing DS primitives (`CnCard` + `CnIcon` + stack/grid helpers).
- **`ProfileLink client:only="svelte"`** on every row (see anomalies above) — replace with the SSR `ProfileLink` from `@pelilauta/profiles`.
- **The `t('threads:channel.latest.latestIsNewest')` italic message** is the single-thread-fallback state. v17 wraps it in `<i>{...}</i>`. v20 should use a DS de-emphasis token (e.g. `--cn-color-text-low` or a "muted-italic" text variant) rather than a bare `<i>` tag.

### Decisions for v20

1. **DS escalation for the channel row** _(decided 2026-04-29 — reverse-spec first)_: before designing the row, run `/reverse-spec` against the cyan-4 source for any "info row" / "list row" / "media object" precedent. If one exists, port it into v20 cyan and compose underneath. If none exists, implement `ChannelInfoRow.astro` in `packages/threads/components/` from existing DS primitives (`CnCard` + `CnIcon` + a stack/grid helper) — no new cyan primitive. The pre-emptive reverse-spec is mandated by `feedback_reverse_spec_first`; skipping it before inventing a primitive is a process violation.
2. **i18n key ownership** _(decided 2026-04-29)_: all channels strings — UX (`threads:forum.title`, `threads:channel.threadCount`, `threads:channel.latest.*`) and SEO (`seo:channels.title`, `seo:channels.description`) — live in `@pelilauta/threads/i18n` and ship from the threads package's `./i18n` sub-export. Single ownership per surface; the `seo:` namespace is organisational, not an ownership signal. Document the convention in [`../i18n/spec.md`](../i18n/spec.md) when next touched.
3. **Profile-link SSR variant** _(decided 2026-04-29 — externalised)_: the SSR profile link is owned by [`@pelilauta/profiles`](../profiles/spec.md), not by channels, threads, auth, or cyan. Profile is the public projection of an account, distinct from the account itself; it is its own microfrontend at the threads-vertical level. The channels directory consumes `ProfileLink` and `getProfileSummaries(uids)` from that package, with hydration happening upstream in the data fetch (see §Blocked on). Channels implementation is parked until profiles MF Stage 1 ships.
