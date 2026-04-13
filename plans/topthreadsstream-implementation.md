# TopThreadsStream Implementation Plan

> Saved from a working session. The session ended after step 1 was written but
> not yet shipped. Pick up by reviewing the pending working-tree changes (see
> "Current state" below) and continuing from step 1's ship or step 2.

## Goal

Implement `app/pelilauta/src/components/front-page/TopThreadsStream.astro` —
the data-bound widget that replaces the placeholder Threads region in the
front-page MVP. Spec: `specs/pelilauta/front-page/top-threads-stream/spec.md`.

## Why (the architectural reasoning, so future-you doesn't re-derive it)

The TopThreadsStream spec is at the top of a dependency stack that was specced
across the session but only partially implemented. Order matters because each
layer needs the one below it.

### What the spec requires from the system

- `@pelilauta/threads/server` exporting `getThreads(limit, { order, public })`
  and `getChannels()`.
- `ThreadCard` Svelte component from `@pelilauta/threads/components`.
- `@pelilauta/threads/i18n` with at least these keys:
  `threads:card.inChannel`, `threads:frontpage.showMore`,
  `threads:frontpage.error.fetchFailed`.
- Host i18n composition seam (`app/pelilauta/src/i18n.ts`) wired to assign the
  threads package's locale tree to the `threads` namespace.
- Real Firestore reads via `@pelilauta/firebase/server`.
- Mounted into `app/pelilauta/src/pages/index.astro` in the medium triad column.

### What already exists

- `packages/i18n` — engine + types (shipped this session).
- `packages/models` — schemas + `Entry.locale` field (shipped this session).
- `packages/cyan` — `cn-card`, `cn-content-triad`, `Page` layout.
- `app/pelilauta/src/i18n.ts` — host composition seam, currently only assembles
  the `app` namespace from `./locales/app` (empty seed trees).
- `index.astro` — front-page MVP with placeholder cards in all three triad
  columns (per `specs/pelilauta/front-page/spec.md`).

### What does NOT exist yet

- `packages/firebase` — specced (`specs/pelilauta/firebase/spec.md`); empty
  placeholder dirs at `app/pelilauta/src/firebase/{server,client}/` survive
  from earlier scaffolding and should be deleted when the package lands.
- `packages/threads` — specced (`specs/pelilauta/threads/spec.md`,
  fully refreshed this session with channels, i18n sub-export, accessor
  signatures, and naming consistency).
- The host-side wiring of the threads namespace.
- The widget itself.

### Why Firebase-first (not stub-first)

Considered both options during the session. **Firebase-first won** because:

- v17 already has dev + prod Firebase projects with credentials.
- v17 init code ports straight to v20 (env var contract preserved).
- No Firebase emulator needed — unit tests mock `firebase-admin` at the module
  boundary; dev loop and Playwright point at the v17 dev project.
- A throwaway stub accessor would be code we'd write and delete, vs. just
  writing the real thing once.
- See memory `feedback_no_breaking_data_contracts` — Firestore document
  shapes from v17 are preserved verbatim, so the v20 accessors read the same
  docs the v17 site does.

### Why per-package, not in-app

Per `specs/pelilauta/spec.md`:

- The host (`app/pelilauta/`) owns composition and routing seams.
- Domain logic lives in feature packages.
- Adding a new vertical means adding a workspace package, not a folder under
  `app/pelilauta/src/`.
- `@pelilauta/threads` is the canonical home for threads schema, accessors,
  components, and locale strings.

## Current state (working tree at session end)

Untracked (step 1, written but **NOT YET SHIPPED**):

```
packages/firebase/
  package.json              # name: @pelilauta/firebase, exports: ./server, ./client
  vitest.config.ts
  src/server/index.ts       # firebase-admin init, ported verbatim from v17
                            # exports app, db, auth (singletons)
  src/client/index.ts       # firebase client init, ported verbatim from v17
                            # exports app, db, auth + localhost persistence shim
```

Modified:

```
pnpm-lock.yaml              # firebase-admin@^13 added to workspace
```

Existing on disk but not in git (empty since earlier scaffolding):

```
app/pelilauta/src/firebase/server/    # delete when packages/firebase ships
app/pelilauta/src/firebase/client/    # delete when packages/firebase ships
```

Naming decision made: server and client both export `app`/`db`/`auth` (no
v17-style `serverApp`/`serverDB` prefixes). Disambiguation comes from the
import path (`@pelilauta/firebase/server` vs `/client`). v20 uses harmonized
names; mixers alias on import.

All quality gates (`pnpm check`, `pnpm test`, `pnpm build`) were green at
session end.

## Implementation steps

Each step is one micro-commit. Run gates green between steps.

### Step 1 — Scaffold `packages/firebase` `[WRITTEN, NOT SHIPPED]`

Files above. When shipping:

- `git add packages/firebase pnpm-lock.yaml`
- Also delete `app/pelilauta/src/firebase/{server,client}/` empty dirs and
  include in the same commit (replacement, not addition).
- Suggested commit: `feat(firebase): scaffold @pelilauta/firebase server and client init`

No tests yet — these modules read env vars at import time and have no behavior
to test in isolation. Tests come when `isAdmin` / `verifyIdToken` / etc. are
ported.

### Step 2 — `packages/threads` skeleton

Mirror `packages/i18n` shape:

- `package.json` — name `@pelilauta/threads`, type module, exports map for
  `./server`, `./client`, `./components`, `./i18n`. Deps: `@pelilauta/models`,
  `@pelilauta/firebase`, `@pelilauta/i18n` (for the `NestedTranslation` type),
  `zod`. Dev deps: `vitest`, plus whatever the components dir needs (svelte,
  testing-library, etc. — port from `packages/cyan`).
- `vitest.config.ts`
- Empty `src/` subdirectories per the threads spec module structure block.

Suggested commit: `feat(threads): scaffold @pelilauta/threads workspace package`

### Step 3 — Schemas

- `packages/threads/src/schemas/ThreadSchema.ts` — port from v17, extend
  `ContentEntrySchema` from `@pelilauta/models`. Include `parseThread()` with
  legacy-data tolerance (string images → `[{url, alt}]`, missing author,
  Timestamp dates).
- `packages/threads/src/schemas/ChannelSchema.ts` — port from v17 verbatim
  EXCEPT: `parseChannel()` does NOT default `category` to `'Pelilauta'`.
  Other coalescings (description '', icon 'discussion', flowTime 0) preserved.
  Constants: `CHANNELS_META_REF`, `CHANNEL_DEFAULT_SLUG = 'yleinen'`,
  `CHANNEL_DEFAULT_ICON = 'discussion'`. Also `EntryMetadataSchema` for the
  denormalized latestThread/latestReply snapshots.
- `packages/threads/src/schemas/ReplySchema.ts` — port from v17, extend
  `ContentEntrySchema`.
- Tests for each: parse legacy fixtures, assert defaults, assert `category`
  stays undefined when missing.

Suggested commit: `feat(threads): port Thread, Channel, Reply schemas from v17`

### Step 4 — `getChannels()` accessor

- `packages/threads/src/server/getChannels.ts` — read `meta/threads` doc,
  parse `topics` array through `ChannelsSchema`, return. Module-level cache.
- `packages/threads/src/server/index.ts` — barrel re-exporting.
- Tests mock `firebase-admin/firestore`. Manual smoke test against dev project.

Suggested commit: `feat(threads): add getChannels accessor`

### Step 5 — `getThreads()` accessor

- `packages/threads/src/server/getThreads.ts` — `getThreads(limit, options?)`
  with `order` ('flowTime' | 'createdAt', default 'flowTime') and
  `public` (default true). Queries `stream` collection with the corresponding
  `where()` and `orderBy()`. Parses through ThreadSchema.
- Add to `server/index.ts` barrel.
- Tests mock firestore.

Suggested commit: `feat(threads): add getThreads accessor`

### Step 6 — `./i18n` sub-export

- `packages/threads/src/i18n/fi.ts` — Finnish strings for the three initial
  keys. Strings live here, not in `app/pelilauta/`.
- `packages/threads/src/i18n/en.ts` — English equivalents.
- `packages/threads/src/i18n/index.ts` — `export const fi = ...; export const en = ...;`
- No tests needed for static data (or one trivial structure assertion).

Suggested commit: `feat(threads): add i18n sub-export with frontpage strings`

### Step 7 — `ThreadCard.svelte`

- `packages/threads/src/components/ThreadCard.svelte` — Svelte 5, takes
  `thread: Thread` and optional `noun?: string` (channel icon). Wraps
  `cn-card` with title, snippet (rich snippet of markdownContent), channel
  link, author/timestamp. Stamps `lang={thread.locale}` on its root.
  Renders no icon if `noun` is undefined.
- Add to `components/` barrel if there is one, else export from
  `packages/threads/index.ts` or via the components sub-path.
- Tests with `@testing-library/svelte` against seed Thread data.

Suggested commit: `feat(threads): add ThreadCard component`

### Step 8 — Host i18n wiring

- Update `app/pelilauta/src/i18n.ts` to import from `@pelilauta/threads/i18n`
  and assign to the `threads` namespace.
- Update `app/pelilauta/package.json` to add `@pelilauta/threads: workspace:*`.

Suggested commit: `feat(pelilauta): wire threads namespace into host i18n composition`

### Step 9 — `TopThreadsStream.astro`

- `app/pelilauta/src/components/front-page/TopThreadsStream.astro` — calls
  `getThreads(5)` and `getChannels()` (NOT in parallel — same Netlify SSR
  function, latency is debatable, per session decision). Wraps a try/catch:
  on error, render the `threads:frontpage.error.fetchFailed` block; otherwise
  render up to 5 ThreadCards. Always render the "show more" link to
  `/channels`. Channel icon resolved via channels lookup; render WITHOUT icon
  if channel is unknown (the new `cn-card` supports omission).
- No `<style>`, no inline styles, no local utility classes (per spec).
- Playwright spec: `app/pelilauta/e2e/front-page-top-threads.spec.ts` with
  the scenarios in the spec (5 cards, empty state, error state, content lang).

Suggested commit: `feat(front-page): implement TopThreadsStream widget`

### Step 10 — Mount in `index.astro`

- Replace the placeholder Threads region in
  `app/pelilauta/src/pages/index.astro` with `<TopThreadsStream />`.
- Update `specs/pelilauta/front-page/spec.md` if its DoD wording about
  "placeholder" needs to become "data-bound" — the front-page spec was
  written for the MVP scaffold and may need a small revision pointing at
  the child spec for the Threads region. (Optional same-commit update.)

Suggested commit: `feat(front-page): mount TopThreadsStream in front-page Threads region`

## Open questions deferred to implementation time

1. **Channel icon when `thread.channel` matches a known channel but the
   channel doc has no `icon` field.** Schema default is `"discussion"`, so
   should never happen post-parse. But if it does (legacy data slipping
   through): render with the schema default. No special handling needed in
   TopThreadsStream.
2. **Server island vs. inline frontmatter for TopThreadsStream.** Inline for
   now; consider promoting to server island only if the data fetch is slow
   enough to matter. Defer — not load-bearing.
3. **Where the `channels/{slug}` page link goes from a ThreadCard's channel
   link.** v17 used `/channels/${slug}`. Keep that pattern.
4. **`createRichSnippet` v17 helper** — used by v17 ThreadCard to build the
   snippet preview. Need to port or replace. Quick check during step 7.
5. **`netlifyImage` / `generateSrcset` v17 helpers** — image optimization in
   v17. Need to decide v20 strategy: port the helpers, use Astro's
   `<Image>`, or skip optimization in MVP. Defer to step 7 design decision.

## References

- Spec: `specs/pelilauta/front-page/top-threads-stream/spec.md`
- Spec: `specs/pelilauta/threads/spec.md`
- Spec: `specs/pelilauta/firebase/spec.md`
- Spec: `specs/pelilauta/i18n/spec.md`
- Spec: `specs/pelilauta/models/spec.md`
- Source (v17): `.tmp/pelilauta-17/src/components/server/FrontPage/TopThreadsStream.astro`
- Source (v17): `.tmp/pelilauta-17/src/components/server/FrontPage/ThreadCard.astro`
- Source (v17): `.tmp/pelilauta-17/src/pages/api/threads.json.ts`
- Source (v17): `.tmp/pelilauta-17/src/pages/api/meta/channels.json.ts`
- Source (v17): `.tmp/pelilauta-17/src/schemas/ChannelSchema.ts`
- Source (v17): `.tmp/pelilauta-17/src/firebase/server/index.ts`
- Source (v17): `.tmp/pelilauta-17/src/firebase/client/index.ts`
