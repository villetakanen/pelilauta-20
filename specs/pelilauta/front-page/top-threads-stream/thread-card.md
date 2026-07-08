---
feature: ThreadCard Component
status: draft
last_major_review: 2026-05-02
parent_spec: ./spec.md
---

# Feature: ThreadCard

> Sub-spec of [Top Threads Stream](./spec.md). ThreadCard is the per-row preview
> component used by TopThreadsStream; it has no other consumers and is specced
> separately because its rendering surface — particularly the v18-parity gap —
> is independently iterable from the stream's data-flow contract.

## Blueprint

### Context

`ThreadCard` is a domain component owned by the threads package
(`packages/threads/src/components/ThreadCard.svelte`) and consumed exclusively
by `TopThreadsStream`. It composes `CnCard` from the Cyan DS underneath and
renders thread-specific content (title link, channel link, snippet, cover,
byline) from props. Per ARCHITECTURE.md SSR Data Flow, all data prep —
markdown → plain-text snippet, cover-image fallback chain, channel → slug/icon
resolution, profile resolution — happens upstream in the consumer's
frontmatter; ThreadCard renders synchronously from the prepared values.

### Architecture

- **Component:** `packages/threads/src/components/ThreadCard.svelte` (Svelte 5).
- **Props:**
  ```ts
  {
    thread: Thread;            // for title, key, locale, replyCount (channel name read from props, not thread.channel)
    snippet?: string;          // pre-rendered plain-text body preview
    coverUrl?: string;         // pre-resolved cover image URL
    channelSlug: string;       // pre-resolved channel slug for the link href
    channelLinkLabel: string;  // pre-rendered link text (e.g. "Aiheessa Pelit" / "In Pelit") via t("threads:thread.inChannel", { topic })
    channelIcon?: string;      // pre-resolved icon noun, omitted when unknown
    authorProfile?: Profile | null;
    anonymousLabel: string;    // required — no English default in code
    dateLabel: string;         // required — pre-rendered flow-time string (relative ≤72h, ISO YYYY-MM-DD beyond)
  }
  ```
- **DS dependencies:** `CnCard` (`@cyan/components`) — provides the structural
  shell (`elevation`, `border-radius`, typography), the optional cover image,
  the title `href` wrapping, and the `actions` slot. ThreadCard *consumes*
  these; it does not define them. Slot mechanics and visual primitives are
  CnCard's contract, owned in `specs/cyan-ds/`.
- **Domain dependencies:** `ProfileLink` (`@pelilauta/profiles/components`),
  `Thread` and `Profile` types from their owning packages.
- **Visual hierarchy:**
  - **Root wrapper:** a `<div lang={thread.locale}>` stamps the per-card
    content locale per the i18n spec's DOM lang attribution rule. The
    surrounding stream container has no `lang` attribute and inherits from
    `<html lang>`.
  - **Header (CnCard):** thread title rendered as `<h4>` inside `.card-header`;
    if the consumer supplied `channelIcon`, CnCard renders it next to the
    title (or on the cover, if a cover is present).
  - **Eyebrow (CnCard `eyebrow` slot):** the channel link
    (`<a href="/channels/{channelSlug}">` wrapping `channelLinkLabel`) is
    composed into CnCard's `eyebrow` slot, which renders it as a
    caption-style overline above the title. Underline removal and the
    caption typography are owned by CnCard's eyebrow primitive — ThreadCard
    only supplies the link.
  - **Body (`.card-info`):** the snippet `<p>` if `snippet` is non-empty.
    The byline does not appear in the body — it lives in the actions slot
    (see below).
  - **Actions (CnCard `actions` slot):** the snippet emits exactly two
    direct children, which CnCard's flex-row layout places at the row
    start and end (see [`specs/cyan-ds/components/cn-card/spec.md`](../../../cyan-ds/components/cn-card/spec.md) §Slots →
    `actions`):
    - **Start:** a `<p>` whose first line is the byline composed via
      `ProfileLink`, followed by `<br>` and `dateLabel` on the second
      line.
    - **End:** an `<a href="/threads/{thread.key}">` containing
      `<CnIcon noun="discussion" />` and a `<span>` with
      `thread.replyCount ?? 0`. Always rendered, even when the count is 0,
      to preserve a stable footer height.
    ThreadCard does not wrap these children in any layout `<div>`; the
    actions slot supplies the row layout.
- **Interactivity model:** the card is multi-link — the title and (optional)
  cover image link to `/threads/{thread.key}` via CnCard's `href`; the channel
  name links to `/channels/{channelSlug}`; the byline links to
  `/profiles/{uid}` via `ProfileLink`; the reply-count region links to
  `/threads/{thread.key}` (no anchor, no query parameter). The card root is
  passive; there is no card-as-button wrapper.
- **CnCard configuration:** `elevation={1}` is pinned. ThreadCard is the only
  consumer of this elevation level for this surface; changing it would break
  the stream's visual rhythm and is a regression.
- **Constraints:**
  - **Render-from-props.** ThreadCard does not call `markdownToPlainText`,
    does not derive `coverUrl` from `thread.poster`/`thread.images`, and does
    not slugify `thread.channel`. All such derivations happen upstream in the
    consumer's frontmatter and are passed as props. ARCHITECTURE.md SSR Data
    Flow: prep upstream, render synchronously.
  - **Profile resolution upstream.** The component receives `authorProfile` as
    a resolved `Profile | null`; ThreadCard never imports or calls `getProfile`.
  - **No `<style>` blocks, inline `style=""`, or app-local utility classes.**
    Visual concerns compose `CnCard` and other DS primitives.

## Contract

### Definition of Done

- [x] `ThreadCard.svelte` renders a thread as a card built on `CnCard`,
      reading title, key, locale, and `replyCount` from `thread`, and
      receiving everything else as props.
- [x] The channel link is composed into CnCard's `eyebrow` slot as
      `<a href="/channels/{channelSlug}">{channelLinkLabel}</a>` — rendered
      as a caption-style overline above the title with the underline
      suppressed by the eyebrow primitive. ThreadCard does not emit a
      separate `<p>` for the channel link.
- [x] The snippet, when non-empty, renders as the only `<p>` in the body
      (`.card-info`). When `snippet` is empty or absent, the body is empty.
      The byline does not appear in the body.
- [x] CnCard's `actions` slot emits exactly two direct children — the
      byline + `dateLabel` `<p>` and the reply-count `<a>` — with no
      layout `<div>` wrappers. CnCard's flex-row layout places them at
      the row start and end.
- [x] The byline composes `ProfileLink` from
      `@pelilauta/profiles/components`, with `authorProfile?: Profile | null`
      and `anonymousLabel: string` passed in from the rendering page.
      ThreadCard itself never emits a bare `<a>` or `<span>` for the byline.
- [x] `dateLabel` is rendered verbatim on a second line of the byline `<p>`,
      separated from the byline by `<br>`. ThreadCard does not format dates
      itself; the consumer pre-renders `dateLabel` (relative for ≤72h, ISO
      `YYYY-MM-DD` beyond) per ARCHITECTURE.md SSR Data Flow.
- [x] The reply-count region renders an `<a href="/threads/{thread.key}">`
      containing `<CnIcon noun="discussion" />` and a `<span>` with
      `thread.replyCount ?? 0`. The link is rendered unconditionally,
      including when `replyCount` is 0 or undefined.
- [x] The title and optional cover image link to `/threads/{thread.key}`;
      the channel link (rendered via CnCard's eyebrow slot) uses
      `channelLinkLabel` as its text and links to `/channels/{channelSlug}`;
      the reply-count link targets `/threads/{thread.key}` with no anchor
      and no query parameter; the card root is not a link.
- [x] The card's outermost element carries `lang={thread.locale}` for DOM
      content-locale stamping.

### Regression Guardrails

- The card composes multiple discrete link targets (title via `CnCard`'s
  `href`, channel via `<a>` in the eyebrow slot, byline via `ProfileLink`,
  reply count via `<a>` in the actions slot). Wrapping the whole body in a
  single `<a>` is the card-as-button anti-pattern and is a regression.
- The byline is delegated entirely to `ProfileLink` for both the
  resolved-profile and anonymous cases; ThreadCard never emits byline markup
  directly.
- The byline lives in CnCard's `actions` slot, not in `.card-info`. Putting
  it back in the body is a regression to the pre-actions-slot layout and
  loses v18 footer parity.
- The reply-count link targets `/threads/{thread.key}` only — no anchor, no
  `?jumpTo=unread` query parameter. Anchor / unread-jump support depends on
  reply rendering and read-state tracking that is out of scope for the v20
  MVP card; reintroducing those targets prematurely creates dead anchors.
- Imports limited to `CnCard`, `CnIcon`, `ProfileLink`, and the `Thread` /
  `Profile` types. Derivation utilities (`getProfile`, `markdownToPlainText`,
  slug computation, image fallback chains, date formatting) live upstream;
  ThreadCard is pure render-from-props.
- The author uid is read by the upstream consumer from `thread.owners[0]`.
  ThreadCard's contract presupposes the consumer follows that rule.
- `anonymousLabel` and `dateLabel` are required props with no default. The
  required-prop semantics fail loudly at type-check if a consumer forgets,
  preventing untranslated fallback text or unformatted timestamps from
  leaking into a non-English locale.
- Reactions, love counts, and the `notify` (unread) flag are deferred to
  separate attached modules (see ARCHITECTURE.md §"Module independence and
  sub-shapes"). Wiring them directly into ThreadCard — rather than via an
  attached-module component the consumer composes alongside ThreadCard —
  is a regression against the module-independence rule.

### Testing Scenarios

#### Scenario: ThreadCard composes ProfileLink for the author byline in the actions slot

```gherkin
Given a Thread with owners[0] = "uid-a"
And authorProfile = { key: "uid-a", nick: "Ada", username: "ada" }
And anonymousLabel = "Anonymous"
And dateLabel = "2 days ago"
When ThreadCard is rendered
Then CnCard's actions slot contains a ProfileLink that emits <a href="/profiles/uid-a">Ada</a>
And no bare <a> or <span> byline markup is emitted directly by ThreadCard
And no byline appears inside .card-info

Given a Thread with owners[0] = "-"
And authorProfile = null
And anonymousLabel = "Anonymous"
And dateLabel = "2024-12-31"
When ThreadCard is rendered
Then CnCard's actions slot contains a ProfileLink that emits <span>Anonymous</span>
And no <a> element is emitted for the byline
```

#### Scenario: ThreadCard composes the channel link into CnCard's eyebrow slot

```gherkin
Given a Thread with channel "pelit"
And channelSlug "pelit"
And channelLinkLabel "In Pelit"
When ThreadCard is rendered
Then a .eyebrow element contains <a href="/channels/pelit">In Pelit</a>
And ThreadCard does not emit a <p> wrapping the channel link
```

#### Scenario: ThreadCard renders dateLabel beside the byline

```gherkin
Given dateLabel = "2 days ago"
When ThreadCard is rendered
Then the actions slot's left region contains the byline element
And the same <p> contains a <br> followed by the literal text "2 days ago"
And ThreadCard does not call any date-formatting helper directly
```

#### Scenario: ThreadCard renders the reply-count link

```gherkin
Given a Thread with key = "thread-a" and replyCount = 4
When ThreadCard is rendered
Then the actions slot contains <a href="/threads/thread-a"> with a discussion CnIcon and the text "4"
And the link href has no #anchor and no ?jumpTo query parameter

Given a Thread with key = "thread-b" and replyCount = undefined
When ThreadCard is rendered
Then the actions slot contains <a href="/threads/thread-b"> with the text "0"
And the reply-count link is not omitted
```

## Migration Debt and Decisions

> v18-parity gaps captured for prioritisation. NOT part of the v20 MVP
> contract — these items will be promoted into Definition of Done when their
> implementation is scheduled.

### v18 features ThreadCard does not yet adopt

- **Reactions (love button).** v18's actions toolbar carries a
  `<ReactionButton>` between the byline and the reply-count link. In v20,
  reactions are an attached module per ARCHITECTURE.md §"Module
  independence and sub-shapes" and ship in a future `packages/reactions`.
  ThreadCard does not embed a reaction button directly; the consumer
  (TopThreadsStream and any future host) composes the reactions module's
  component alongside ThreadCard, or — when the reactions module ships —
  passes it into a slot ThreadCard exposes. Promoting reactions parity is
  blocked on the reactions module, not on ThreadCard.
- **Notify / unread (subscriptions).** v18 sets `cn-card.notify=true`
  on threads the authenticated user has not yet seen, via a CSR-only
  `<CardSubscription>` effect that consumes the v18 `subscriptions`
  store. In v20, read-state and subscriptions are an attached module
  (`packages/subscriptions`, future). ThreadCard does not pass `notify`
  to CnCard from its own logic; the subscriptions module, when it ships,
  will wire the flag from outside.
- **Rich-HTML snippet.** v18 uses `createRichSnippet(markdown, { maxLength: 220, headerClasses: ['text-h5'] })`
  and renders the result with `Fragment set:html=`. v20 renders a plain-text
  snippet via `markdownToPlainText`. Porting the rich snippet preserves
  heading scale in the preview but is independent of footer parity and
  not yet scheduled.

### v18 footer reverse-spec (2026-05-02)

> Reversed from `.tmp/pelilauta-17/src/components/server/FrontPage/ThreadCard.astro`,
> with supporting context from `ProfileLink.svelte`,
> `ReactionButton.svelte`, `CardSubscription.svelte`, and the
> `cn-card` element in `.tmp/cyan-design-system-4/packages/cyan-lit/src/cn-card/cn-card.ts`.
> (The folder name is `pelilauta-17/` for legacy reasons but the
> checked-out source is `pelilauta@18.13.3` — see
> `.tmp/pelilauta-17/package.json`.) Captured here so a future
> promotion of these items into Definition of Done has a single
> source of truth for what "v18 parity" means. Not yet a v20
> contract — the open questions below must be resolved first.

#### Footer structure

v18 fills `cn-card`'s `actions` slot with one horizontal toolbar
(`<div class="toolbar">`) containing three regions, in document order:

1. **Byline + flow-time** — `<div class="grow">` wrapping a `<p>` with two
   lines:
   - Author byline via `<ProfileLink uid={thread.owners[0]} />` — emits
     `<a class="cn-nick" href="/profiles/{uid}">{nick}</a>` when the
     profile resolves; `<span>{anonymous}</span>` otherwise; `<cn-loader>`
     while the profile atom is in flight.
   - `toDisplayString(thread.flowTime)` — bare ISO `YYYY-MM-DD` substring of
     the last-activity timestamp, called with `relative=false`. No
     localized prefix on the front-page card.
   - Wrapper class is `text-small`; the `.grow` flex child pushes the
     remaining two regions to the right edge.
2. **Reaction button** — `<ReactionButton key={thread.key} title={thread.title} target="thread" />`.
   - Renders nothing when `$uid` is unset, so the SSR output for an
     anonymous visitor contains no reaction markup.
   - Wraps the cyan-4 `<cn-reaction-button>` custom element with `count`,
     `checked`, and `inactive` derived from a `Reactions` nanostore.
   - Click handler optimistically toggles the `love` reaction in Firestore
     via the `toggleReaction` API and rolls back on error.
3. **Reply-count link** — `<a href="/threads/{key}?jumpTo=unread#discussion" class="px-1 no-decoration flex">` containing
   `<cn-icon noun="discussion" small>` and
   `<span class="text-caption">{thread.replyCount || 0}</span>`. The
   `?jumpTo=unread` query param drives the thread-detail page to scroll to
   the first unread reply.

The toolbar layout is supplied by cyan-4's `.toolbar` utility (display:
flex, justify-content: space-between, align-items: center, gap:
`var(--cn-gap)`, height: `7×grid`). cyan-4's `cn-card.css` adds
`cn-card .toolbar:last-child { margin-bottom: -1×grid }` to pull the
toolbar toward the bottom edge.

#### What the footer is *not*

- **No horizontal divider above the actions slot.** cyan-4's `cn-card`
  emits `<nav class="cardActions">` with edge-bleed margins only; there is
  no `border-top`. The "faint horizontal divider" reported in
  `docs/thread-cards-assessment.md` §1 is the `border-b` on the
  channel-line caption (`<p class="text-caption pb-1 mb-1 border-b">`),
  separating the channel name from the snippet *inside* the body — not
  between body and footer. v20 composes that channel-line via CnCard's
  `eyebrow` slot, whose typography distinguishes it from the snippet
  without a bottom border, so the divider is intentionally absent in v20.
- **No localized date prefix on the card.** v18's `info.flowTime` /
  `info.createdAt` localized strings are used by the thread-info article
  and the channel-app `ThreadListItem`, but the front-page card emits the
  bare `YYYY-MM-DD` substring with no prefix.

#### Behavioral contracts encoded in v18

- **Byline reads `thread.owners[0]`.** v20 already follows this; the
  consumer pre-resolves the `Profile` upstream rather than passing a uid.
- **Reaction button is authenticated-only and CSR-only.** It mounts as
  `client:only="svelte"`, lazy-imports `firebase/firestore` inside
  `onMount`, and renders nothing when `$uid` is unset. SSR output for an
  anonymous visitor must therefore omit it entirely.
- **Reply-count link target is `?jumpTo=unread#discussion`.** The query
  parameter is consumed by the thread-detail page; for anonymous visitors
  it falls back to a plain anchor scroll.
- **`notify` flag is a CSR effect.** v18's `<CardSubscription>` is a
  script-only Svelte component (emits no markup) that mutates
  `cn-card.notify` based on `hasSeen(thread.key, thread.flowTime)` for the
  authenticated viewer. Anonymous visitors unconditionally see
  `notify=false`.

#### Resolved decisions (2026-05-02)

The reverse-spec's open questions resolved as follows; the corresponding
contract changes are in §Definition of Done above.

1. **Reply-count target — `/threads/{thread.key}` (no anchor, no query
   parameter).** The link is rendered unconditionally with the count,
   even at 0, for stable footer height. `?jumpTo=unread#discussion` is
   not ported; unread tracking depends on the subscriptions attached
   module and reply rendering, both out of scope for the MVP card.
2. **Reactions — out of scope for the MVP card.** Reactions is an
   attached module (`packages/reactions`, future). ThreadCard does not
   embed a reaction button; integration is composed by the consumer
   when the reactions module ships. Cross-reference:
   ARCHITECTURE.md §"Module independence and sub-shapes".
3. **Notify / subscriptions — out of scope for the MVP card.**
   Subscriptions is an attached module (`packages/subscriptions`,
   future). ThreadCard does not drive `cn-card.notify`; the
   subscriptions module wires it from outside when it ships.
4. **Date format — relative for ≤72h, ISO `YYYY-MM-DD` beyond,
   pre-rendered upstream as `dateLabel: string`.** ThreadCard does not
   format dates itself; the consumer (`TopThreadsStream`) is
   responsible per the SSR Data Flow rule. The split is `Intl.RelativeTimeFormat`
   inside the 72-hour window and ISO outside it, matching the consistent
   form of v18's `toDisplayString(date, relative=true)`.
5. **Snippet fidelity — deferred, not blocked on this work.** Plain-text
   snippet via `markdownToPlainText` stays in place for now. A future
   port of `createRichSnippet` would replace the snippet prop's type
   from `string` (text) to a richer shape; tracked above under
   "v18 features ThreadCard does not yet adopt".

### Decisions for v20

1. **Channel-link typography parity (resolved 2026-04-30).** Closed via
   CnCard's new `eyebrow` slot — ThreadCard composes the channel link
   into it; the slot supplies caption-style typography (size, tracking,
   case, weight) by composing the `.text-caption` utility. Authoritative
   contract lives in [`specs/cyan-ds/components/cn-card/spec.md`](../../../cyan-ds/components/cn-card/spec.md)
   §eyebrow and [`specs/cyan-ds/utilities/text-caption/spec.md`](../../../cyan-ds/utilities/text-caption/spec.md).
2. **One consumer policy.** ThreadCard is consumed only by TopThreadsStream
   and no other consumer is planned. Adding a second consumer would re-open
   the "promote ThreadCard to its own feature spec" question; until then,
   this sub-spec is the right home.
3. **Code lives in the threads package.** Even though the contract lives
   under `front-page/top-threads-stream/`, the implementation file stays at
   `packages/threads/src/components/ThreadCard.svelte` because it consumes
   `Thread` data and ships from the threads package's build. This mirrors
   the pattern channels uses for `ChannelInfoRow.astro` (code in threads,
   contract under channels).
4. **DS-vs-domain split.** Per [`ARCHITECTURE.md`](../../../../ARCHITECTURE.md)
   §DS-vs-domain boundary. ThreadCard is domain-shaped because its API names
   `Thread`, `Channel`, and `Profile`; `CnCard`'s slots, tokens, and
   structural primitives are the DS contract. A "missing v18 visual feature"
   lands in this spec when the resolution is a ThreadCard consumption choice;
   if it requires a new DS primitive, it escalates to `specs/cyan-ds/`.
5. **Render-from-props boundary.** Any data derivation (markdown rendering,
   image fallback chains, slug computation, profile lookups) lives in the
   consumer's frontmatter, not in ThreadCard. This keeps the component
   synchronous, SSR-pure, and unit-testable with primitive props.
