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

The Channels feature is the **directory page** for the Discussions vertical: a single anonymous-SSR route at `/channels` that lists every discussion channel grouped by category. It is the primary navigation surface from the front page into individual channels — each row links to `/channels/{slug}`, where the per-channel thread browser (a separate feature) takes over.

This MVP spec covers the directory listing only. The component code lives **inside `packages/threads/`** (the channel directory is a threads-package surface, not a host surface), but the spec is top-level because the directory is a bespoke navigation feature with its own contract, not a sub-feature of "threads".

Scope **excluded** from this MVP — see §Out of Scope for the children that own each:

- Per-row "latest activity" cell (latest thread/reply + author byline)
- `/api/channels-with-stats.json` endpoint and per-channel stats fan-out
- `ChannelsWithStatsSchema` typing
- ProfileLink integration in the directory
- ETag / SWR / `Cache-Control` headers on the directory and its endpoints
- 500-on-empty page-level design opinion
- Per-channel thread browser at `/channels/{slug}`
- Channel admin (`/admin/channels`)

Reverse-engineered from `pelilauta-17` sources at:

- `src/pages/channels/index.astro`
- `src/components/server/channels/{ChannelsApp,ChannelsList,ChannelInfoRow}.astro`
- `src/pages/api/meta/channels.json.ts`
- `src/utils/server/channels.ts`

### Architecture

#### Route

- **`/channels`** — anonymous-SSR directory. Lists every channel grouped by `category`, with each row showing the channel icon, name link, description, and thread-count label. The page mounts no CSR; the host's authenticated chrome (if present) is layered on by `Page.astro` via slots.

#### Host components (`app/pelilauta/src/`)

- `pages/channels/index.astro` — anonymous-SSR landing page. Composition only: renders the channels-package directory component, attaches the host's poster, footer credits, and fab-tray slot content. No data fetching or schema work happens here.

#### Channels-package components (`packages/threads/src/components/`)

> The channel meta-list lives in the threads package alongside the data accessors and schema it consumes. Components are domain-shaped (no `Cn**` namespace) and compose DS primitives underneath.

- `ChannelsApp.astro` — directory orchestrator. Calls `getChannels()` in its frontmatter, hands the array to `ChannelsList`. Emits an `<h1 class="sr-only">` carrying the discussions title (`t("threads:title")`) for accessibility/SEO. On `getChannels()` failure, the host's error layout renders in place of the directory and the error is logged via `logError`.
- `ChannelsList.astro` — categorisation. Groups input by `channel.category` and emits one `<section>` per distinct category, with `<h2>` heading. Categories are derived from data at render time — there is no registry. Channels with no category fall under the literal `"Pelilauta"` bucket.
- `ChannelInfoRow.astro` — single channel row: channel icon (`CnIcon` from cyan), channel name as a link to `/channels/{slug}` inside an `<h3>`, channel description, and the threadCount label.

#### SEO and head metadata

- Title: `t("seo:channels.title")`. Description: `t("seo:channels.description")`. OG image: a host-owned poster URL.
- Heading hierarchy: page-level `<h1 class="sr-only">` carrying the discussions title; one `<h2>` per category with the category name; one `<h3>` per channel row with the channel name. Removing or downgrading the `<h1>` is a SEO/a11y regression.

#### Dependencies

- [`@pelilauta/threads`](../threads/spec.md) — `Channel` type, `ChannelSchema` / `ChannelsSchema`, and the `getChannels()` accessor. Schema and read-accessor contracts owned there.
- `@pelilauta/cyan` — DS primitives (`CnIcon`, layout/typography helpers). All visual styling composes DS primitives; no inline styles, no app-local `<style>`.
- `@pelilauta/i18n` — translation engine (consumed via the host's `t`). Channels-owned UX keys (`threads:title`, `threads:channel.threadCount`) and SEO keys (`seo:channels.title`, `seo:channels.description`) ship from `@pelilauta/threads/i18n`.

#### Constraints

- **Anonymous-SSR.** `/channels` requires no session, no Firebase client SDK, no `AuthHandler`, no `AuthChrome` mount on the directory itself. Authenticated chrome layers via `Page.astro` only when `Astro.locals.uid` is set.
- **Zero CSR for the directory.** The list of channels is fully server-rendered. No `client:` directives on `ChannelsApp`, `ChannelsList`, or `ChannelInfoRow`.
- **Categories derive from data, not from a registry.** `ChannelsList` groups by distinct values of `channel.category` at render time. Adding a new category is a Firestore write, not a code change.
- **The "Pelilauta" fallback-bucket name is a literal string**, not an i18n key. It matches the brand and follows the same rendering pipeline as data-driven category labels (which come from Firestore as plain strings). No `t()` call wraps it; no key ships from `@pelilauta/threads/i18n` for this purpose.
- **Apps never override the DS.** Pages and channels-package components MUST NOT use inline `style="…"` attributes or page-local `<style>` blocks for layout, typography, or theming. Missing layout primitives are DS bugs and must be escalated to cyan.
- **No breaking data contract changes.** The `meta/threads.topics` array shape MUST NOT be changed by this surface (per `feedback_no_breaking_data_contracts`). Schema-level legacy tolerance lives in `ChannelSchema` (threads spec).

### Out of Scope

The following are deferred to **child specs**, written when each feature's implementation starts. Each child spec inherits this parent's scope statement and contract; this spec stays silent on each child's contract details.

- **[`channels/latest-activity/spec.md`](./latest-activity/spec.md)** _(stub)_ — the per-row latest-thread / latest-replied cell, the `/api/channels-with-stats.json` endpoint, the `ChannelsWithStatsSchema` typing fix (resolving v17's `z.any()` placeholder), `ProfileLink` integration with `Profile` resolution upstream, ETag / SWR caching for the stats endpoint, the 500-on-empty page-level design opinion, and the distinguishable error-code logging.
- **[`channels/channel-page/spec.md`](./channel-page/spec.md)** _(stub)_ — the per-channel thread browser at `/channels/{slug}`, including SSR thread seed, "load more" pagination, channel-scoped search, channel-scoped FAB.
- **Authenticated personalisation** of the directory: favourites, last-visited, unread counts. Out of scope for v20 MVP entirely.
- **Reordering / featured channels.** Display order within a category is whatever the upstream array iteration order produces (Firestore `meta/threads.topics`). No featured-channel concept.
- **Per-channel RSS / feed surfaces.** v17's `pages/rss/` is not part of the directory; covered separately if/when ported.
- **Channel admin UI** (`/admin/channels`). Separate spec.

## Contract

### Definition of Done

- [ ] `/channels` renders as anonymous SSR with no Firebase client SDK in the bundle and no `AuthHandler` / `AuthChrome` mounted on the directory itself.
- [ ] Every channel from `meta/threads.topics` appears under exactly one category section. Channels missing a category bucket under the literal `"Pelilauta"`.
- [ ] Each row shows the channel icon, name link to `/channels/{slug}`, description, and threadCount label.
- [ ] Heading hierarchy: page-level `<h1 class="sr-only">`, one `<h2>` per category, one `<h3>` per channel row.
- [ ] On `getChannels()` failure, the host's error layout renders in place of `ChannelsList` and the error is logged via `logError`.
- [ ] No inline `style="…"` attributes or app-local `<style>` blocks in `pages/channels/index.astro` or any channels-package directory component. All layout composes DS primitives.

### Regression Guardrails

- Anonymous paint of `/channels` MUST NOT load the Firebase client SDK or mount `AuthHandler`/`AuthChrome` on the directory itself. The directory components must remain CSR-free.
- The page-level `<h1>` (even when `sr-only`) MUST remain present. Each category MUST emit an `<h2>` and each channel row an `<h3>`.
- The `meta/threads.topics` array shape MUST NOT change. The directory is a read-only consumer.

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

## Migration Debt and Decisions

> Captured for the user's review during v20 implementation. NOT part of the v20 contract — call-site decisions, anomalies in the v17 source that affect the MVP rendering, and DS-escalation candidates. Latest-activity / API / caching debt has moved to the latest-activity child spec.

### Bugs / anomalies in the v17 source (do not propagate)

- **`cn-icon` web-component tags** are used directly in v17 `ChannelInfoRow.astro:13`. v20's component is `CnIcon` from cyan; web-component tags are gone.
- **Tailwind-flavoured utility classes** throughout (`text-h4`, `text-h5`, `text-small`, `text-low`, `text-caption`, `flex-row`, `border-b`, `m-0`, `mt-1`, `mb-0`, `cols-2`, `surface`, `flex-none`, `no-underline`, `hover-underline`, `sm-only`). v20 composes DS primitives instead.
- **Bare custom-element layout in `ChannelInfoRow.astro`** (`<article class="surface cols-2">`). The 2-column row layout (info on the left, latest-activity on the right, stacked on small viewports) is migration debt regardless. The implementation path is fixed in §Decisions: `/reverse-spec` against cyan-4 for an info-row / list-row / media-object precedent first; if one exists, port it into v20 cyan and compose; if none exists, build `ChannelInfoRow.astro` in `packages/threads/components/` from existing DS primitives (`CnCard` + `CnIcon` + stack/grid helpers).

### Decisions for v20

1. **DS escalation for the channel row** _(decided 2026-04-29 — reverse-spec first)_: before designing the row, run `/reverse-spec` against the cyan-4 source for any "info row" / "list row" / "media object" precedent. If one exists, port it into v20 cyan and compose underneath. If none exists, implement `ChannelInfoRow.astro` in `packages/threads/components/` from existing DS primitives (`CnCard` + `CnIcon` + a stack/grid helper) — no new cyan primitive. The pre-emptive reverse-spec is mandated by `feedback_reverse_spec_first`; skipping it before inventing a primitive is a process violation.
2. **i18n key ownership** _(decided 2026-04-29)_: all channels strings — UX (`threads:title`, `threads:channel.threadCount`) and SEO (`seo:channels.title`, `seo:channels.description`) — live in `@pelilauta/threads/i18n` and ship from the threads package's `./i18n` sub-export. Single ownership per surface; the `seo:` namespace is organisational, not an ownership signal. Document the convention in [`../i18n/spec.md`](../i18n/spec.md) when next touched.
