# Thread Reply Authoring (write endpoint + form island)

> **Status: DEFERRED.** Blocked on missing DS input primitives. Do not start
> implementation until the cyan dev track ships them. See "DS Prerequisites"
> below.

## Purpose

Add the write half of thread replies: an authenticated user on a thread page
can submit a reply, and it appears in the list without a full page reload.

Sibling to `plans/thread-replies-epic.md`, which covers the SSR read + CSR
realtime upgrade. That plan declares reply authoring Out of Scope; this plan
picks it up.

## Scope

### In scope

- `POST` route under `app/pelilauta/src/pages/api/threads/[threadKey]/replies.ts`
  (or equivalent) — writes a `Reply` doc into `stream/{threadKey}/comments`
  using `firebase-admin` with the session cookie's `uid` as author.
- `ReplyForm.svelte` island in `@pelilauta/threads` — textarea + submit, posts
  to the API, appends the resulting reply to the local list on success
  (optimistic append: render immediately, reconcile on response, roll back on
  error).
- Wiring in `app/pelilauta/src/pages/threads/[threadKey]/index.astro`:
  authenticated viewers see `<ReplyForm>` under `<ThreadReplies>`; anonymous
  viewers see a `<a href="/login?next=...">` CTA instead (per
  `feedback_anonymous_is_ssr_only`).
- i18n keys: `threads:replies.compose.placeholder`,
  `threads:replies.compose.submit`, `threads:replies.compose.error`,
  `threads:replies.compose.loginCta`.
- Tests: API route unit test (happy path, auth-required, schema-reject),
  component test for ReplyForm submit + error path.

### Out of scope

- Edit and delete (separate slice; v17 has `confirmDelete.astro` + `edit.astro`
  — port later).
- Image attachments on replies. (v17's reply editor handles images; defer until
  DS has an upload primitive too.)
- Realtime subscription (covered by the read-side epic).
- Moderation, rate limiting, abuse handling — not in MVP.

## DS Prerequisites — THE REASON THIS IS DEFERRED

The read-side epic's DS prereqs (`cn-bubble`, `cn-lightbox`) are already in
`packages/cyan/src/components/`. The **authoring** side has none of its
primitives yet:

- **`cn-textarea`** (or equivalent multi-line text input) — cyan has zero
  input primitives today (`ls packages/cyan/src/components` returns no
  textarea / input / form components). ReplyForm cannot render its compose
  field without one.
- **Markdown editor primitive** — v17 reply authoring uses a markdown editor
  (toolbar, preview, drag-drop). Decision needed before this plan starts: do
  we port the full v17 markdown editor as a DS primitive, or ship a plain
  textarea MVP first? Either way, the plain-textarea path still needs
  `cn-textarea`.
- **Submit button styling** — `CnButton` exists; no new primitive needed here.

Per `feedback_apps_never_override_ds` and `feedback_reverse_spec_first`, the
app does not stub these. They must land in cyan first, reverse-spec'd from
cyan-4 source under `.tmp/cyan-design-system-4/packages/cyan-lit/`.

## Data contract

- Writes to `stream/{threadKey}/comments/{auto-id}`.
- Document shape per `ReplySchema` in `@pelilauta/threads`. No new fields, no
  renames (`feedback_no_breaking_data_contracts`).
- `flowTime`, `createdAt`, `owners` set server-side from the verified session
  uid + server timestamp; never trust client values for those.

## Optimistic append flow (proposed)

1. User types, presses submit.
2. Form disables, renders a provisional reply at the bottom of the list with a
   client-side temp key and `pending: true` styling.
3. `POST` to the API. Server validates session, writes doc, returns the parsed
   `Reply`.
4. On 2xx: replace provisional entry with server reply.
5. On error: remove provisional entry, surface the error inline, re-enable
   form with content intact.

Open question: how this interacts with the read-side realtime subscription
once that ships. Likely fine because `docChanges()` reconciliation will simply
de-dupe by key, but verify when both land.

## Anonymous behavior

Per `feedback_anonymous_is_ssr_only`: no JS form island is rendered for
anonymous viewers. The compose slot renders as a static `<a>` link to
`/login?next=/threads/{threadKey}`. No disabled-textarea pattern.

## Done when

A logged-in viewer on a thread page can write a reply, hit submit, and see it
appear in the list without a full reload. The reply persists across reloads
(Firestore write succeeded). Anonymous viewers see a login CTA in the same
slot. All gates green per `feedback_never_ship_with_failing_tests`.

## Resume signal

Unblock when:

1. A cyan input primitive (`cn-textarea` at minimum) has shipped, with spec
   under `specs/cyan-ds/components/` and tests green; AND
2. A decision is recorded on plain-textarea-MVP vs full markdown editor port.

When both are true, write the threads-side spec at
`specs/pelilauta/threads/replies/authoring/spec.md` (sibling to the read
spec) before implementing.
