---
feature: Thread Reply Authoring
status: alpha
maturity: implementation
last_major_review: 2026-05-29
parent_spec: ../spec.md
---

# Feature: Thread Reply Authoring

## Blueprint

### Context

The write half of thread replies: an authenticated, non-frozen user on a thread page composes a reply, submits it, and sees it appear in the list without a full page reload. Sibling to `../spec.md` (read-side SSR + realtime listener), which explicitly deferred reply authoring as out of scope. This spec picks it up now that the cyan reply-stack primitives — `CnChatBar`, `CnReplyContext`, `CnReplyAnchor` — have shipped. `CnRichComposer` exists in the design system but is deliberately NOT integrated here (see §Composer mode toggle deprecation note); the chat bar's built-in auto-expand covers the conversational reply use case, and the rich composer earns its complexity on longer-form authoring (thread bodies, blog posts) in future slices.

### Architecture

- **Components:**
  - `packages/threads/src/components/ReplyForm.svelte` — Svelte 5 island. Compose UI. Owns draft, submit lifecycle, and error surfacing. Writes optimistic entries to the shared `replyEntriesStore`.
  - `packages/threads/src/components/ThreadReplies.svelte` — Svelte 5 island. List renderer + realtime listener. Reads from `replyEntriesStore`; seeds it idempotently from `initialReplies` on mount.
  - `packages/threads/src/client/replyEntriesStore.ts` — nanostore factory keyed by `threadKey`. Exposes `getStore(threadKey)`, `seedEntries(threadKey, entries)` (no-op if already seeded), `appendEntry`, `replaceEntry`, `removeEntry`, `mergeListenerDiff`. Both islands import the same module and resolve to the same atom instance at runtime — Astro/Vite chunks the module once across islands.
  - `packages/threads/src/client/postReply.ts` — fetch wrapper that bundles the session ID token, posts to the endpoint, parses the response through `ReplySchema`, and returns the materialised `Reply`. Errors propagate.
  - `app/pelilauta/src/pages/api/threads/[threadKey]/replies.ts` — Astro API route. POST handler. Lives next to the existing thread-write endpoint scaffold at `app/pelilauta/src/pages/api/threads.ts`.
  - **Host wiring** in `app/pelilauta/src/pages/threads/[threadKey]/index.astro` — two distinct islands at different DOM locations:
    - `<ThreadReplies>` mounts **inside** the page's `<section class="cn-content-prose">` (anonymous: no `client:` directive; authenticated: `client:idle`).
    - `<ReplyForm>` mounts **as a sibling after** `</section>`, outside both content containers, for authenticated viewers only (`client:idle`). Anonymous viewers see a static login CTA `<a>` inside the prose section instead.
    - The form's `CnReplyAnchor` (sticky/fixed dock) must not be a descendant of `cn-content-prose`, or the 67ch width constraint and stacking context confine the chat bar to the prose column rather than the app shell.

- **Data Models:**
  - Writes to `stream/{threadKey}/comments/{auto-id}`. Document shape conforms to `ReplySchema` from `@pelilauta/threads` (`packages/threads/src/schemas/ReplySchema.ts`). No new fields. No renames.
  - `Reply` (the read-side type) is the contract surface: clients submit a request body, the server materialises a `Reply` and returns it parsed.

- **API Contracts:**
  - **Route:** `POST /api/threads/{threadKey}/replies`
  - **Auth:** `Authorization: Bearer <Firebase ID token>` header. Sessions without a valid token receive `401 Unauthorized`. Frozen accounts (`account/{uid}.frozen === true`) receive `403 Forbidden` per `specs/pelilauta/session/frozen.md` §Frozen users are blocked by server-side thread-write endpoints.
  - **Request body (JSON):**
    ```ts
    {
      markdownContent: string;          // required, 1..N chars after trim
      images?: Array<{ url: string; alt: string }>;  // optional; legacy string form is rejected — clients send the structured form
      quoteref?: string;                // optional; targets another reply's key
    }
    ```
  - **Response 201 (JSON):** the freshly written, schema-parsed `Reply` document including server-assigned `key`, `createdAt`, `updatedAt`, `flowTime`, `owners`, `author`, and `threadKey`. Same shape that `getReplies` returns. Timestamps are serialised as ISO strings on the wire; the client wraps the JSON in `ReplySchema.parse` so consumers receive `Date` instances and a numeric `flowTime`.
  - **Server-assigned fields:** `owners = [uid]`, `author = uid`, `createdAt = updatedAt = serverTimestamp()`, `flowTime = Date.now()`, `key = doc.id`, `threadKey` (from the route param). Client-provided values for these fields are ignored.
  - **Error responses:**
    - `400 Bad Request` — request body fails schema validation (empty `markdownContent`, malformed `images`, etc.). Response body is `{ error: string }` with a short human-readable reason.
    - `401 Unauthorized` — missing or invalid bearer token. Body is the string `"Unauthorized"` (matches the existing `/api/threads` scaffold's response shape).
    - `403 Forbidden` — frozen account. Body is the string `"Forbidden"`.
    - `404 Not Found` — `stream/{threadKey}` does not exist. Body is `{ error: "Thread not found" }`.
    - `500 Internal Server Error` — unexpected Firestore failure. Response body is `{ error: string }`.

- **Dependencies:**
  - `@pelilauta/cyan` — `CnReplyAnchor`, `CnReplyContext` (when a target reply is being quoted).
  - `@pelilauta/cyan` — `CnChatBar` for inline compose. (Note: `@pelilauta/cyan-editor`'s `CnRichComposer` was originally listed here for an expanded markdown editor; that integration is deprecated — see §Composer mode toggle.)
  - `@pelilauta/auth/client` — session atoms (`uid`, `sessionState`, `frozen`) for the gate.
  - `@pelilauta/auth/server` — `getAccount(uid)` for the frozen check (same accessor already used by the `/api/threads` scaffold).
  - `@pelilauta/firebase/server` — `verifyIdToken`, admin Firestore writes.
  - `@pelilauta/threads/server` — `ReplySchema` for parsing the freshly written doc before returning it.
  - `@pelilauta/threads/client` — `subscribeReplies` already handles deduplication via Firestore `docChanges()`; the optimistic-append flow relies on this without further coupling.
  - i18n: keys `threads:replies.compose.placeholder`, `threads:replies.compose.submit`, `threads:replies.compose.error`, `threads:replies.compose.loginCta`, `threads:replies.compose.frozenNotice`. (`threads:replies.compose.expand` is deprecated alongside the dropped composer mode toggle.) The host resolves these keys at SSR and passes the resulting strings as island props (`placeholderText`, `frozenNoticeText`, `errorText`) — translator functions cannot cross the Astro SSR→CSR island boundary and arrive as `null` after hydration.

- **Constraints:**
  - **Server-side authority on identity and timing.** `owners`, `author`, `createdAt`, `updatedAt`, `flowTime`, `threadKey`, and `key` are computed server-side from the verified session uid + server time + route param. The request body's `markdownContent` / `images` / `quoteref` are the only client-trusted fields; everything else is ignored if present.
  - **Schema parity across writes and reads.** The server parses the freshly written document through the same `ReplySchema` (`packages/threads/src/schemas/ReplySchema.ts`) that `getReplies` uses, so the wire shape matches the read-side contract exactly. Two parse paths means two truth sources — the schema is the single one.
  - **Anonymous viewers receive no compose UI.** Per `feedback_anonymous_is_ssr_only`, the form island is not rendered for anonymous SSR. The host renders an `<a href="/login?next=/threads/{threadKey}">` CTA element in place of the form. No disabled-textarea pattern.
  - **Frozen users receive no compose UI.** When the client session has `frozen: true`, `ReplyForm` renders a static notice (`threads:replies.compose.frozenNotice`) in place of the input. The notice is informational — no input element, no submit button. The server-side `403` is the authoritative gate; this is progressive enhancement to avoid futile submits.
  - **Optimistic-append owned by the form, dedup owned by the listener, list owned by the store.** `ReplyForm` writes a provisional entry (`key: "tmp-{uuid}"`) into `replyEntriesStore` the moment the user submits. On `201` it calls `replaceEntry(tmpKey, serverReply)`. On error it calls `removeEntry(tmpKey)`, surfaces the inline error (`threads:replies.compose.error`), and re-enables the form with the user's content intact. `ThreadReplies` reads the same store; its listener writes server diffs through `mergeListenerDiff`, which dedupes by `reply.key` so the listener's `added` diff for the just-posted reply is a no-op (it's already in the store from the optimistic replace).
  - **Stores are per-thread and module-scoped.** `replyEntriesStore.getStore(threadKey)` returns the same atom across all callers within a page lifetime. Cross-page navigation does not need teardown — Astro full-page navigation re-evaluates the module. The store survives auth state changes within a page; the listener subscribes/unsubscribes around it.
  - **Form is not a descendant of either content container.** Per [`../../spec.md`](../../spec.md), the chat-bar input docks to the app shell. Host wiring renders `<ReplyForm>` as a sibling after `<section class="cn-content-prose">`, never inside it. Nesting the form under `cn-content-prose` confines `CnReplyAnchor` (sticky/fixed) to the 67ch prose column and breaks v18 dock behaviour.
  - **Composer mode toggle.** `[DEPRECATED 2026-05-31]` Original intent: an inline `<CnChatBar>` plus an Expand affordance that opens `<CnRichComposer>` for power-user markdown editing. Dropped because (a) `CnChatBar` already auto-expands up to ~4 lines on desktop / 40vh on mobile, which covers conversational replies; (b) the rich composer's CodeMirror-backed Bold-button selection contract was brittle to verify end-to-end and didn't earn its complexity for reply traffic; (c) markdown rendering at display time means power users can still type `**bold**` manually. The rich composer remains in the DS for future thread-body / blog-post authoring slices where the depth is justified. Current implementation: `<CnChatBar>` inside `<CnReplyAnchor>`, no expand affordance.
  - **No realtime mount on anonymous viewers.** This spec does not change the read-side rule: `subscribeReplies` only mounts for `sessionState === "active"`. Reply authoring is gated on the same condition.
  - **No edit / no delete.** This spec covers create only. Edit and delete are separate slices (the v17 `confirmDelete.astro` + `edit.astro` ports). Reposting is not a workaround — the spec does not provide one.
  - **Image attachments are not in this slice.** `markdownContent` is the only authoring payload. `images` exists in the request schema for forward compatibility but the v1 client never populates it. Implementations may reject non-empty `images` arrays with a 400 to keep the surface tight.
  - **Quote refs are passthrough.** `quoteref` is accepted and stored verbatim. The read-side already handles the display; no new rendering logic ships with this slice.
  - **Astro API route, not a Cloud Function.** Lives in `app/pelilauta/src/pages/api/threads/[threadKey]/replies.ts`, deployed as a Netlify function via the existing Astro adapter (`feedback_no_firebase_functions`). Uses `firebase-admin` directly via `@pelilauta/firebase/server`.

## Contract

### Definition of Done

#### API Route DoD

- [x] `app/pelilauta/src/pages/api/threads/[threadKey]/replies.ts` exports a `POST` handler.
- [x] The handler returns `401 Unauthorized` when no `Authorization: Bearer` header is present or the token fails `verifyIdToken`.
- [x] The handler returns `403 Forbidden` when the resolved uid's `account/{uid}.frozen === true`.
- [x] The handler returns `400 Bad Request` with a `{ error }` body when the request body fails the in-route Zod request schema (empty/missing `markdownContent`, malformed `images`, etc.).
- [x] The handler returns `404 Not Found` with `{ error: "Thread not found" }` when `stream/{threadKey}` does not exist.
- [x] On success the handler writes `stream/{threadKey}/comments/{auto-id}` with `owners=[uid]`, `author=uid`, `createdAt`/`updatedAt = serverTimestamp()`, `flowTime = Date.now()`, plus the validated `markdownContent`, optional `images`, optional `quoteref`.
- [x] On success the handler reads the just-written doc back, parses it through `ReplySchema`, and returns it as JSON with status `201`.
- [x] The handler does not trust client-provided values for `owners`, `author`, `createdAt`, `updatedAt`, `flowTime`, `key`, or `threadKey`.

#### Client Post DoD

- [x] `packages/threads/src/client/postReply.ts` exports `postReply(threadKey, { markdownContent, images?, quoteref? }, idToken)` returning `Promise<Reply>`.
- [x] `postReply` sends `Authorization: Bearer ${idToken}` and `Content-Type: application/json`.
- [x] `postReply` parses the response body through `ReplySchema` before returning. Non-2xx responses throw with the parsed error message.
- [x] `postReply` is exported from `@pelilauta/threads/client` and is the only entry the form island uses to write.

#### Form Island DoD

- [x] `packages/threads/src/components/ReplyForm.svelte` is a Svelte 5 island.
- [x] The form mounts only when `uid != null && sessionState === "active"`. It is gated by an auth-atom subscription and never appears for anonymous viewers.
- [x] When the resolved session has `frozen === true`, the form renders only the `threads:replies.compose.frozenNotice` text (no input, no submit).
- [ ] Inline mode mounts `<CnChatBar>` inside a `<CnReplyAnchor>`. Submit fires `postReply` and writes the result to `replyEntriesStore` for the thread's `threadKey`.
- [ ] Submitting writes a provisional entry (`key: "tmp-{uuid}"`) via `appendEntry`. On `201` the form calls `replaceEntry(tmpKey, serverReply)`. On error the form calls `removeEntry(tmpKey)` and renders the inline label `threads:replies.compose.error`.
- [DEPRECATED 2026-05-31] An "Expand" affordance opens `<CnRichComposer open bind:value>` carrying the current draft. — Rich composer integration dropped; see §Composer mode toggle.
- [x] Submit is disabled when the trimmed draft is empty or when a post is in flight.

#### Host Page DoD

- [ ] The host mounts `<ThreadReplies>` inside `<section class="cn-content-prose">` and `<ReplyForm>` as a sibling **after** that section. The form is never a descendant of either content container.
- [ ] `<ReplyForm>` mounts only when the host's auth boundary resolves an authenticated session. Anonymous renders ship no `ReplyForm` JS bundle; the prose section instead carries an `<a href="/login?next=/threads/{threadKey}">` button.
- [ ] Both islands receive `threadKey` and `initialReplies`; whichever hydrates first seeds the shared `replyEntriesStore` for that `threadKey`. Subsequent seeds are no-ops.

#### i18n DoD

- [x] The keys `threads:replies.compose.placeholder`, `threads:replies.compose.submit`, `threads:replies.compose.error`, `threads:replies.compose.loginCta`, `threads:replies.compose.frozenNotice` exist in the project's locale files. (`compose.expand` was dropped alongside the rich-composer integration.)
- [ ] `ReplyForm` accepts pre-resolved `placeholderText`, `frozenNoticeText`, `errorText` as string props. It does NOT accept a translator-function prop, since functions cannot cross the Astro SSR→CSR island boundary.

### Regression Guardrails

- The server endpoint MUST NOT trust client-provided `owners`, `author`, `createdAt`, `updatedAt`, `flowTime`, `key`, or `threadKey`. These are derived server-side from the verified session uid, the route param, and server time.
- The server MUST verify the bearer token via `@pelilauta/firebase/server`'s `verifyIdToken` and MUST re-read `account/{uid}.frozen` from Firestore on every request. Client-supplied frozen state is informational only.
- `ReplyForm.svelte` MUST NOT post directly with `fetch`; all write traffic flows through `postReply` from `@pelilauta/threads/client`. This keeps the schema-parse-on-response invariant in one place.
- Anonymous SSR responses for `/threads/{threadKey}` MUST NOT include `ReplyForm`'s JavaScript bundle. The host gates by `Astro.locals.uid` (or equivalent) at frontmatter time and renders either the form's `client:` island or a plain `<a>` — never both.
- The form island MUST NOT render inside `<section class="cn-content-prose">` or any other `cn-content-*` container. The host places it as a sibling after the prose section so `CnReplyAnchor` sticks/fixes against the app shell, not the prose column.
- Provisional optimistic entries MUST carry a `tmp-` key prefix. The realtime listener's `docChanges()` reconciliation MUST never observe a `tmp-` key in the Firestore snapshot — that prefix is a client-only convention to keep dedup unambiguous.
- The write endpoint path is `stream/{threadKey}/comments`. The constants `THREADS_COLLECTION_NAME = "stream"` and `REPLIES_COLLECTION = "comments"` (from `ReplySchema.ts` / `ThreadSchema.ts`) are the only literal sources, matching the read side.

### Testing Scenarios

#### Scenario: POST /api/threads/{threadKey}/replies requires a bearer token

```gherkin
Given a POST to /api/threads/abc/replies with no Authorization header
When the handler runs
Then the response status is 401
And the body is "Unauthorized"
And verifyIdToken was not called
```

#### Scenario: Invalid bearer token is rejected

```gherkin
Given a POST with Authorization: Bearer bad-token
And verifyIdToken rejects the token
When the handler runs
Then the response status is 401
And the body is "Unauthorized"
And no Firestore write is performed
```

#### Scenario: Frozen accounts are blocked at the write endpoint

```gherkin
Given a POST with a valid bearer token resolving uid="frozen-uid"
And getAccount("frozen-uid") returns { frozen: true }
When the handler runs
Then the response status is 403
And the body is "Forbidden"
And no Firestore write is performed
```

#### Scenario: Empty markdownContent is rejected

```gherkin
Given a POST with a valid bearer token and body { markdownContent: "" }
When the handler runs
Then the response status is 400
And the response body contains an error message naming markdownContent
And no Firestore write is performed
```

#### Scenario: Whitespace-only markdownContent is rejected

```gherkin
Given a POST with a valid bearer token and body { markdownContent: "   \n  " }
When the handler runs
Then the response status is 400
And no Firestore write is performed
```

#### Scenario: Missing thread returns 404

```gherkin
Given a POST to /api/threads/does-not-exist/replies with a valid bearer token and body { markdownContent: "Hello" }
And stream/does-not-exist does not exist in Firestore
When the handler runs
Then the response status is 404
And the response body is { error: "Thread not found" }
And no document is written under stream/does-not-exist/comments
```

#### Scenario: Successful write returns the parsed Reply

```gherkin
Given a POST to /api/threads/abc/replies with a valid bearer token resolving uid="u1"
And getAccount("u1") returns { frozen: false }
And stream/abc exists
And the body is { markdownContent: "Hello world" }
When the handler runs
Then a document is written under stream/abc/comments with markdownContent="Hello world", owners=["u1"], author="u1", threadKey="abc"
And createdAt and updatedAt are server timestamps
And flowTime is a number (epoch ms)
And the response status is 201
And the response body parses cleanly through ReplySchema
And the parsed Reply.key equals the written doc id
```

#### Scenario: Client-provided owners and timestamps are ignored

```gherkin
Given a POST with a valid bearer token resolving uid="u1"
And the request body includes owners=["attacker"], author="attacker", createdAt="1970-01-01T00:00:00Z", flowTime=0, key="forged"
When the handler runs
Then the written document has owners=["u1"], author="u1"
And createdAt/updatedAt are server timestamps (not 1970)
And flowTime equals the server-side Date.now() value, not 0
And the doc id is auto-generated by Firestore, not "forged"
```

#### Scenario: postReply parses the response through ReplySchema

```gherkin
Given postReply(threadKey, { markdownContent: "hi" }, idToken) is called
And the server returns 201 with a valid Reply JSON body
When the promise resolves
Then the resolved value's createdAt is a Date instance
And the resolved value's flowTime is a number
And the resolved value's key matches the response body's key
```

#### Scenario: postReply rejects non-2xx responses

```gherkin
Given postReply is called and the server returns 403 with body "Forbidden"
When the promise settles
Then the promise rejects with an Error whose message includes "Forbidden"
And the rejection is observable by the caller
```

#### Scenario: Anonymous viewers see a login CTA in place of the form

```gherkin
Given an anonymous viewer requests /threads/abc
When the host page renders
Then the reply-form slot contains <a href="/login?next=/threads/abc"> with the threads:replies.compose.loginCta text
And no ReplyForm Svelte island appears in the SSR output
And no ReplyForm script bundle is shipped
```

#### Scenario: Frozen viewers see a notice in place of the form

```gherkin
Given a session with uid="u1" and frozen=true
When the host page hydrates and ReplyForm mounts
Then the rendered form contains the threads:replies.compose.frozenNotice text
And there is no <textarea> in the rendered form
And there is no submit button in the rendered form
```

#### Scenario: Submit appends a provisional entry then reconciles to the server reply

```gherkin
Given ReplyForm is mounted under an active session for uid="u1"
And the user types "Hello world" into the chat bar
When the user presses Enter
Then appendEntry(threadKey, { key: "tmp-<uuid>", markdownContent: "Hello world", owners: ["u1"] }) writes the provisional into the shared store
And the form's submit-in-flight state becomes true
When postReply resolves with a server Reply whose key="server-id"
Then replaceEntry(threadKey, "tmp-<uuid>", { key: "server-id", ... }) reconciles the store entry
And the draft is cleared
And the submit-in-flight state becomes false
```

#### Scenario: Submit failure removes the provisional and surfaces the error

```gherkin
Given ReplyForm is mounted and the user submits "Hello"
And postReply rejects with Error("403: Forbidden")
When the rejection settles
Then removeEntry(threadKey, "tmp-<uuid>") drops the provisional from the store
And the inline error label (threads:replies.compose.error) is visible
And the draft "Hello" remains in the chat bar
And the submit-in-flight state is false
```

#### Scenario: Expanded composer shares the draft with inline mode

`[DEPRECATED 2026-05-31]` Scenario removed alongside the rich-composer integration — see §Composer mode toggle. The rich composer remains in the DS for future longer-form authoring slices (thread bodies, blog posts) and will get its own scenarios there.

#### Scenario: Cancelling the expanded composer returns to inline mode with the draft intact

`[DEPRECATED 2026-05-31]` Scenario removed alongside the rich-composer integration — see §Composer mode toggle.

#### Scenario: Submit is disabled for empty drafts

```gherkin
Given ReplyForm is mounted with an empty draft
When the user presses Enter on the chat bar
Then no postReply call is made
And no provisional entry is appended

Given the draft is "   " (whitespace only)
When the user presses Enter
Then no postReply call is made
```
