---
feature: Reply Dock
status: draft
maturity: design
last_major_review: 2026-06-02
parent_spec: ./spec.md
---

# Feature: Reply Dock

## Blueprint

### Context

A reader sees no compose UI until they ask for one. The thread page offers a single FAB; activating it either signs the reader in (if anonymous) or opens a chat-bar dock anchored to the app shell.

### Architecture

- **FAB.** Rendered into the host page's `slot="fab-tray"`. Anonymous viewers receive a plain `<a class="button fab" href="/login?next=/threads/{threadKey}">`. Authenticated viewers receive `<ReplyFab>` — a Svelte 5 island that flips `replyDockOpen` to `true`.
- **`packages/threads/src/components/ReplyFab.svelte`** — Svelte 5 island. Renders the `button.fab` and toggles the dock-open atom on click. Reads `replyDockOpen` to hide itself while the dock is open.
- **`packages/threads/src/client/replyDockState.ts`** — module-scoped nanostore: `replyDockOpen = atom<boolean>(false)`. One thread page mounts at a time; full-page navigation re-evaluates the module so the atom resets per page load.
- **`packages/threads/src/components/ReplyForm.svelte`** — the dock. Mounted as a sibling **after** `<section class="cn-content-prose">` in `index.astro`. Renders nothing when `replyDockOpen === false`. When true, renders `CnReplyAnchor` containing `CnChatBar` plus a close button.
- **Anonymous SSR ships no dock JS.** The host page gates `<ReplyForm>` on `Astro.locals.uid`; anonymous renders contain only the FAB anchor.

### Constraints

- Anonymous viewers never see the dock UI. Their FAB navigates to `/login?next=/threads/{threadKey}`.
- The dock starts closed on every page load. There is no persistence of open state across navigations.
- The FAB is not rendered while the dock is open. The dock's close button is the only way back to the closed state.
- The chat input is disabled while a submit is in flight; the draft clears only after the server returns `201`.
- On viewports ≤ 767px (matching `CnReplyAnchor`'s mobile breakpoint), a successful send also closes the dock. On wider viewports the dock stays open with an empty input.
- The dock is never a descendant of `cn-content-prose` or `cn-content-golden`. The host renders it after the prose section so `CnReplyAnchor`'s sticky/fixed dock anchors to the app shell, not the prose column.

## Contract

### Definition of Done

- [ ] On a fresh page load, no chat-bar, textarea, or close button is in the DOM. The FAB is the only compose affordance.
- [ ] Anonymous viewers' FAB is a plain anchor to `/login?next=/threads/{threadKey}`. No `ReplyFab` JS bundle is shipped on anonymous SSR.
- [ ] Authenticated viewers' FAB opens the dock on click; the FAB element disappears from the layout while the dock is open.
- [ ] The dock contains a visible close affordance. Activating it restores the closed state (no chat bar, FAB returns).
- [ ] Submit disables the send control until the response settles. On `201` the draft text is cleared. On error the draft is retained and an inline error surfaces.
- [ ] On viewports ≤ 767px, a successful send sets `replyDockOpen` to `false`. On wider viewports `replyDockOpen` stays `true`.

### Regression Guardrails

- `replyDockOpen` is the sole source of truth for dock visibility. No component reads `display`/`visibility` CSS to decide whether to render the chat input.
- The dock element is mounted as a sibling of `<section class="cn-content-prose">`, never as a descendant. A regression here re-confines the chat bar to the 67ch prose column.
- Anonymous SSR HTML does not contain any `astro-island` referencing `ReplyForm` or `ReplyFab`. The compose JS is auth-gated at frontmatter time.

### Testing Scenarios

#### Scenario: Page loads closed
```gherkin
Given an authenticated viewer GETs /threads/{key}
When the page renders
Then no <textarea> or chat-bar element is in the DOM
And the FAB is visible
```

#### Scenario: Anonymous FAB routes to login
```gherkin
Given an anonymous viewer on /threads/{key}
When they activate the FAB
Then the browser navigates to /login?next=/threads/{key}
```

#### Scenario: Opening hides the FAB
```gherkin
Given an authenticated viewer on /threads/{key} with the dock closed
When they activate the FAB
Then the chat bar is visible
And the FAB is no longer in the layout
```

#### Scenario: Successful send on desktop clears and stays open
```gherkin
Given the dock is open on a viewport wider than 767px
And the viewer has typed "Hello"
When they send and the server returns 201
Then the dock remains open
And the input is empty
And the send control is re-enabled
```

#### Scenario: Successful send on mobile closes the dock
```gherkin
Given the dock is open on a viewport ≤ 767px
And the viewer has typed "Hello"
When they send and the server returns 201
Then the dock closes
And the FAB returns to the layout
```

#### Scenario: Close button returns to closed state
```gherkin
Given the dock is open with draft text "Hello"
When the viewer activates the close button
Then the dock closes
And the FAB returns
```

## Out of Scope

- The write API contract and `postReply` client — owned by [`./replies/authoring/spec.md`](./replies/authoring/spec.md). This spec assumes the write surface exists and reports success/failure.
- The reply list rendering — owned by [`./replies/spec.md`](./replies/spec.md).
- Reactions, edits, deletes, image attachments, quote refs.
