---
feature: Thread Detail Page Layout
status: draft
maturity: design
last_major_review: 2026-06-01
parent_spec: ../spec.md
---

# Feature: Thread Detail Page Layout

## Blueprint

### Context

**Route:** `/threads/[threadKey]`

This is the page a reader lands on when they open a single discussion thread. On wide viewports it reads as a two-column layout: the thread article on the left, a narrower sidebar on the right carrying metadata about the thread (channel, author, dates) and actions on it (edit, share, moderation). On narrow viewports the sidebar stacks below the article.

The reply discussion renders below the article in its own region; this spec only owns the upper reader area and the sidebar slot. Reply behaviour stays in [`../replies/spec.md`](../replies/spec.md), and the thread body component contract stays in [`../spec.md`](../spec.md). Individual sidebar widgets (metadata, info actions, share button, lightbox cover, etc.) each get their own sub-spec under this folder as they land.

### Architecture

- **Page:** `app/pelilauta/src/pages/threads/[threadKey]/index.astro` — the only route that composes this layout.
- **App shell vs content containers.** The page renders inside the single application shell (`AppShell` / `Page`). Everything described below lives *inside* the shell's main region as **content containers** — not as additional shells. This distinction matters: docked UI such as the reply chat bar attaches to the bottom of the *app shell*, not the bottom of a content container, so it cannot be modelled as a child of the containers in this spec.
- **Layout primitive:** `cn-content-golden` from `packages/cyan/src/layouts/content-grid.css`. Contract: [`specs/cyan-ds/layouts/content-grids/spec.md`](../../../cyan-ds/layouts/content-grids/spec.md). The phi-ratio two-mode grid (narrow: stacked; wide: 67ch main + 67ch/2.618 sidebar) is the canonical reader container for v20. Legacy `.content-columns` / `.column-l` / `.column-s` from v18 do not migrate.
- **Reader container — `cn-content-golden`.** Holds the thread itself in two columns:
  - *Main column:* `<ThreadDetail>` (thread article).
  - *Sidebar column:* the metadata / actions slot. Future sidebar widgets (#35 metadata block, #39 ThreadInfoActions, #40 share button, etc.) compose here. While no widgets are implemented, the slot still renders so the grid stays balanced; narrow mode stacks main above sidebar.
- **Anonymous parity.** The reader container renders identically for anonymous and authenticated viewers from SSR. Sidebar widgets that require auth (e.g. `ThreadInfoActions`) self-gate; their absence does not change the layout.
- **Out of scope for this iteration.** The reply region (list + chat-bar input) is *not* restructured by this spec — it continues to render below the reader as it does today. A follow-up will move the in-flow reply list into its own `cn-content-prose` container so it gets full prose width like v18; that change ships on its own GitHub issue, not under #34. Reply input docking to the app shell stays unchanged and is owned by [`../replies/spec.md`](../replies/spec.md).

### Dependencies

- `packages/cyan` — provides `cn-content-golden` and `cn-content-prose` via `content-grid.css`, included in the DS index stylesheet imported by every page; provides `AppShell` / `Page`.
- `@pelilauta/threads/components` — `ThreadDetail`, `ThreadReplies`, `ThreadReplySection` (already wired by the parent thread spec; this spec only changes how they are arranged inside the shell).

### Constraints

- The page uses `cn-content-golden` exactly once (the reader container), inside the existing `AppShell`.
- The reader container renders two direct children — main and sidebar — in both anonymous and authenticated modes.
- The reply region (list and input) MUST NOT be nested inside the reader container. It remains where it is today, as a sibling below.

## Contract

### Definition of Done

- [ ] `/threads/[threadKey]` renders the reader region inside a `cn-content-golden` element with two direct children: `<ThreadDetail>` (main) and the sidebar slot.
- [ ] While no sidebar-widget specs are implemented, the sidebar slot still renders (e.g. an empty `<aside>`) so the reader container keeps two children.
- [ ] Wide-viewport rendering (container ≥ ~`3rem + 67ch + 67ch/2.618`) shows the reader columns side-by-side per the golden primitive's wide mode.
- [ ] Narrow-viewport rendering stacks main above sidebar with the primitive's default vertical rhythm.
- [ ] The reply region renders as a sibling **after** the `cn-content-golden` element, not nested inside it. Its internal structure (whether wrapped in its own content container, how the chat bar docks, etc.) is unchanged by this task.
- [ ] Error and not-found branches (`pelilauta:error.fetch`, `pelilauta:error.notFound`) render outside the reader container — they are page-level status messages, not reader content.
- [ ] Anonymous SSR remains cache-shareable: the layout adds no client-side JavaScript and no per-viewer state.

### Regression Guardrails

- The reader container uses `cn-content-golden`. The legacy class names `.content-columns`, `.column-l`, `.column-s` MUST NOT appear in `app/pelilauta/`.
- The reply region stays a sibling of the reader container, never nested inside it. Nesting replies in the golden grid would re-narrow them to 67ch and break v18 parity.
- Anonymous viewers see the same reader container as authenticated viewers. Removing the sidebar slot when unauthenticated would force layout shifts whenever a sidebar widget becomes auth-gated.

### Testing Scenarios

#### Scenario: Anonymous thread page renders the reader container with two columns

```gherkin
Given a Firestore document at stream/{key}
When an anonymous user GETs /threads/{key}
Then the response contains exactly one element with the class "cn-content-golden"
And that element has two direct element children
And the first child contains the thread article (h1 with the thread title)
And the second child is the sidebar slot
And the reply region renders as a sibling after the cn-content-golden element
And no reply UI renders inside the cn-content-golden element
```

#### Scenario: Authenticated view uses the same reader container

```gherkin
Given a Firestore document at stream/{key}
And a valid session cookie
When the page is rendered
Then the response contains exactly one "cn-content-golden" with two direct children
And no reply UI renders inside the cn-content-golden element
```

#### Scenario: Error and not-found states render outside the reader container

```gherkin
Given getThread throws a Firestore error
When the page is rendered
Then no cn-content-golden element is present in the response
And the pelilauta:error.fetch message is rendered as a page-level status
```
