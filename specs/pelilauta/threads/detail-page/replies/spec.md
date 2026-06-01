---
feature: Thread Replies
status: draft
maturity: design
last_major_review: 2026-06-01
parent_spec: ../spec.md
---

# Feature: Thread Replies

## Blueprint

### Context

**Route:** `/threads/[threadKey]` (the reply region below the article)

A reader sees every reply to the thread in order, oldest first. Anonymous viewers and search-engine crawlers receive the complete list as static SSR HTML with no JavaScript required. Authenticated viewers receive the same SSR seed and then see new replies and edits appear without a page reload. Visitors can deep-link to a specific reply with `#reply-{key}` or auto-scroll to "everything since time X" with `?since={flowTime}`.

Reply *authoring* — composing, editing, deleting — lives in [`./authoring/spec.md`](./authoring/spec.md). This spec is the read surface only.

### Architecture

- `packages/threads/src/api/getReplies.ts` — SSR accessor. Reads `stream/{threadKey}/comments`, parses each doc through `ReplySchema`, returns the array.
- `packages/threads/src/client/subscribeReplies.ts` — CSR realtime listener. Wraps Firestore `onSnapshot`, emits `{ added, modified, removed }` diffs.
- `packages/threads/src/components/ReplyArticle.svelte` — one reply. Pure render given `{ reply, bodyHtml, profile, fromUser }`.
- `packages/threads/src/components/ThreadReplies.svelte` — the list. Renders the SSR seed, then mounts the realtime listener once the viewer is authenticated, and runs scroll-to-target when `targetFlowTime` is set.
- `app/pelilauta/src/pages/threads/[threadKey]/index.astro` — host. Calls `getReplies`, resolves profiles and pre-renders markdown for each reply, parses `?since=`, passes everything as props.

### Dependencies

- `@pelilauta/cyan` — `CnBubble` (with `reply` variant), `CnLightbox`.
- `@pelilauta/profiles` — `ProfileLink`, `AvatarLink`, `getProfile`.
- `@pelilauta/utils` — `markdownToHTML`, `log`.
- `@pelilauta/auth/client` — `uid`, `sessionState` atoms.
- `@pelilauta/firebase/{server,client}` — Firestore SDKs.
- `ReplySchema` — defined in [`../../spec.md`](../../spec.md). One schema, both parse paths.

### Constraints

- Anonymous SSR responses are listener-free and uid-independent — shareable across HTTP caches.
- All async work (Firestore reads, profile resolution, markdown rendering) happens in the host's Astro frontmatter. Components are pure renderers.
- The realtime listener mounts only when `uid != null && sessionState === "active"`. Sign-out and account-switch transitions tear it down cleanly.

## Contract

### Definition of Done

- [ ] Anonymous SSR of `/threads/{key}` contains every reply's body HTML in the response. No JavaScript bundle is loaded on behalf of the reply list.
- [ ] Authenticated viewers see new replies appear, and edits reflect, without a page reload — within a few seconds of the source change.
- [ ] Visiting `/threads/{key}#reply-{replyKey}` scrolls the matching reply into view with JavaScript disabled.
- [ ] Visiting `/threads/{key}?since={flowTime}` scrolls to the first reply with `flowTime >= since`, once per page load. Missing or invalid values are no-ops.
- [ ] Replies authored by the current viewer render with the `CnBubble reply` variant; others render with the default variant. The variant updates client-side if the auth state resolves after SSR.
- [ ] `getReplies(threadKey)` returns replies in stable order (oldest first). Errors from Firestore or schema parsing propagate to the caller.
- [ ] `subscribeReplies(threadKey, onChange)` emits added/modified/removed diffs and survives a single malformed document without terminating.

### Regression Guardrails

- `ReplyArticle.svelte` and `ThreadReplies.svelte` do not import from `firebase/firestore` at module top level. The realtime SDK is reached only via the `subscribeReplies` accessor inside an effect.
- The reply collection path comes from constants in `ReplySchema.ts` / `ThreadSchema.ts`. Literal strings `"stream"` / `"comments"` do not appear elsewhere.
- `getReplies` and `subscribeReplies` share `ReplySchema` for parsing. A second schema or `parseReply()` wrapper is a regression.

### Testing Scenarios

#### Scenario: Anonymous viewer receives the full reply list in SSR

```gherkin
Given a thread with N replies
When an anonymous user GETs /threads/{key}
Then the response HTML contains N <article> elements
And each <article> carries id="{replyKey}"
And each <article> contains the reply's body as rendered HTML
And no JavaScript bundle is loaded on behalf of the reply list
And two independent anonymous requests yield byte-identical reply markup
```

#### Scenario: Authenticated viewer sees new replies appear without reload

```gherkin
Given an authenticated viewer is on /threads/{key}
And the SSR seed renders replies [A, B]
When a new reply C is written to Firestore
Then C appears in the rendered list within a few seconds
And A and B are not re-rendered in place

Given the same viewer is on the page
When reply B is edited
Then the updated body appears in the rendered list without a reload
And the edit does not displace the position of A or C

Given the viewer signs out
Then the realtime listener is torn down
And no further snapshots are applied
```

#### Scenario: Native #reply-{key} fragment jumps to a reply without JavaScript

```gherkin
Given the page URL is /threads/{key}#reply-{replyKey}
And the SSR response contains an <article id="{replyKey}">
When the browser loads the page with JavaScript disabled
Then the browser scrolls the matching <article> into view
And no component-level scroll logic runs
```

#### Scenario: ?since={flowTime} scrolls to the first matching reply

```gherkin
Given the page URL is /threads/{key}?since=200
And the rendered replies have flowTimes [100, 200, 300]
When the page hydrates
Then the article with flowTime=200 is scrolled into view (element.scrollIntoView)
And the scroll fires exactly once per page load

Given ?since=9999 (no reply matches)
When the page hydrates
Then no scroll is triggered by the component

Given ?since=not-a-number, or no ?since= parameter
When the page renders
Then no scroll is triggered and no error is surfaced
```

#### Scenario: Own replies render with the reply bubble variant

```gherkin
Given replies authored by ["u1", "u2", "u1"]
And the viewer's session uid is "u1"
When the page renders
Then the articles authored by "u1" use the CnBubble reply variant
And the article authored by "u2" uses the default variant

Given an anonymous SSR was served (no session uid baked in)
When the page hydrates and the auth atom resolves to uid="u1"
Then articles authored by "u1" upgrade to the reply variant client-side
And no other rendered state (body, profile, ordering) changes
```

#### Scenario: ReplyArticle is a pure render

```gherkin
Given a Reply, a resolved Profile, and pre-rendered bodyHtml
When ReplyArticle renders
Then no markdownToHTML, getProfile, or Firestore call occurs during render
And the article contains the rendered bodyHtml, the profile citation, and a CnLightbox for any attached images
```

#### Scenario: getReplies returns parsed replies in stable order

```gherkin
Given the stream/{threadKey}/comments sub-collection contains replies with various flowTimes and createdAts
When getReplies(threadKey) is called
Then the returned array is ordered by flowTime ascending, with createdAt as tie-break
And reply.createdAt is a JavaScript Date (never a Firestore Timestamp)
And reply.flowTime is a number (epoch ms)
And each reply.key equals the source doc id

Given threadKey is the empty string
When getReplies("") is called
Then an empty array is returned
And no Firestore read is issued
```

#### Scenario: getReplies surfaces errors to the caller

```gherkin
Given a Firestore network or permission failure on stream/{threadKey}/comments
When getReplies(threadKey) is called
Then the underlying error propagates to the caller
And no fallback array is substituted

Given a malformed reply doc that violates ReplySchema
When getReplies(threadKey) is called
Then the ZodError propagates to the caller
And no malformed reply is silently returned
```

#### Scenario: subscribeReplies emits diff updates and survives bad docs

```gherkin
Given subscribeReplies(threadKey, onChange) is active
When Firestore emits a snapshot with added=[C], modified=[B], removed=[]
Then onChange is called with { added: [C-as-Reply], modified: [B-as-Reply], removed: [] }

Given a subsequent snapshot includes a doc that violates ReplySchema
When the listener parses that snapshot
Then the malformed doc is omitted from the diff passed to onChange
And the parse error is logged via @pelilauta/utils/log with the doc id
And the listener remains active for subsequent snapshots
```

## Known Defects

> Defects observed in the landed implementation. Recorded for follow-up; promoting any of these into a Testing Scenario above is the path to forcing a fix.

### Date display leaks the SSR runtime's locale

`ReplyArticle` formats `reply.createdAt` with `toLocaleDateString()` and no explicit locale. During SSR the runtime's locale is whatever the Netlify function defaults to; for anonymous viewers the rendered string is then frozen into a cache-shareable response that crosses every viewer's locale boundary.

**Fix direction:** route the date through a deterministic helper, or emit an ISO `datetime` attribute on `<time>` and format on the client.

### Listener-pushed replies render with empty `bodyHtml` and `null` profile

The current implementation appends `{ reply, bodyHtml: "", profile: null }` for `added` diffs, so a reply that arrives via the realtime upgrade displays no body and an anonymous-fallback avatar/profile until the page reloads. Modified diffs preserve the seeded `bodyHtml`/`profile` (only `reply` is replaced); they're unaffected.

**Fix direction:** either (a) render markdown client-side via a Svelte-safe helper exposed from `@pelilauta/utils`, or (b) ship a CSR `prepareReplyEntry(reply)` helper from `@pelilauta/threads/client` that resolves the profile (via an authed API call) and renders the body before merging.
