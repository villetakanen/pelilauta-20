---
feature: Thread Replies (read-only SSR + progressive CSR)
status: draft
maturity: design
last_major_review: 2026-05-06
parent_spec: ../spec.md
---

# Feature: Thread Replies (read-only SSR + progressive CSR)

## Blueprint

### Context

The reply list on a thread detail page is the platform's busiest read surface. Anonymous viewers — including search engine crawlers — must receive a complete, byte-identical reply list as part of the SSR response with no JavaScript dependency. Authenticated viewers receive the same SSR seed, then upgrade to a real-time `onSnapshot` listener so new replies and edits appear without a page reload.

This spec covers the **read** surface only:

- the `getReplies(threadKey)` SSR accessor,
- the `subscribeReplies(threadKey, onChange)` CSR realtime listener,
- `ReplyArticle.svelte` (one reply, SSR-pure render),
- `ThreadReplies.svelte` (SSR seed list + CSR auth-gated upgrade + scroll-to-target),
- the host wiring in `app/pelilauta/src/pages/threads/[threadKey]/index.astro`.

Reply authoring (`EditReplyDialog`, `ReplyDialog`, `ReplyDeleteSection`, login CTA placement) is **out of scope** and tracked under the parent threads spec stage 3 DoD.

### Architecture

- **Components:**
  - `packages/threads/src/components/ReplyArticle.svelte` — single reply render. Composes `cn-bubble`, `cn-lightbox`, `ProfileLink`, and `AvatarLink` (from `@pelilauta/profiles/components`). Pure render; no async work, no Firestore reads, no markdown rendering inside the template.
  - `packages/threads/src/components/ThreadReplies.svelte` — SSR-renders the seed reply list, then on CSR mounts the realtime listener (when the auth gate opens) and runs scroll-to-target (when `targetFlowTime` is set).
  - Upstream porting reference (migration only — delete after implementation lands): `.tmp/pelilauta-17/src/components/svelte/discussion/{DiscussionSection,ReplyArticle}.svelte`.

- **Data Models:**
  - `Reply` from `packages/threads/src/schemas/ReplySchema.ts` (parent spec). The schema's `z.preprocess` step is the only Firestore-to-TS conversion boundary: it converts Firestore `Timestamp` values to JavaScript `Date` objects (via `@pelilauta/models#toDate`) for `createdAt` / `updatedAt`, materializes `flowTime` as a `number` (epoch ms), normalizes legacy string `images` to `[{ url, alt }]`, and forces `author` to `owners[0]`. SSR and CSR parse paths share this single schema.
  - `Profile` from `@pelilauta/profiles/server` — resolved upstream and passed in as a prop.

- **API Contracts:**
  - `getReplies(threadKey: string): Promise<Reply[]>` — exported from `@pelilauta/threads/server`. Reads `stream/{threadKey}/comments`, parses each doc through `ReplySchema.parse({ ...doc.data(), key: doc.id, threadKey })`, and returns the array sorted ascending by `flowTime` with `createdAt` as tie-breaker. Empty `threadKey` returns `[]` without a Firestore read. Errors propagate.
  - `subscribeReplies(threadKey, onChange): () => void` — exported from `@pelilauta/threads/client`. Wraps Firestore `onSnapshot` over the same sub-collection ordered by `createdAt asc`. Each callback receives a diff: `{ added: Reply[], modified: Reply[], removed: string[] }` derived from `querySnapshot.docChanges()`. Returns the unsubscribe handle.
  - `ThreadReplies` props (draft): `{ threadKey: string; initialReplies: Array<{ reply: Reply; bodyHtml: string; profile: Profile | null }>; currentUid?: string | null; targetFlowTime?: number; emptyLabel?: string; errorLabel?: string }`. Profiles and `bodyHtml` are resolved by the host's Astro frontmatter. `currentUid` is the host's SSR view of the session uid (read from auth middleware / locals); it seeds `fromUser` resolution so authenticated SSR responses already carry the own-vs-other variant. After hydration, the auth atoms (`uid`, `sessionState` from `@pelilauta/auth/client`) take over and `fromUser` recomputes reactively.
  - `ReplyArticle` props (draft): `{ reply: Reply; bodyHtml: string; profile: Profile | null; fromUser: boolean }`. `fromUser` is computed by `ThreadReplies` (from `currentUid` on SSR, from the auth atom on CSR) and passed in so the article remains a pure render.
  - Page route: `app/pelilauta/src/pages/threads/[threadKey]/index.astro` calls `getReplies`, then `Promise.all(replies.map(r => getProfile(r.owners[0])))`, then `markdownToHTML(reply.markdownContent ?? "")` for each reply, reads the SSR session uid from the host's auth boundary, and passes the `initialReplies` tuple plus `currentUid` to `<ThreadReplies>`. Optional `?since={flowTime}` query param is parsed into `targetFlowTime`.

- **Dependencies:**
  - `@pelilauta/cyan` — `CnBubble` (variant `reply` for own replies), `CnLightbox` (one per reply with images), `CnIcon` (consumed transitively).
  - `@pelilauta/profiles/components` — `ProfileLink` (nick/text citation), `AvatarLink` (avatar citation; companion component landing in milestone 4 of the epic).
  - `@pelilauta/profiles/server` — `getProfile(uid)` for upstream profile resolution.
  - `@pelilauta/utils` — `markdownToHTML` for upstream body pre-rendering.
  - `@pelilauta/auth/client` — `uid`, `sessionState` nanostore atoms for the listener auth gate.
  - `@pelilauta/firebase/client` — `onSnapshot`, `query`, `collection`, `orderBy` for the realtime listener.
  - `@pelilauta/firebase/server` — admin SDK for `getReplies` SSR reads.

- **Constraints:**
  - SSR renders the reply list synchronously from `initialReplies`. Each `<article>` carries `id={reply.key}` so native `#reply-{key}` URL fragments resolve as browser scroll-to-anchor with zero JavaScript.
  - Markdown is rendered to HTML **upstream** in Astro frontmatter. `ReplyArticle` consumes `bodyHtml` via `{@html bodyHtml}`. `markdownToHTML(...)` does not appear inside any `.svelte` template (`ARCHITECTURE.md` §SSR Data Flow).
  - Profiles are resolved **upstream** by the host. Neither `ReplyArticle` nor `ThreadReplies` calls `getProfile` directly.
  - The realtime listener mounts only when `uid != null && sessionState === "active"`. Anonymous and loading sessions remain on the SSR seed; no `onSnapshot` reads are issued for anonymous viewers.
  - The listener subscription is owned by a Svelte `$effect` keyed on `[uid, sessionState]`. Account switches and logout/login transitions tear down and restart cleanly.
  - `subscribeReplies` reconciles via `querySnapshot.docChanges()` (added/modified/removed) against the SSR seed. First snapshot does not visually flicker because reconciliation is diff-based, not replace-all.
  - Per-doc parse failures inside the snapshot listener drop the malformed reply and call `@pelilauta/utils/log` with the doc id and parse error. The listener never throws or terminates.
  - `getReplies` propagates Firestore network/permission errors and Zod parse errors to the caller. Empty `threadKey` returns `[]` without a Firestore read.
  - The SSR seed and the snapshot listener share one Zod schema (`ReplySchema`). Two parse paths mean two truth sources, so they are explicitly the same schema.
  - Firestore-to-TS conversion happens at parse time. Entry-level fields (`createdAt`/`updatedAt` → `Date`, `flowTime` → `number` epoch ms) are coerced by `withEntryNormalization` from `@pelilauta/models` (see `specs/pelilauta/models/spec.md`). Reply-specific normalization (legacy string `images` → `[{ url, alt }]`, `author` ← `owners[0]`) runs inside `ReplySchema`'s subclass normalizer. This matches what v17's `toClientEntry` / `fixImageData` wrappers did at the call site, lifted into the schema layer. From the consumer's perspective the contract is what matters: reading `reply.createdAt` / `reply.updatedAt` returns `Date` objects, reading `reply.flowTime` returns a `number` (epoch ms), and consumers never see a Firestore `Timestamp`.
  - The scroll-to-target action runs once per mount, guarded by a `$state` flag, so subsequent snapshots do not re-trigger it. Native `#reply-{key}` fragment scrolling is never overridden by the component — that path stays browser-default.
  - When `targetFlowTime` is set and at least one reply has `reply.flowTime >= targetFlowTime`, the component scrolls (via `element.scrollIntoView`, not `window.scrollTo`) to the **first** matching reply after `tick()`. When no reply matches, no forced scroll is performed.
  - `ReplyArticle` renders `<article id={reply.key} aria-labelledby="reply-author-{reply.key}">` and uses semantic `<header>` (byline + actions slot) / `<footer>` (timestamp) inside `cn-bubble`. The `fromUser` prop drives only the `cn-bubble reply` variant; markup remains identical for the two variants.
  - Image attachments render through one `<CnLightbox>` per reply, mapped from `reply.images?.map(({ url, alt }) => ({ src: url, caption: alt }))`. `CnLightbox` owns gallery semantics; the article does not inline a custom grid.
  - SSR is allowed to vary by session: when the host passes `currentUid`, `fromUser` resolves server-side and the SSR HTML already shows the own-vs-other bubble variant. Anonymous viewers (`currentUid` absent or `null`) get a uid-independent response — no per-viewer state, suitable for shared HTTP caching. The cache key is "authenticated-or-not" (and uid when authenticated), not a single byte-stable response across all viewers.

## Contract

### Definition of Done

#### Server Read DoD

- [ ] `getReplies(threadKey)` ships from `packages/threads/src/api/getReplies.ts` and is exported from `@pelilauta/threads/server`.
- [ ] `getReplies` returns `[]` for an empty `threadKey` without issuing a Firestore read.
- [ ] `getReplies` reads `stream/{threadKey}/comments`, parses each doc through `ReplySchema.parse({ ...doc.data(), key: doc.id, threadKey })`, and returns the array sorted ascending by `flowTime` (tie-break `createdAt` ascending).
- [ ] `getReplies` propagates Firestore and Zod parse errors to the caller. No fallback array is substituted.

#### Component DoD

- [ ] `ReplyArticle.svelte` renders synchronously given `{ reply, bodyHtml, profile, fromUser }`. No `await` blocks, no `onMount` Firestore work, no `markdownToHTML` calls.
- [ ] `ReplyArticle` composes `CnBubble` (with `reply` prop bound to `fromUser`), `CnLightbox` (when `reply.images?.length > 0`), `ProfileLink`, `AvatarLink`, and pre-rendered `{@html bodyHtml}`.
- [ ] `ThreadReplies.svelte` renders the SSR seed list synchronously and mounts the realtime listener via a `$effect` keyed on `[uid, sessionState]` only when `uid != null && sessionState === "active"`.
- [ ] `ThreadReplies` exposes `targetFlowTime?: number` and, when set, scrolls (via `element.scrollIntoView`) to the first reply with `flowTime >= targetFlowTime` after `tick()`. The scroll fires once per mount.
- [ ] Host page `app/pelilauta/src/pages/threads/[threadKey]/index.astro` calls `getReplies`, resolves `getProfile(reply.owners[0])` per reply via `Promise.all`, renders `markdownToHTML` per reply, and passes the `initialReplies` tuple to `<ThreadReplies>`.
- [ ] The host page parses `?since={flowTime}` and passes the parsed numeric value as `targetFlowTime` (or `undefined` when missing/invalid).
- [ ] Native `#reply-{replyKey}` fragment links resolve to the matching `<article id={replyKey}>` with no JavaScript.
- [ ] Anonymous responses ship no JavaScript bundle for the reply list. `ThreadReplies` is hydrated only behind an authenticated session (decided by the host's `client:` directive choice).
- [ ] Memory note `project_thread_detail_mvp_no_replies` is retired in the spec PR description; the deferral is lifted by this work.

#### Realtime DoD

- [ ] `subscribeReplies(threadKey, onChange)` ships from `packages/threads/src/client/subscribeReplies.ts` and is exported from `@pelilauta/threads/client`.
- [ ] `subscribeReplies` orders the snapshot query by `createdAt asc` and emits `docChanges()` diffs as `{ added: Reply[], modified: Reply[], removed: string[] }` to `onChange`.
- [ ] Per-doc parse failures inside the listener drop the malformed reply and log via `@pelilauta/utils/log` (with doc id + error). The listener never throws.
- [ ] The unsubscribe handle returned by `subscribeReplies` cleanly tears down the Firestore listener.

### Regression Guardrails

- The SSR response for an anonymous viewer of `/threads/{threadKey}` MUST contain every reply's body HTML in the initial document. Crawlers and JavaScript-disabled clients see the same content as the live page minus realtime updates.
- The Firestore `onSnapshot` listener MUST NOT mount during SSR or for anonymous viewers. Anonymous-page cache shareability depends on this.
- `ReplyArticle.svelte` and `ThreadReplies.svelte` MUST NOT import from `firebase/firestore` at module top level. The realtime listener is loaded via `@pelilauta/threads/client` (which the component imports) and exercised inside a `$effect`, not at module evaluation.
- `ReplyArticle.svelte` MUST NOT call `markdownToHTML(...)` inside its template or script — the prop is `bodyHtml` (already-rendered HTML).
- `ReplyArticle.svelte` MUST NOT call `getProfile(...)` — `profile` is passed in.
- The reply collection path is `stream/{threadKey}/comments`. The constants `THREADS_COLLECTION_NAME = "stream"` and `REPLIES_COLLECTION = "comments"` (exported from `ReplySchema.ts` / `ThreadSchema.ts`) MUST be the only literal sources.
- `getReplies` and `subscribeReplies` MUST share `ReplySchema` for parsing. Defining a second schema or a parallel `parseReply()` wrapper is a regression.
- The Firestore-to-TS conversion (Timestamp → Date, legacy image normalization) lives inside `ReplySchema`'s `z.preprocess`. Both accessors call `ReplySchema.parse({ ...doc.data(), key, threadKey })` directly — re-introducing a separate wrapper layer (v17 had `toClientEntry` / `fixImageData` for this) duplicates work the schema already does.
- Host pages own routing and HTTP shell. `packages/threads/` MUST NOT ship route handlers; it ships accessors, listeners, and components only.

### Testing Scenarios

#### Scenario: getReplies returns an empty array for an empty threadKey

```gherkin
Given threadKey is the empty string
When getReplies("") is called
Then [] is returned
And no Firestore read is issued
```

#### Scenario: getReplies returns parsed replies sorted by flowTime ascending

```gherkin
Given the stream/{threadKey}/comments sub-collection has 3 docs
And one doc has flowTime = 100, another flowTime = 200, the third flowTime = 300
When getReplies(threadKey) is called
Then 3 Reply objects are returned
And the array is ordered with flowTime ascending: [100, 200, 300]
And each Reply.threadKey equals threadKey
And each Reply.key equals the source doc.id
```

#### Scenario: getReplies returns Date-typed timestamps from Firestore Timestamps

```gherkin
Given a reply doc whose createdAt and updatedAt are Firestore Timestamp instances
And whose flowTime is a Firestore Timestamp instance
When getReplies(threadKey) is called
Then the returned Reply.createdAt is a JavaScript Date
And the returned Reply.updatedAt is a JavaScript Date
And the returned Reply.flowTime is a number (epoch milliseconds)
And no Firestore Timestamp instance appears anywhere in the returned Reply
```

#### Scenario: getReplies tie-breaks equal flowTimes by createdAt ascending

```gherkin
Given two reply docs share flowTime = 200
And the first has createdAt = 2026-01-01T00:00:00Z
And the second has createdAt = 2026-01-02T00:00:00Z
When getReplies(threadKey) is called
Then the reply with the earlier createdAt is returned first
```

#### Scenario: getReplies propagates Firestore errors

```gherkin
Given a Firestore network or permission failure on stream/{threadKey}/comments
When getReplies(threadKey) is called
Then the underlying error propagates to the caller
And no fallback array is substituted
```

#### Scenario: getReplies propagates Zod parse failures on a malformed doc

```gherkin
Given the comments sub-collection contains a doc that violates ReplySchema
When getReplies(threadKey) is called
Then the ZodError propagates to the caller
And no malformed reply is returned in the array
```

#### Scenario: subscribeReplies emits a docChanges diff on each snapshot

```gherkin
Given subscribeReplies(threadKey, onChange) has been called
And the SSR seed array contains replies [A, B]
When a Firestore snapshot fires with docChanges added=[C], modified=[B], removed=[]
Then onChange receives { added: [C-as-Reply], modified: [B-as-Reply], removed: [] }
And the snapshot listener has not thrown
```

#### Scenario: subscribeReplies drops and logs a per-doc parse failure

```gherkin
Given subscribeReplies(threadKey, onChange) has been called
When a Firestore snapshot includes a malformed doc whose ReplySchema.parse throws
Then the malformed doc is omitted from the diff passed to onChange
And @pelilauta/utils/log records the doc id and the parse error
And the listener remains active for subsequent snapshots
```

#### Scenario: ThreadReplies SSR-renders every initialReply with id={reply.key}

```gherkin
Given initialReplies contains 4 entries
When ThreadReplies renders on the server with no client-side script execution
Then the rendered HTML contains 4 <article> elements
And the n-th <article> carries id equal to initialReplies[n].reply.key
And the n-th <article> contains initialReplies[n].bodyHtml as inner HTML
```

#### Scenario: ReplyArticle composes its DS primitives without async work

```gherkin
Given a Reply with images=[{url:"https://x", alt:"y"}], a resolved Profile, and bodyHtml="<p>hi</p>"
When ReplyArticle renders synchronously
Then the rendered tree contains a CnBubble element
And a single CnLightbox element with one image mapped to {src:"https://x", caption:"y"}
And a ProfileLink element resolved against the supplied Profile
And the inner HTML includes "<p>hi</p>" inside the bubble body
And no markdownToHTML call occurs during render
And no getProfile call occurs during render
```

#### Scenario: ReplyArticle uses the reply variant of CnBubble when fromUser is true

```gherkin
Given fromUser = true is passed in
When ReplyArticle renders
Then the inner CnBubble element receives reply={true}
```

```gherkin
Given fromUser = false
When ReplyArticle renders
Then the inner CnBubble element receives reply={undefined} (the default variant)
```

#### Scenario: ThreadReplies mounts the realtime listener only when authenticated

```gherkin
Given uid = null and sessionState = "initial"
When ThreadReplies hydrates
Then subscribeReplies has NOT been called
And the SSR seed list remains visible

Given uid = "u1" and sessionState transitions to "active"
When the auth gate becomes true
Then subscribeReplies(threadKey, onChange) is called exactly once
And the unsubscribe handle is retained for cleanup

Given the auth gate later becomes false (sign-out, account switch)
When sessionState leaves "active"
Then the previously retained unsubscribe handle is invoked
And no further snapshots are applied
```

#### Scenario: ThreadReplies merges a docChanges diff into the rendered list

```gherkin
Given the SSR seed renders replies [A, B]
And the listener mounted under an active session
When the listener emits a diff with added=[C], modified=[B'], removed=[]
Then the rendered list shows [A, B', C] preserving the SSR ordering rule (flowTime asc)
And no full re-render of A occurs (B is updated in place, not replaced)
```

#### Scenario: ThreadReplies scrolls to the first reply at-or-after targetFlowTime

```gherkin
Given initialReplies has flowTimes [100, 200, 300]
And targetFlowTime = 150
When ThreadReplies hydrates after tick()
Then the article with flowTime = 200 is scrolled into view via element.scrollIntoView
And the scroll fires exactly once per mount
And subsequent snapshot updates do not re-trigger the scroll
```

#### Scenario: ThreadReplies does not scroll when no reply matches targetFlowTime

```gherkin
Given initialReplies has flowTimes [100, 200, 300]
And targetFlowTime = 9999
When ThreadReplies hydrates
Then no scroll action is performed by the component
```

#### Scenario: Native #reply-{key} fragment scrolls without component logic

```gherkin
Given the page URL is /threads/{threadKey}#reply-{replyKey}
And initialReplies includes a reply whose key matches replyKey
When the anonymous user opens the page with JavaScript disabled
Then the browser scrolls the matching <article id={replyKey}> into view
And no JavaScript is required for the scroll to occur
```

#### Scenario: Anonymous SSR response is uid-independent and listener-free

```gherkin
Given a fixed set of replies and resolved profiles for thread {threadKey}
And currentUid is null (anonymous session)
When two anonymous users issue independent GETs for /threads/{threadKey}
Then both responses contain the same SSR-rendered reply list
And neither response includes a fromUser marker on any reply
And neither response loads a Firestore onSnapshot handler
```

#### Scenario: Authenticated SSR resolves fromUser from currentUid

```gherkin
Given replies authored by uids ["u1", "u2", "u1"]
And currentUid = "u1" passed by the host
When ThreadReplies SSR-renders
Then the rendered article for replies authored by "u1" carries the cn-bubble reply variant
And the rendered article for the reply authored by "u2" carries the default cn-bubble variant
And the response is shareable across viewers with the same currentUid
```

#### Scenario: ThreadReplies recomputes fromUser when the auth atom resolves

```gherkin
Given the SSR seed was rendered with currentUid = null (e.g. SSR cache hit on the anonymous variant)
And the page hydrates and the auth atom resolves to uid = "u1"
When ThreadReplies reactively re-derives fromUser
Then articles authored by "u1" upgrade to the cn-bubble reply variant client-side
And no other state changes (the article's bodyHtml, profile, and ordering remain stable)
```

#### Scenario: Host page resolves profiles and bodyHtml upstream of ThreadReplies

```gherkin
Given a thread with N replies
When app/pelilauta/src/pages/threads/[threadKey]/index.astro frontmatter executes
Then getReplies(threadKey) is awaited once
And Promise.all(replies.map(r => getProfile(r.owners[0]))) is awaited
And markdownToHTML(reply.markdownContent ?? "") is awaited per reply
And the resulting tuple { reply, bodyHtml, profile } shape is passed to <ThreadReplies>
And no markdownToHTML or getProfile call appears inside any .svelte template
```

#### Scenario: Host page parses ?since= into targetFlowTime

```gherkin
Given the request URL includes ?since=200
When the host page renders
Then targetFlowTime=200 is passed to <ThreadReplies>

Given the request URL includes ?since=not-a-number
When the host page renders
Then targetFlowTime=undefined is passed to <ThreadReplies>
And no error is surfaced to the user

Given the request URL has no ?since param
When the host page renders
Then targetFlowTime=undefined is passed to <ThreadReplies>
```

## Known Defects

> Defects observed in the landed M5–M8 implementation. Recorded for follow-up; not part of the acceptance contract for the milestones already shipped. Each entry frames the implementation's silent choice against the spec's implicit intent — promoting any of these into Testing Scenarios is the path to forcing a fix.

### Date display leaks the SSR runtime's locale

`ReplyArticle` formats `reply.createdAt` with `toLocaleDateString()` and no explicit locale. During SSR the runtime's locale is whatever the Netlify function defaults to; for anonymous viewers the rendered string is then frozen into a cache-shareable response that crosses every viewer's locale boundary. This is at odds with §Anonymous SSR response is uid-independent and listener-free's cache-shareability promise — the response is still uid-independent, but it bakes the server's locale into a response shared across viewers with different locale preferences.

**Fix direction:** route the date through a deterministic helper (the existing `@pelilauta/utils` date helpers, or just emit the ISO `datetime` attribute and a `<time>`-only formatter on the client). Spec is silent on the surface format; clarifying it would also tighten this defect into a regression test.

### Listener-pushed replies render with empty `bodyHtml` and `null` profile

§ThreadReplies merges a docChanges diff into the rendered list assumes listener-merged replies are visually equivalent to SSR-seeded ones, but does not specify how `bodyHtml` and `profile` are populated post-mount. The current implementation appends `{ reply, bodyHtml: "", profile: null }` for `added` diffs, so a reply that arrives via the realtime upgrade displays no body and an anonymous-fallback avatar/profile until the page reloads. Modified diffs preserve the seeded `bodyHtml`/`profile` (only `reply` is replaced); they're unaffected.

**Fix direction:** either (a) render markdown client-side via a Svelte-safe helper exposed from `@pelilauta/utils`, or (b) ship a CSR `prepareReplyEntry(reply)` helper from `@pelilauta/threads/client` that resolves the profile (via an authed API call) and renders the body before merging into `entries`. Either path also wants a tightened scenario here that asserts the merged entry's body and profile match what an SSR seed would have produced.
