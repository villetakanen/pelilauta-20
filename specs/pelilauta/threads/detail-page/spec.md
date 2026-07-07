---
feature: Thread Detail Page Layout
status: draft
last_major_review: 2026-06-01
parent_spec: ../spec.md
---

# Feature: Thread Detail Page Layout

## Blueprint

### Context

**Route:** `/threads/[threadKey]`

This is the page a reader lands on when they open a single discussion thread.

The page stacks two content containers inside the application shell, in source order:

1. **Reader** — the thread article on the left, a narrower sidebar on the right carrying metadata about the thread (channel, author, dates) and actions on it (edit, share, moderation). On wide viewports the two columns sit side-by-side; on narrow viewports the sidebar stacks below the article.
2. **Replies** — the reply discussion at full prose width, centered. Reads as a single column at all viewport sizes.

This spec owns the page-level layout: the two containers and the sidebar slot inside the reader. Reply behaviour (list, listener, authoring flow) stays in [`./replies/spec.md`](./replies/spec.md). The thread article component contract stays in [`../spec.md`](../spec.md). Individual sidebar widgets (metadata, info actions, share button, lightbox cover, etc.) each get their own sub-spec under this folder.

### Architecture

- **Page:** `app/pelilauta/src/pages/threads/[threadKey]/index.astro` — the only route that composes this layout.
- **App shell vs content containers.** The page renders inside the single application shell (`AppShell` / `Page`). Both containers below live *inside* the shell's main region as **content containers** — not as additional shells. This distinction matters: docked UI such as the reply chat bar attaches to the bottom of the *app shell*, not the bottom of a content container, so it cannot be modelled as a child of the containers in this spec.
- **Layout primitives.** Both containers come from `packages/cyan/src/layouts/content-grid.css`. Contract: [`specs/cyan-ds/layouts/content-grids/spec.md`](../../../cyan-ds/layouts/content-grids/spec.md). Legacy `.content-columns` / `.column-l` / `.column-s` from v18 do not migrate.
- **Reader container — `cn-content-golden`.** Holds the thread itself in two columns. The phi-ratio two-mode grid (narrow: stacked; wide: 67ch main + 67ch/2.618 sidebar).
  - *Main column:* `<ThreadDetail>` (thread article).
  - *Sidebar column:* the metadata / actions slot. Sidebar widgets compose here (metadata, info actions, share button, etc.). While a sidebar widget contract is not yet implemented, its slot still renders so the grid keeps two children; narrow mode stacks main above sidebar.
- **Replies container — `cn-content-prose`.** Single-column primitive at 67ch prose width, centered on wide viewports. Holds the reply region:
  - An `<h2>` section heading at the top, sourced from `threads:replies.title` ("Keskustelu" / "Discussion"). The container references it via `aria-labelledby`.
  - For authenticated viewers, the `ThreadReplies` island (list + listener) inside the prose section. The `ReplyForm` island lives as a sibling **after** the prose section so its chat-bar dock attaches to the app shell, not the prose column. The two islands share a per-thread `replyEntriesStore`.
  - For anonymous viewers, the SSR reply list followed by a button-styled login link ("Osallistu keskusteluun" / "Join the discussion") whose href is `/login?next=/threads/{threadKey}`. The button uses the DS's `.button.cta` styling (defined in `packages/cyan/src/core/buttons.css`), not a bare anchor.
  - The chat-bar input itself docks to the app shell rather than rendering inside this container, per [`./replies/spec.md`](./replies/spec.md).
- **Anonymous parity.** Both containers render identically for anonymous and authenticated viewers from SSR. Sidebar widgets and reply UI that require auth self-gate; their absence does not change the container structure.

### Dependencies

- `packages/cyan` — provides `cn-content-golden` and `cn-content-prose` via `content-grid.css`, included in the DS index stylesheet imported by every page; provides `AppShell` / `Page`.
- `@pelilauta/threads/components` — `ThreadDetail`, `ThreadReplies`, `ReplyForm`.

### Constraints

- The page uses `cn-content-golden` exactly once (the reader container) and `cn-content-prose` exactly once (the replies container), in that source order, both inside the existing `AppShell`.
- The reader container renders two direct children — main and sidebar — in both anonymous and authenticated modes.
- The reply list lives in the replies container, never inside the reader container.
- The reply chat-bar input docks to the app shell (not inside either content container), per [`./replies/spec.md`](./replies/spec.md).

## Contract

### Definition of Done

- [ ] `/threads/[threadKey]` renders the reader region inside a `cn-content-golden` element with two direct children: `<ThreadDetail>` (main) and the sidebar slot.
- [ ] The replies region renders inside a `cn-content-prose` element that is a sibling **after** the `cn-content-golden` element. Anonymous viewers see the SSR reply list plus the login CTA inside it; authenticated viewers see the `ThreadReplies` island inside it.
- [ ] For authenticated viewers, the `ReplyForm` island renders as a sibling **after** the `cn-content-prose` section, outside both content containers.
- [ ] The reply chat-bar input is NOT nested inside either content container — it docks to the app shell per [`./replies/spec.md`](./replies/spec.md).
- [ ] Wide-viewport rendering: reader columns sit side-by-side per the golden primitive's wide mode; the replies container sits below at prose width (67ch), centered.
- [ ] Narrow-viewport rendering: main → sidebar → replies stack vertically with the primitives' default rhythm.
- [ ] Error and not-found branches (`pelilauta:error.fetch`, `pelilauta:error.notFound`) render outside both content containers — they are page-level status messages, not reader content.
- [ ] Anonymous SSR remains cache-shareable: the layout adds no client-side JavaScript and no per-viewer state.

### Regression Guardrails

- The reader uses `cn-content-golden`; the replies region uses `cn-content-prose`. The legacy class names `.content-columns`, `.column-l`, `.column-s` MUST NOT appear in `app/pelilauta/`.
- The reply list lives in the replies container, never inside the reader container. Nesting replies in the golden grid would re-narrow them to 67ch's *main* column and break v18 parity.
- The reply chat-bar input remains docked to the app shell. Nesting it inside `cn-content-prose` would scroll the input away with the page and break the chat-bar contract.
- Anonymous viewers see the same two containers as authenticated viewers. Removing the sidebar slot or the replies container when unauthenticated would force layout shifts whenever a sidebar or reply widget becomes auth-gated.

### Testing Scenarios

#### Scenario: Anonymous thread page renders reader and replies as separate content containers

```gherkin
Given a Firestore document at stream/{key}
When an anonymous user GETs /threads/{key}
Then the response contains exactly one element with the class "cn-content-golden"
And that element has two direct element children
And the first child contains the thread article (h1 with the thread title)
And the second child is the sidebar slot
And the response contains a "cn-content-prose" element that is a sibling AFTER the cn-content-golden element
And the SSR reply list renders inside that cn-content-prose element
And no reply UI renders inside the cn-content-golden element
```

#### Scenario: Authenticated view uses the same two containers

```gherkin
Given a Firestore document at stream/{key}
And a valid session cookie
When the page is rendered
Then the response contains exactly one "cn-content-golden" with two direct children
And the response contains a sibling "cn-content-prose" containing the ThreadReplies island
And the ReplyForm island appears in the page AFTER the cn-content-prose section, not nested inside it
And no reply UI renders inside the cn-content-golden element
And the reply chat-bar input is a descendant of the app shell, not nested inside the cn-content-prose container
```

#### Scenario: Error and not-found states render outside both containers

```gherkin
Given getThread throws a Firestore error
When the page is rendered
Then no cn-content-golden element is present in the response
And no cn-content-prose element is present in the response
And the pelilauta:error.fetch message is rendered as a page-level status
```
