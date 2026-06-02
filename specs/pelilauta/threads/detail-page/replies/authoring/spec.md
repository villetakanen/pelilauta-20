---
feature: Thread Reply Authoring
status: alpha
maturity: implementation
last_major_review: 2026-06-02
parent_spec: ../spec.md
---

# Feature: Thread Reply Authoring

## Blueprint

### Context

The server endpoint that accepts a reply submission and the typed client wrapper that calls it. Compose UX is owned by [`../../reply-dock.md`](../../reply-dock.md); the store layer is in `packages/threads/src/client/replyEntriesStore.ts`.

### Architecture

- **API route:** `app/pelilauta/src/pages/api/threads/[threadKey]/replies.ts` — Astro POST handler.
- **Client wrapper:** `packages/threads/src/client/postReply.ts` — bundles the Firebase ID token, posts JSON, parses the response through `ReplySchema`.
- **Schema:** `packages/threads/src/schemas/ReplySchema.ts` — single source for the wire and storage shape; the server parses the just-written doc through it before responding.
- **Dependencies:** `@pelilauta/firebase/server` (`verifyIdToken`, admin Firestore), `@pelilauta/auth/server` (`getAccount` for the frozen check), `ReplySchema`.

### API Contract

- **Route:** `POST /api/threads/{threadKey}/replies`
- **Auth:** `Authorization: Bearer <Firebase ID token>`. Missing/invalid token → `401`. Frozen account (`account/{uid}.frozen === true`) → `403`.
- **Request body:**
  ```ts
  {
    markdownContent: string;          // required, non-empty after trim
    images?: Array<{ url: string; alt: string }>;
    quoteref?: string;
  }
  ```
- **Response 201:** the parsed `Reply` document (same shape `getReplies` returns). Timestamps wire as ISO strings; `postReply` re-parses through `ReplySchema` so consumers receive `Date` instances and a numeric `flowTime`.
- **Server-assigned fields** (client values ignored): `owners=[uid]`, `author=uid`, `createdAt=updatedAt=serverTimestamp()`, `flowTime=Date.now()`, `key=doc.id`, `threadKey` (from route).
- **Errors:** `400 { error }` on schema validation failure; `404 { error: "Thread not found" }` when `stream/{threadKey}` is absent; `500 { error }` on unexpected Firestore failure.

### Constraints

- `owners`, `author`, `createdAt`, `updatedAt`, `flowTime`, `threadKey`, `key` are derived server-side from the verified session uid + server time + route param. Client-supplied values for these fields are discarded.
- The server parses the just-written document through the same `ReplySchema` that `getReplies` uses, so the wire shape matches the read side exactly.
- The reply collection path is `stream/{threadKey}/comments`. The constants `THREADS_COLLECTION_NAME = "stream"` and `REPLIES_COLLECTION = "comments"` (from the schema modules) are the only literal sources.
- Image attachments are out of scope in v1; the `images` field is accepted in the schema for forward compatibility but the v1 client never populates it.
- This spec covers create only. Edit and delete ship in separate slices.
- This is an Astro API route deployed via the Netlify adapter — no Firebase Cloud Functions.

## Contract

### Definition of Done

#### API Route

- [x] `POST /api/threads/[threadKey]/replies` is exported from `app/pelilauta/src/pages/api/threads/[threadKey]/replies.ts`.
- [x] Returns `401 Unauthorized` when the `Authorization: Bearer` header is missing or `verifyIdToken` rejects.
- [x] Returns `403 Forbidden` when `account/{uid}.frozen === true`.
- [x] Returns `400 Bad Request` with `{ error }` when the body fails Zod validation.
- [x] Returns `404 Not Found` with `{ error: "Thread not found" }` when `stream/{threadKey}` is absent.
- [x] On success, writes `stream/{threadKey}/comments/{auto-id}` with the server-assigned fields, reads the doc back, parses through `ReplySchema`, and returns it with status `201`.
- [x] Discards any client-provided values for `owners`, `author`, `createdAt`, `updatedAt`, `flowTime`, `key`, or `threadKey`.

#### Client

- [x] `postReply(threadKey, { markdownContent, images?, quoteref? }, idToken)` is exported from `@pelilauta/threads/client`.
- [x] Sends `Authorization: Bearer ${idToken}` and `Content-Type: application/json`.
- [x] Parses the 201 response through `ReplySchema` before resolving.
- [x] Non-2xx responses reject with an `Error` whose message includes the server-supplied reason.

### Regression Guardrails

- The endpoint must verify the bearer token via `@pelilauta/firebase/server`'s `verifyIdToken` and re-read `account/{uid}.frozen` from Firestore on every request. Client-supplied frozen state is informational only.
- `ReplyForm.svelte` does not call `fetch` directly. All write traffic flows through `postReply` so the parse-on-response invariant lives in one place.
- A second schema or `parseReply()` wrapper for the response is a regression. `ReplySchema` is the single parse source.
- Provisional optimistic entries use a `tmp-` key prefix in the store; the server never emits a `tmp-` key. Server-emitted keys are auto-generated Firestore doc ids.

### Testing Scenarios

#### Scenario: POST /api/threads/{threadKey}/replies requires a bearer token
```gherkin
Given a POST to /api/threads/abc/replies with no Authorization header
Then the response status is 401
And the body is "Unauthorized"
And verifyIdToken was not called
```

#### Scenario: Invalid bearer token is rejected
```gherkin
Given a POST with Authorization: Bearer bad-token
And verifyIdToken rejects the token
Then the response status is 401
And the body is "Unauthorized"
And no Firestore write is performed
```

#### Scenario: Frozen accounts are blocked at the write endpoint
```gherkin
Given a POST with a valid bearer token resolving uid="frozen-uid"
And getAccount("frozen-uid") returns { frozen: true }
Then the response status is 403
And no Firestore write is performed
```

#### Scenario: Empty markdownContent is rejected
```gherkin
Given a POST with a valid bearer token and body { markdownContent: "" }
Then the response status is 400
And the response body names markdownContent
And no Firestore write is performed
```

#### Scenario: Whitespace-only markdownContent is rejected
```gherkin
Given a POST with a valid bearer token and body { markdownContent: "   \n  " }
Then the response status is 400
And no Firestore write is performed
```

#### Scenario: Missing thread returns 404
```gherkin
Given a POST to /api/threads/does-not-exist/replies with a valid bearer token and { markdownContent: "Hello" }
And stream/does-not-exist does not exist
Then the response status is 404
And no document is written
```

#### Scenario: Successful write returns the parsed Reply
```gherkin
Given a POST to /api/threads/abc/replies with a valid bearer token resolving uid="u1"
And stream/abc exists
And the body is { markdownContent: "Hello world" }
Then a document is written under stream/abc/comments with markdownContent="Hello world", owners=["u1"], author="u1", threadKey="abc"
And createdAt, updatedAt are server timestamps
And flowTime is a number
And the response status is 201
And the response body parses cleanly through ReplySchema
And the parsed Reply.key equals the written doc id
```

#### Scenario: Client-provided owners and timestamps are ignored
```gherkin
Given a POST with a valid bearer token resolving uid="u1"
And the request body includes owners=["attacker"], createdAt="1970-01-01T00:00:00Z", flowTime=0, key="forged"
Then the written document has owners=["u1"]
And createdAt is a server timestamp (not 1970)
And flowTime equals the server-side Date.now() value
And the doc id is auto-generated, not "forged"
```

#### Scenario: postReply parses the response through ReplySchema
```gherkin
Given postReply(threadKey, { markdownContent: "hi" }, idToken) is called
And the server returns 201 with a valid Reply JSON body
Then the resolved value's createdAt is a Date instance
And the resolved value's flowTime is a number
```

#### Scenario: postReply rejects non-2xx responses
```gherkin
Given postReply is called and the server returns 403 with body "Forbidden"
Then the promise rejects with an Error whose message includes "Forbidden"
```

#### Scenario: Anonymous viewers see a login CTA in place of the form
```gherkin
Given an anonymous viewer requests /threads/{key}
When the host page renders
Then no ReplyForm Svelte island appears in the SSR output
And an <a href="/login?next=/threads/{key}"> link is present
```

Note: under the FAB-toggle design described in [`../../reply-dock.md`](../../reply-dock.md) this in-prose CTA is replaced by an anonymous FAB. Until that implementation lands, the in-prose `<a>` is the current contract.

#### Scenario: The host mounts ThreadReplies inside cn-content-prose and ReplyForm as a sibling after that section
```gherkin
Given an authenticated viewer requests /threads/{key}
When the SSR renders
Then a ThreadReplies astro-island is inside <section class="cn-content-prose">
And a ReplyForm astro-island is a sibling AFTER that section, not a descendant of it
```

#### Scenario: Frozen viewers see a notice in place of the form
```gherkin
Given a session with uid="u1" and frozen=true
When ReplyForm renders
Then the form shows the threads:replies.compose.frozenNotice text
And no <textarea> is rendered
```

#### Scenario: Submit appends a provisional entry then reconciles to the server reply
```gherkin
Given an active session and ReplyForm mounted with a draft "Hello world"
When the user submits
Then appendEntry(threadKey, { reply: { key: "tmp-<uuid>", markdownContent: "Hello world" }, ... }) writes the provisional into the shared store
And the send control is disabled
When postReply resolves with { key: "server-id", ... }
Then replaceEntry(threadKey, "tmp-<uuid>", { reply: { key: "server-id", ... }, ... }) reconciles the store entry
And the draft is cleared
And the send control is re-enabled
```

#### Scenario: Submit failure removes the provisional and surfaces the error
```gherkin
Given a draft "Hello" is submitted
And postReply rejects with Error("403: Forbidden")
Then removeEntry(threadKey, "tmp-<uuid>") drops the provisional from the store
And the inline error label (threads:replies.compose.error) is visible
And the draft "Hello" remains in the chat bar
```

#### Scenario: Submit is disabled for empty drafts
```gherkin
Given an active session and ReplyForm mounted with an empty draft
When the user tries to send
Then no postReply call is made
And no entry is written to the store
```
