---
feature: Channels — Per-Channel Page
status: draft
last_major_review: 2026-04-29
parent_spec: ../spec.md
---

# Feature: Channels — Per-Channel Page

## Status

**Stub.** This spec is a placeholder. It will be written when implementation of the per-channel browser at `/channels/{slug}` starts.

## Scope when written

This child spec will cover the page surface the directory rows link to:

- Route `/channels/{slug}` — anonymous-SSR thread browser for a single channel.
- SSR thread seed (paginated initial render).
- "Load more" pagination — pattern (CSR island vs. paginated SSR routes) to be decided when written.
- Channel-scoped search box.
- Channel-scoped FAB (e.g. "new thread in this channel").
- Channel header rendering (icon, name, description, threadCount).
- `slug → Channel` resolution from `getChannels()` (or a more efficient single-channel lookup if introduced by then).
- 404 semantics for unknown slugs.
- ThreadCard composition with author byline (already specced in `threads/spec.md` and used by the front-page `TopThreadsStream`; the per-channel page is the next adopter).

## Dependencies (when written)

- Parent [`channels/spec.md`](../spec.md) — directory page contract; the per-channel page is reachable from each directory row.
- [`@pelilauta/threads`](../../threads/spec.md) — `Thread`, `Channel`, `getThreads(limit, options)`, `getChannels()`, `ThreadCard.svelte`.
- [`@pelilauta/profiles`](../../profiles/spec.md) — same author-byline resolution pattern as `TopThreadsStream`.

## Out of Scope

- Anything covered by the parent MVP (directory page).
- Latest-activity column on the directory — see [`channels/latest-activity/spec.md`](../latest-activity/spec.md).
- Authenticated thread creation flows — covered by separate threads-package writes specs.
