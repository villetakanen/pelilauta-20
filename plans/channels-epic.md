# Channels Epic Implementation Plan

## Goal

Port the channels directory (`/channels`) and the individual channel view (`/channels/[slug]`) to v20. This closes the remaining 404 links on the homepage and completes the read-only surface for threads/channels.

## Architectural Reasoning

Channels are the primary grouping mechanism for threads. This epic builds directly on the work done in the `thread-detail-view` epic, reusing the same `getThreads` accessor and `ThreadCard` UI.

### Key Decisions
1. **Reuse Components:** Use the existing `ThreadCard` component for displaying threads within a channel.
2. **SSR-first:** Both `/channels` and `/channels/[slug]` must be fully server-side rendered (SSR) for SEO and performance, consistent with the rest of the read-only surface.
3. **Pagination:** Channels can have many threads. The `getThreads` accessor already supports limits and offsets. We will need to implement basic pagination on the channel view.

## Implementation Steps

### Step 1 — Implement `/channels` Index View
- Re-use `getChannels()` from `@pelilauta/threads/server`.
- Create `app/pelilauta/src/pages/channels/index.astro`.
- Render a list of all channels, showing their `name`, `description`, and `slug`.
- Layout: Use `<Page>` layout with `cn-content-triad`.

### Step 2 — Implement `/channels/[slug]` Detail View
- Use `getThreads({ channel: slug })` to fetch threads for a specific channel.
- Create `app/pelilauta/src/pages/channels/[slug]/index.astro`.
- Fetch the specific channel details using a new `getChannel(slug)` accessor (needs to be added to `@pelilauta/threads/server`).
- Render a grid/list of `ThreadCard` components for the retrieved threads.
- Implement basic SSR pagination (e.g., query params like `?page=2`).

### Step 3 — Add `getChannel` Accessor
- Create `packages/threads/src/api/getChannel.ts`.
- Fetch a single channel document by its slug.
- Re-export in `@pelilauta/threads/server`.
- Add Vitest tests for the new accessor.

### Step 4 — E2E Verification
- Create `app/pelilauta/e2e/channels.spec.ts`.
- **Scenarios:**
  - "Displays channel directory with links to individual channels."
  - "Displays channel detail view with its threads."
  - "Returns 404 for non-existent channels."
  - "Pagination works correctly on channel detail view."

## Next Steps After This Epic
- Proceed to the **Profile vertical** (`packages/profiles` + `/profiles/[uid]`) to replace the anonymous placeholders with real author profiles.
