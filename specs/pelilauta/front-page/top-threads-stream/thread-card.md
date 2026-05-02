---
feature: ThreadCard Component
status: alpha
maturity: implementation
last_major_review: 2026-04-30
parent_spec: ./spec.md
---

# Feature: ThreadCard

> Sub-spec of [Top Threads Stream](./spec.md). ThreadCard is the per-row preview
> component used by TopThreadsStream; it has no other consumers and is specced
> separately because its rendering surface — particularly the v17-parity gap —
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
    thread: Thread;            // for title, key, locale (channel name read from props, not thread.channel)
    snippet?: string;          // pre-rendered plain-text body preview
    coverUrl?: string;         // pre-resolved cover image URL
    channelSlug: string;       // pre-resolved channel slug for the link href
    channelLinkLabel: string;  // pre-rendered link text (e.g. "Aiheessa Pelit" / "In Pelit") via t("threads:thread.inChannel", { topic })
    channelIcon?: string;      // pre-resolved icon noun, omitted when unknown
    authorProfile?: Profile | null;
    anonymousLabel: string;    // required — no English default in code
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
  - **Body (`.card-info`):** the snippet `<p>` if `snippet` is non-empty,
    and the byline `<p>` composed via `ProfileLink`.
- **Interactivity model:** the card is multi-link — the title and (optional)
  cover image link to `/threads/{thread.key}` via CnCard's `href`; the channel
  name links to `/channels/{channelSlug}`; the byline links to
  `/profiles/{uid}` via `ProfileLink`. The card root is passive; there is no
  card-as-button wrapper.
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

- [ ] `ThreadCard.svelte` renders a thread as a card built on `CnCard`,
      reading title, key, locale, and channel display name from `thread`, and
      receiving everything else as props.
- [ ] The channel link is composed into CnCard's `eyebrow` slot as
      `<a href="/channels/{channelSlug}">{channelLinkLabel}</a>` — rendered
      as a caption-style overline above the title with the underline
      suppressed by the eyebrow primitive. ThreadCard does not emit a
      separate `<p>` for the channel link.
- [ ] The snippet, when non-empty, renders as a `<p>` above the byline.
      When `snippet` is empty or absent, the snippet `<p>` is omitted (only
      the byline `<p>` remains in the body).
- [ ] The author byline composes `ProfileLink` from
      `@pelilauta/profiles/components`, with `authorProfile?: Profile | null`
      and `anonymousLabel: string` passed in from the rendering page.
      ThreadCard itself never emits a bare `<a>` or `<span>` for the byline.
- [ ] The title and optional cover image link to `/threads/{thread.key}`;
      the channel link (rendered via CnCard's eyebrow slot) uses
      `channelLinkLabel` as its text and links to `/channels/{channelSlug}`;
      the card root is not a link.
- [ ] The card's outermost element carries `lang={thread.locale}` for DOM
      content-locale stamping.

### Regression Guardrails

- The card body composes multiple discrete link targets (title via `CnCard`'s
  `href`, channel via `<a>`, byline via `ProfileLink`). Wrapping the whole
  body in a single `<a>` is the card-as-button anti-pattern and is a
  regression.
- The byline is delegated entirely to `ProfileLink` for both the
  resolved-profile and anonymous cases; ThreadCard never emits byline markup
  directly.
- Imports limited to `CnCard`, `ProfileLink`, and the `Thread` / `Profile`
  types. Derivation utilities (`getProfile`, `markdownToPlainText`, slug
  computation, image fallback chains) live upstream; ThreadCard is pure
  render-from-props.
- The author uid is read by the upstream consumer from `thread.owners[0]`.
  ThreadCard's contract presupposes the consumer follows that rule.
- `anonymousLabel` is a required prop with no default. The required-prop
  semantics fail loudly at type-check if a consumer forgets, preventing
  untranslated fallback text from leaking into a non-English locale.

### Testing Scenarios

#### Scenario: ThreadCard composes ProfileLink for the author byline

```gherkin
Given a Thread with owners[0] = "uid-a"
And authorProfile = { key: "uid-a", nick: "Ada", username: "ada" }
And anonymousLabel = "Anonymous"
When ThreadCard is rendered
Then the byline contains a ProfileLink that emits <a href="/profiles/uid-a">Ada</a>
And no bare <a> or <span> byline markup is emitted directly by ThreadCard

Given a Thread with owners[0] = "-"
And authorProfile = null
And anonymousLabel = "Anonymous"
When ThreadCard is rendered
Then the byline contains a ProfileLink that emits <span>Anonymous</span>
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

## Migration Debt and Decisions

> v17-parity gaps captured for prioritisation. NOT part of the v20 MVP
> contract — these items will be promoted into Definition of Done when their
> implementation is scheduled.

### v17 features ThreadCard does not yet adopt

- **Adopt `CnCard`'s `actions` slot for the byline/metadata footer row.**
  v17 thread cards have a divider-separated footer carrying author/date on
  the left and reply count on the right. `CnCard` already exposes the
  `actions` slot for this layout (see cyan-ds spec); ThreadCard just hasn't
  wired its byline and metadata into it yet. This is a consumption change in
  ThreadCard, not a DS primitive change.
- **Surface thread metadata.** Reply counts (`replyCount`), love counts
  (`lovedCount`), and creation/activity dates do not currently appear on the
  card. Wiring requires propagating the fields through `Thread` props and
  rendering them in the (future) `actions`-slot footer.
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
   structural primitives are the DS contract. A "missing v17 visual feature"
   lands in this spec when the resolution is a ThreadCard consumption choice;
   if it requires a new DS primitive, it escalates to `specs/cyan-ds/`.
5. **Render-from-props boundary.** Any data derivation (markdown rendering,
   image fallback chains, slug computation, profile lookups) lives in the
   consumer's frontmatter, not in ThreadCard. This keeps the component
   synchronous, SSR-pure, and unit-testable with primitive props.
