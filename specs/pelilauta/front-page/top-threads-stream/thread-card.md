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
injects thread-specific content (title link, channel link, snippet, author
byline). The byline is rendered through `ProfileLink` from the profiles
package — the rendering page resolves profiles upstream and passes them in
as props.

### Architecture

- **Component:** `packages/threads/src/components/ThreadCard.svelte` (Svelte 5).
- **Props:** `{ thread: Thread, authorProfile?: Profile | null, anonymousLabel: string }`.
- **DS dependencies:** `CnCard` (`@cyan/components`) — provides the structural
  shell (`elevation`, `border-radius`, typography), the optional cover image,
  and the `actions` slot. ThreadCard *consumes* these; it does not define them.
  Slot mechanics and visual primitives are CnCard's contract, owned in
  `specs/cyan-ds/`.
- **Domain dependencies:** `ProfileLink` (`@pelilauta/profiles/components`),
  `Thread` and `Profile` types from their owning packages.
- **Visual hierarchy:**
  - **Header:** thread title (rendered as `<h4>` inside `.card-header`),
    optionally with a channel icon when the channel slug resolves.
  - **Body (`.card-info`):** channel link, plain-text snippet truncated to 220
    characters at a word boundary with ellipsis, and the byline composed via
    `ProfileLink`.
- **Interactivity model:** the card is multi-link — the title and (optional)
  cover image link to `/threads/{key}`; the channel name links to
  `/channels/{slug}`; the byline links to `/profiles/{uid}` via `ProfileLink`.
  The card root is passive; there is no card-as-button wrapper.
- **Constraints:**
  - Snippet rendering happens upstream (the consumer resolves
    `markdownToPlainText` and passes the truncated string in). The component
    does not call markdown utilities itself.
  - The component receives `authorProfile` as a resolved `Profile | null` —
    profile resolution is the consumer's responsibility, not ThreadCard's.
  - No `<style>` blocks, inline `style=""`, or app-local utility classes.
    Visual concerns compose `CnCard` and other DS primitives.

## Contract

### Definition of Done

- [ ] `ThreadCard.svelte` renders a thread as a card built on `CnCard` with a
      plain-text snippet (max 220 characters, truncated with ellipsis at word
      boundary).
- [ ] The author byline composes `ProfileLink` from
      `@pelilauta/profiles/components`, with `authorProfile?: Profile | null`
      and `anonymousLabel: string` passed in from the rendering page.
      ThreadCard itself never emits a bare `<a>` or `<span>` for the byline.
- [ ] The title and optional cover image link to `/threads/{key}`; the channel
      name links to `/channels/{slug}`; the card root is not a link.

### Regression Guardrails

- ThreadCard MUST NOT wrap its entire body in a single `<a>` (the
  card-as-button anti-pattern). Granular link targets are part of the
  interactivity contract.
- The byline MUST go through `ProfileLink` for both the resolved-profile and
  anonymous cases. Bare `<a>` / `<span>` byline markup is a regression.
- Profile resolution MUST happen upstream. ThreadCard MUST NOT import or call
  `getProfile`. The component is profile-display, not profile-fetching.
- The author uid is read by the upstream consumer from `thread.owners[0]`,
  never from the legacy `thread.author` field. ThreadCard's contract
  presupposes the consumer follows that rule.

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
- **Typography alignment.** The visual weight and scale of the channel link
  relative to the snippet and title is not yet aligned with the v17 baseline.
  Resolution lives in either `CnCard` typography tokens (DS) or ThreadCard's
  composition choices, depending on the gap — investigate before deciding
  ownership.

### Decisions for v20

1. **One consumer policy.** ThreadCard is consumed only by TopThreadsStream
   and no other consumer is planned. Adding a second consumer would re-open
   the "promote ThreadCard to its own feature spec" question; until then,
   this sub-spec is the right home.
2. **Code lives in the threads package.** Even though the contract lives
   under `front-page/top-threads-stream/`, the implementation file stays at
   `packages/threads/src/components/ThreadCard.svelte` because it consumes
   `Thread` data and ships from the threads package's build. This mirrors
   the pattern channels uses for `ChannelInfoRow.astro` (code in threads,
   contract under channels).
3. **DS-vs-domain split.** Slot mechanics, elevation, border-radius,
   typography, and other structural primitives are `CnCard`'s contract.
   Whether/how ThreadCard consumes them is this spec's contract. A "missing
   v17 visual feature" lands in this spec only when the resolution is a
   ThreadCard consumption choice; if the resolution requires a new DS
   primitive, it escalates to `specs/cyan-ds/` instead.
