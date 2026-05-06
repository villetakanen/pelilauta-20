# Thread Replies Epic (SSR seed + progressive CSR)

## Purpose

Define and deliver `ThreadReplies.svelte` for `@pelilauta/threads` so thread detail pages can:

1. SSR-render a deterministic reply list.
2. CSR-scroll to a reply at a target `flowTime` (or next later one).
3. CSR-upgrade to real-time `onSnapshot` updates only when the viewer has an active authenticated session.

This epic is spec-first and targets smallest safe migration from `.tmp/pelilauta-17` to v20.

## What Is Missing in v20

## DS Prerequisites (cyan)

These primitives exist in cyan-4 but have not been ported to v20's `packages/cyan/` yet. Both are load-bearing for reply rendering and MUST land before any threads-side implementation begins. Apps cannot stub or override DS — the "apps never override DS" rule applies.

- **`cn-bubble`** — speech-bubble container. ReplyArticle wraps each reply in `<cn-bubble reply={fromUser || undefined}>`. Owns the own-vs-other visual variant and the bubble shape. Source: `.tmp/cyan-design-system-4/packages/cyan-lit/src/cn-bubble/`.
- **`cn-lightbox`** — image gallery rendered inside the bubble for `reply.images`. Source: `.tmp/cyan-design-system-4/packages/cyan-lit/src/cn-lightbox/`.

Per the reverse-spec rule, both are reverse-spec'd from cyan-4 source first; specs land under `specs/cyan-ds/` before code. Each gets its own DS spec (not buried inside the threads epic spec) — they are platform primitives, not threads-feature components.

## Data / Accessors

- `packages/threads/src/api/getReplies.ts` (SSR read accessor).
- `packages/threads/src/api/getReplies.test.ts` (sorting/parsing/error semantics).
- Re-export from `packages/threads/src/server/index.ts`.

## Client Realtime Surface

- `packages/threads/src/client/subscribeReplies.ts` (or `listenReplies.ts`) wrapping Firestore client SDK `onSnapshot`.
- `packages/threads/src/client/index.ts` re-export for subscription API.
- Parse incoming docs with `ReplySchema` parity and deterministic ordering.
- Reconciliation strategy: use `querySnapshot.docChanges()` for diff-based merge against the SSR seed (added/modified/removed). Avoids visual flicker on first snapshot and matches v17's `DiscussionSection.svelte` pattern.
- Snapshot parse failures: drop the malformed reply and `logError`. Never throw out of the listener. Mirrors the profiles-spec "parse failures degrade to null, never throw" rule.
- Listener lifecycle: wrap subscription in a `$effect` keyed on `[uid, sessionState]` so account switches and logout/login transitions tear down and restart cleanly.

## UI Components

- `packages/threads/src/components/ReplyArticle.svelte` (SSR-safe, non-async render).
- `packages/threads/src/components/ThreadReplies.svelte` (SSR list + CSR upgrade behavior).
- `packages/threads/src/components/index.ts` exports.
- **`packages/profiles/src/components/AvatarLink.svelte`** — v17 had an SSR citation that pairs `<a href="/profiles/{uid}">` with `CnAvatar`. v20 has the parts (`CnAvatar` in cyan, `ProfileLink` in profiles) but not the combined primitive. ReplyArticle wants both nick-link and avatar-link, so add `AvatarLink` alongside `ProfileLink` in this milestone. (Profiles package and `getProfile` accessor are *already shipped* — only this companion component is missing.)

## Host Wiring

- `app/pelilauta/src/pages/threads/[threadKey]/index.astro`:
  - SSR `getReplies(threadKey)` call in frontmatter.
  - **Profile pre-resolution:** `Promise.all(replies.map(r => getProfile(r.owners[0])))` upstream of the component. Profiles MUST be resolved at SSR — leaf components do not read Firestore (profiles spec §Server accessor).
  - **Markdown pre-render:** `bodyHtml` per reply via `markdownToHTML(reply.markdownContent ?? "")` in frontmatter. `markdownToHTML(...)` MUST NOT appear inside the Svelte template (ARCHITECTURE.md §SSR Data Flow).
  - Pass a structured shape to `ThreadReplies` — e.g. `initialReplies: Array<{ reply: Reply; bodyHtml: string; profile: Profile | null }>`.
  - Parse optional `?since={flowTime}` query param for the at-or-after-flowTime scroll mode.
  - Memory note `project_thread_detail_mvp_no_replies` should be retired/updated in the spec-milestone PR description; this work lifts that deferral.

## i18n

- New keys under `packages/threads/src/i18n/` in the `threads:replies.*` namespace: `empty`, `error`, `loginToReply` (at minimum).
- Wire the keys into `app/pelilauta/src/i18n.ts` registry composition.
- Component accepts resolved strings as props (`emptyLabel`, `errorLabel`, etc.) — host owns translation, package owns the keys.

## Anonymous "login to reply" CTA — explicitly out of `ThreadReplies` scope

- The login CTA is a *sibling* component (or page-level markup), not a child of `ThreadReplies`. Keeps the read component narrow and reusable on any future surface that needs an inert reply list.
- ThreadReplies renders only: the reply list (SSR), and (when authenticated) the realtime upgrade. Authoring is out of scope per epic.

## Spec + Verification

- Contract text for:
  - target-flowTime selection semantics,
  - when scroll runs,
  - auth/session gate for listener start/stop,
  - snapshot error behavior.
- Verification artifacts (unit/component tests, optional e2e assertion for deep-link scrolling).

## Epic Scope

## In Scope

- **DS prerequisites:** `cn-bubble` and `cn-lightbox` reverse-spec'd from cyan-4 and ported to `packages/cyan/`. Land before any app-side work in the epic.
- Read-only SSR reply retrieval and render for thread page.
- Progressive enhancement to CSR real-time updates when session is active.
- Deterministic scrolling to target-or-next `flowTime`, plus native `#reply-{key}` fragment support.
- **`AvatarLink.svelte` in `packages/profiles/components`** — companion SSR citation pairing `<a href="/profiles/{uid}">` with `CnAvatar`. ReplyArticle is the immediate consumer; the primitive is reusable on every future surface that wants an avatar-linked profile citation.

## Out of Scope

- Reply authoring UI (add/edit/delete dialogs).
- Moderation actions.
- New Firestore schemas/renames.
- The `/profiles/{uid}` page route. ProfileLink/AvatarLink anchors will continue to 404 during alpha — accepted by the profiles spec as alpha behaviour. This epic does not unblock or require that route.

## Proposed Contract Shape (Draft)

## `getReplies(threadKey)`

- Input: `threadKey: string`
- Output: `Promise<Reply[]>`
- Behavior:
  - reads `stream/{threadKey}/comments`;
  - parses each doc via `ReplySchema.parse({ ...doc.data(), key: doc.id, threadKey })`;
  - returns ascending by `flowTime` (fallback tie-breaker by `createdAt`).
- Errors propagate to caller.

## `ThreadReplies.svelte` props (draft)

- `threadKey: string`
- `initialReplies: Array<{ reply: Reply; bodyHtml: string; profile: Profile | null }>` — SSR-resolved tuple. Profiles and markdown HTML are prepared upstream in the page frontmatter.
- `targetFlowTime?: number` — at-or-after-flowTime scroll mode. Source: `?since={flowTime}` URL param parsed by the page.
- `emptyLabel?: string`
- `errorLabel?: string`

Notes:
- Avoid requiring `uid` prop unless needed for SSR hints.
- Listener gate should depend on client auth atoms: `uid != null` and `sessionState === "active"`.

## Runtime behavior (draft)

- SSR: render `initialReplies` synchronously, no async in template. Each `<article>` carries `id={reply.key}` so `#reply-{key}` URL fragments work as native browser scroll-to-anchor with zero JS.
- CSR mount:
  - if `targetFlowTime` is set, scroll (via element-level `scrollIntoView`, not `window.scrollTo`) to the first reply with `flowTime >= targetFlowTime`. Run after `tick()` so the DOM is settled.
  - guard the scroll behind a `$state` "fired" boolean so it does not re-trigger when later snapshots arrive.
  - if no reply matches, no forced scroll. Native `#reply-{key}` fragment handling is the user's other entry point.
- CSR auth upgrade:
  - subscribe when gate becomes true;
  - unsubscribe when gate becomes false or component unmounts.
- Two scroll modes coexist: native `#reply-{key}` (handled by the browser, requires no component logic beyond the `id` attribute) and `?since={flowTime}` (handled by the component on first match).

## Milestones

DS prerequisites first — app development does not start until both cn-bubble and cn-lightbox have shipped.

1. **DS: `cn-bubble`**
   - `/reverse-spec` against `.tmp/cyan-design-system-4/packages/cyan-lit/src/cn-bubble/`.
   - Spec under `specs/cyan-ds/components/cn-bubble/spec.md`.
   - Implementation in `packages/cyan/src/components/cn-bubble/` and demo page in `app/cyan-ds/`.
2. **DS: `cn-lightbox`**
   - `/reverse-spec` against `.tmp/cyan-design-system-4/packages/cyan-lit/src/cn-lightbox/`.
   - Spec under `specs/cyan-ds/components/cn-lightbox/spec.md`.
   - Implementation in `packages/cyan/src/components/cn-lightbox/` and demo page in `app/cyan-ds/`.
3. **Replies spec**
   - Add replies child spec under `specs/pelilauta/threads/replies/spec.md` following `specs/TEMPLATE.md`. Cites the now-shipped `cn-bubble` / `cn-lightbox` / `AvatarLink` contracts.
   - Every Gherkin scenario carries a `Verifies:` tag per `specs/VERIFICATION.md`. `pnpm spec:coverage` must pass with no orphan tags.
   - Spec PR description retires/updates memory note `project_thread_detail_mvp_no_replies` (the deferral being lifted).
4. **Profiles companion: `AvatarLink`**
   - Add `AvatarLink.svelte` to `packages/profiles/src/components/` mirroring `ProfileLink` (single `profile?: Profile | null` prop, `<a href="/profiles/{key}"><CnAvatar nick={profile.nick} src={profile.avatarURL}/></a>` resolved branch, anonymous-fallback `<CnAvatar nick="A0"/>` branch).
   - Re-export from `packages/profiles/src/components/index.ts`.
   - Component test covering the resolved/nullish branches.
   - Can run in parallel with the DS milestones; gates the component milestone, not the spec.
5. **Server read**
   - Implement `getReplies(threadKey)` + tests + server export. Reads `stream/{threadKey}/comments`, parses via `ReplySchema`, sorts ascending by `flowTime` (tie-break `createdAt`).
6. **Components**
   - Implement `ReplyArticle.svelte` (composes `AvatarLink` + `ProfileLink` + pre-rendered `bodyHtml` + `cn-bubble` + `cn-lightbox`) and `ThreadReplies.svelte` (SSR list + CSR upgrade behavior).
7. **Realtime**
   - Implement `subscribeReplies(threadKey, onChange)` in `@pelilauta/threads/client` using `docChanges()` diff reconciliation. Drop+log on per-doc parse failure.
8. **Host integration**
   - Wire thread page SSR: `getReplies` + `Promise.all(getProfile(...))` + `markdownToHTML(...)` per reply, pass tuple shape into the island.
   - Parse `?since={flowTime}` query param.

## Done When

A logged-in viewer of a thread sees its replies, can deep-link to a specific one or to "everything since timestamp X", and watches new replies arrive live. Anonymous viewers see the same SSR list with no listener and no JS dependency for first paint. Per-milestone DoD lives in the child spec.

## Risks / Open Decisions

Resolved in the amendments above:
- **Scroll trigger timing:** after `tick()` post-mount; `$state` "fired" guard prevents re-trigger on subsequent snapshots.
- **Target parameter naming:** `?since={flowTime}` (semantic) for the at-or-after mode; native `#reply-{key}` fragments for the exact-key mode.
- **Snapshot parse failures:** drop + `logError`, never throw out of the listener.
- **Auth gate source:** atom subscription (`uid`, `sessionState` from `@pelilauta/auth/client`) wrapped in a `$effect` keyed on `[uid, sessionState]`. No prop-assisted gating.

Still open for the spec author to settle:
- **Dataflow shape for the SSR tuple** — pick between an array of `{ reply, bodyHtml, profile }` records vs. parallel `Map<uid, Profile|null>` + `Map<replyKey, string>`. Both work; pick whichever reads cleanest in the page frontmatter.

## Recommendation

DS prerequisites land first (`cn-bubble`, `cn-lightbox` reverse-spec'd from cyan-4 and shipped to `packages/cyan/`). Then the replies child spec under `specs/pelilauta/threads/replies/spec.md`, then implementation in milestone order. Profiles-companion (AvatarLink) lands inside this epic since ReplyArticle is its first consumer and the primitive is reusable across the platform.
