---
feature: Thread Reply Authoring
status: draft
maturity: design
last_major_review: 2026-05-29
parent_spec: ../spec.md
---

# Feature: Thread Reply Authoring

## Blueprint

### Context

The write half of thread replies: an authenticated, non-frozen user on a thread page composes a reply, submits it, and sees it appear in the list without a full page reload. Sibling to `../spec.md` (read-side SSR + realtime listener), which explicitly deferred reply authoring as out of scope. This spec picks it up now that the cyan reply-stack primitives — `CnChatBar`, `CnReplyContext`, `CnReplyAnchor`, `CnRichComposer` — have shipped.

### Architecture

- **Components:**
  - `packages/threads/src/components/ReplyForm.svelte` — Svelte 5 island. Compose UI on the thread page. Owns the local draft state, optimistic-append timing, error surfacing, and the inline ↔ expanded mode toggle.
  - `packages/threads/src/client/postReply.ts` — fetch wrapper that bundles the session ID token, posts to the endpoint, parses the response through `ReplySchema`, and returns the materialised `Reply`. Errors propagate.
  - `app/pelilauta/src/pages/api/threads/[threadKey]/replies.ts` — Astro API route. POST handler. Lives next to the existing thread-write endpoint scaffold at `app/pelilauta/src/pages/api/threads.ts`.
  - Host wiring in `app/pelilauta/src/pages/threads/[threadKey]/index.astro` — mounts `<ReplyForm>` inside a `<CnReplyAnchor>` for authenticated viewers; renders an anonymous login CTA for unauthenticated viewers.

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
  - `@pelilauta/cyan-editor` — `CnChatBar` for inline compose, `CnRichComposer` for the expanded markdown editor.
  - `@pelilauta/auth/client` — session atoms (`uid`, `sessionState`, `frozen`) for the gate.
  - `@pelilauta/auth/server` — `getAccount(uid)` for the frozen check (same accessor already used by the `/api/threads` scaffold).
  - `@pelilauta/firebase/server` — `verifyIdToken`, admin Firestore writes.
  - `@pelilauta/threads/server` — `ReplySchema` for parsing the freshly written doc before returning it.
  - `@pelilauta/threads/client` — `subscribeReplies` already handles deduplication via Firestore `docChanges()`; the optimistic-append flow relies on this without further coupling.
  - i18n: keys `threads:replies.compose.placeholder`, `threads:replies.compose.submit`, `threads:replies.compose.error`, `threads:replies.compose.loginCta`, `threads:replies.compose.expand`, `threads:replies.compose.frozenNotice`.

- **Constraints:**
  - **Server-side authority on identity and timing.** `owners`, `author`, `createdAt`, `updatedAt`, `flowTime`, `threadKey`, and `key` are computed server-side from the verified session uid + server time + route param. The request body's `markdownContent` / `images` / `quoteref` are the only client-trusted fields; everything else is ignored if present.
  - **Schema parity across writes and reads.** The server parses the freshly written document through the same `ReplySchema` (`packages/threads/src/schemas/ReplySchema.ts`) that `getReplies` uses, so the wire shape matches the read-side contract exactly. Two parse paths means two truth sources — the schema is the single one.
  - **Anonymous viewers receive no compose UI.** Per `feedback_anonymous_is_ssr_only`, the form island is not rendered for anonymous SSR. The host renders an `<a href="/login?next=/threads/{threadKey}">` CTA element in place of the form. No disabled-textarea pattern.
  - **Frozen users receive no compose UI.** When the client session has `frozen: true`, `ReplyForm` renders a static notice (`threads:replies.compose.frozenNotice`) in place of the input. The notice is informational — no input element, no submit button. The server-side `403` is the authoritative gate; this is progressive enhancement to avoid futile submits.
  - **Optimistic-append owned by the form, dedup owned by the listener.** `ReplyForm` appends a provisional entry (with a temporary client-side key prefixed `tmp-` and `pending: true` styling) the moment the user submits. On `201` it replaces the provisional with the server-parsed `Reply`. On error it removes the provisional, surfaces the error inline (`threads:replies.compose.error`), and re-enables the form with the user's content intact. When `subscribeReplies` later emits an `added` diff carrying the same server `key`, the listener's reconciliation drops the duplicate — the temporary key never collides because it carries the `tmp-` prefix.
  - **Composer mode toggle.** Inline mode mounts `<CnChatBar>` inside the `<CnReplyAnchor>`. An "Expand" affordance (button rendered via the anchor's `overhead` slot or a trailing `end` slot on the chat bar — implementer's choice) opens `<CnRichComposer open bind:value>` with the current draft. The expanded composer's `onsave` posts via the same `postReply` client and closes itself on success; `oncancel` keeps the draft and returns to inline mode. The draft value is the single source of truth across modes.
  - **No realtime mount on anonymous viewers.** This spec does not change the read-side rule: `subscribeReplies` only mounts for `sessionState === "active"`. Reply authoring is gated on the same condition.
  - **No edit / no delete.** This spec covers create only. Edit and delete are separate slices (the v17 `confirmDelete.astro` + `edit.astro` ports). Reposting is not a workaround — the spec does not provide one.
  - **Image attachments are not in this slice.** `markdownContent` is the only authoring payload. `images` exists in the request schema for forward compatibility but the v1 client never populates it. Implementations may reject non-empty `images` arrays with a 400 to keep the surface tight.
  - **Quote refs are passthrough.** `quoteref` is accepted and stored verbatim. The read-side already handles the display; no new rendering logic ships with this slice.
  - **Astro API route, not a Cloud Function.** Lives in `app/pelilauta/src/pages/api/threads/[threadKey]/replies.ts`, deployed as a Netlify function via the existing Astro adapter (`feedback_no_firebase_functions`). Uses `firebase-admin` directly via `@pelilauta/firebase/server`.

## Contract

### Definition of Done

#### API Route DoD

- [ ] `app/pelilauta/src/pages/api/threads/[threadKey]/replies.ts` exports a `POST` handler.
- [ ] The handler returns `401 Unauthorized` when no `Authorization: Bearer` header is present or the token fails `verifyIdToken`.
- [ ] The handler returns `403 Forbidden` when the resolved uid's `account/{uid}.frozen === true`.
- [ ] The handler returns `400 Bad Request` with a `{ error }` body when the request body fails the in-route Zod request schema (empty/missing `markdownContent`, malformed `images`, etc.).
- [ ] The handler returns `404 Not Found` with `{ error: "Thread not found" }` when `stream/{threadKey}` does not exist.
- [ ] On success the handler writes `stream/{threadKey}/comments/{auto-id}` with `owners=[uid]`, `author=uid`, `createdAt`/`updatedAt = serverTimestamp()`, `flowTime = Date.now()`, plus the validated `markdownContent`, optional `images`, optional `quoteref`.
- [ ] On success the handler reads the just-written doc back, parses it through `ReplySchema`, and returns it as JSON with status `201`.
- [ ] The handler does not trust client-provided values for `owners`, `author`, `createdAt`, `updatedAt`, `flowTime`, `key`, or `threadKey`.

#### Client Post DoD

- [ ] `packages/threads/src/client/postReply.ts` exports `postReply(threadKey, { markdownContent, images?, quoteref? }, idToken)` returning `Promise<Reply>`.
- [ ] `postReply` sends `Authorization: Bearer ${idToken}` and `Content-Type: application/json`.
- [ ] `postReply` parses the response body through `ReplySchema` before returning. Non-2xx responses throw with the parsed error message.
- [ ] `postReply` is exported from `@pelilauta/threads/client` and is the only entry the form island uses to write.

#### Form Island DoD

- [ ] `packages/threads/src/components/ReplyForm.svelte` is a Svelte 5 island.
- [ ] The form mounts only when `uid != null && sessionState === "active"`. It is gated by an auth-atom subscription and never appears for anonymous viewers.
- [ ] When the resolved session has `frozen === true`, the form renders only the `threads:replies.compose.frozenNotice` text (no input, no submit).
- [ ] Inline mode mounts `<CnChatBar>` inside a `<CnReplyAnchor>`. Submit fires `postReply` and on success appends the server reply to a parent-supplied `onReplyAppended(reply)` callback.
- [ ] Submitting first renders a provisional reply (`key: "tmp-{uuid}", pending: true`) at the bottom of the list. On the `201` response, the provisional is replaced with the server `Reply`. On error the provisional is removed and the inline error label `threads:replies.compose.error` is rendered.
- [ ] An "Expand" affordance opens `<CnRichComposer open bind:value>` carrying the current draft. The composer's `onsave` posts via the same `postReply`; `oncancel` returns to inline mode keeping the draft.
- [ ] Submit is disabled when the trimmed draft is empty or when a post is in flight.

#### Host Page DoD

- [ ] `app/pelilauta/src/pages/threads/[threadKey]/index.astro` renders `<ReplyForm>` (client-hydrated) under `<ThreadReplies>` only when the host's auth boundary resolves an authenticated session.
- [ ] When the host renders for an anonymous viewer, an `<a href="/login?next=/threads/{threadKey}">` element appears in the same slot. No `ReplyForm` script is shipped.
- [ ] The host wires the form's `onReplyAppended` to the same `entries` list that `ThreadReplies` mutates, so the optimistic append and the listener-driven reconciliation operate on a single source of truth.

#### i18n DoD

- [ ] The keys `threads:replies.compose.placeholder`, `threads:replies.compose.submit`, `threads:replies.compose.error`, `threads:replies.compose.loginCta`, `threads:replies.compose.expand`, `threads:replies.compose.frozenNotice` exist in the project's locale files.

### Regression Guardrails

- The server endpoint MUST NOT trust client-provided `owners`, `author`, `createdAt`, `updatedAt`, `flowTime`, `key`, or `threadKey`. These are derived server-side from the verified session uid, the route param, and server time.
- The server MUST verify the bearer token via `@pelilauta/firebase/server`'s `verifyIdToken` and MUST re-read `account/{uid}.frozen` from Firestore on every request. Client-supplied frozen state is informational only.
- `ReplyForm.svelte` MUST NOT post directly with `fetch`; all write traffic flows through `postReply` from `@pelilauta/threads/client`. This keeps the schema-parse-on-response invariant in one place.
- Anonymous SSR responses for `/threads/{threadKey}` MUST NOT include `ReplyForm`'s JavaScript bundle. The host gates by `Astro.locals.uid` (or equivalent) at frontmatter time and renders either the form's `client:` island or a plain `<a>` — never both.
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
Then onReplyAppended is called with { key: "tmp-<uuid>", markdownContent: "Hello world", owners: ["u1"], pending: true }
And the form's submit-in-flight state becomes true
When postReply resolves with a server Reply whose key="server-id"
Then onReplyAppended is called again to replace the provisional entry: { key: "server-id", pending: false, ... }
And the draft is cleared
And the submit-in-flight state becomes false
```

#### Scenario: Submit failure removes the provisional and surfaces the error

```gherkin
Given ReplyForm is mounted and the user submits "Hello"
And postReply rejects with Error("403: Forbidden")
When the rejection settles
Then onReplyAppended is called to remove the provisional entry
And the inline error label (threads:replies.compose.error) is visible
And the draft "Hello" remains in the chat bar
And the submit-in-flight state is false
```

#### Scenario: Expanded composer shares the draft with inline mode

```gherkin
Given ReplyForm is mounted with the chat bar carrying value "Hello"
When the user activates the Expand affordance
Then CnRichComposer opens with value="Hello"
When the user types " world" inside the composer and triggers onsave
Then postReply is called with markdownContent="Hello world"
And on success the composer closes
And the inline chat bar's draft is cleared
```

#### Scenario: Cancelling the expanded composer returns to inline mode with the draft intact

```gherkin
Given the expanded composer is open with value="Hello world"
When the user triggers oncancel
Then the composer closes
And the inline chat bar's value is "Hello world"
And no postReply call was made
```

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
