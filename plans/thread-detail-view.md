# Thread Detail View Implementation Plan

## Goal

Implement the full **Thread Detail View** at `app/pelilauta/src/pages/threads/[key].astro`. This includes porting the markdown rendering engine, implementing the replies accessor, and composing the detail page with the `ThreadDetail` and `ReplyArticle` components.

## Architectural Reasoning

The thread detail view is the first "deep" content page in v20. It must follow the **SSR-first** rule: the thread content and the initial list of replies must be rendered on the server for SEO and performance.

### Key Decisions
1. **Markdown Engine:** Port v17's `marked` configuration to `@pelilauta/utils`. This ensures consistent rendering across the platform and keeps the threads package lean.
2. **Replies:** Use a one-shot SSR fetch for the initial replies list. Real-time updates (Stage 3) will hydrate on top later.
3. **Layout:** Use the standard `Page` layout and `cn-content-triad` for consistent structural alignment with the front page.

## Implementation Steps

### Step 1 — Port Markdown Engine to `@pelilauta/utils`
- Port `.tmp/pelilauta-17/src/utils/marked.ts` to `packages/utils/src/markdown.ts`.
- Ensure it supports Pelilauta-specific extensions (e.g., wiki-links, sanitized HTML).
- Add Vitest tests to `packages/utils/src/markdown.test.ts`.
- Export `renderMarkdown(content: string): string` from `@pelilauta/utils`.

### Step 2 — Implement `getReplies` Accessor
- Create `packages/threads/src/api/getReplies.ts`.
- Fetch from `stream/{threadKey}/comments` sorted by `createdAt` ascending.
- Add to `@pelilauta/threads/server` barrel.
- Add Vitest tests mocking Firestore.

### Step 3 — Scaffold `ReplyArticle` Component
- Create `packages/threads/src/components/ReplyArticle.svelte`.
- Pure SSR-safe component (no client logic yet).
- Renders author, timestamp, and `@html bodyHtml`.
- Add to `@pelilauta/threads/components` barrel.

### Step 4 — Implement `/threads/[key].astro` Route
- Create `app/pelilauta/src/pages/threads/[key].astro`.
- **Frontmatter:**
  - Fetch thread using `getThread(key)`.
  - Handle 404 if thread is missing.
  - Render thread markdown via `renderMarkdown`.
  - Fetch replies via `getReplies(key)`.
  - Render reply markdown in a loop.
  - Define SEO metadata (title, description, open-graph).
- **Template:**
  - Compose using `Page` layout.
  - Mount `ThreadDetail` in the primary column.
  - Render the list of `ReplyArticle` components below it.

### Step 5 — E2E Verification
- Create `app/pelilauta/e2e/thread-detail.spec.ts`.
- **Scenarios:**
  - "Displays thread content and metadata correctly."
  - "Displays the list of replies in chronological order."
  - "Returns 404 for non-existent threads."
  - "Handles threads with zero replies gracefully."

## References
- Spec: `specs/pelilauta/threads/spec.md`
- Source (v17): `.tmp/pelilauta-17/src/pages/threads/[key].astro`
- Source (v17): `.tmp/pelilauta-17/src/utils/marked.ts`
