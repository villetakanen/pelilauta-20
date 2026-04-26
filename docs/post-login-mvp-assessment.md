# Post-Login MVP — What to Port Next

**Date:** 2026-04-25
**Branch:** main (login-MVP just landed)
**v17 source of truth:** `.tmp/pelilauta-17/`

---

## Where v20 stands today

### Working in v20

- **Auth round-trip:** `/login` (Google redirect), `POST /api/auth/session`, session cookie, middleware → `Astro.locals.uid`, `AuthHandler` token-refresh, `LogoutAction` on `/settings`.
- **Front page (`/`)** renders:
  - `TopThreadsStream.astro` — pulls 5 threads + channels from Firestore via `@pelilauta/threads/server`. Pure SSR, error-isolated.
  - Hard-coded **mock** "Blog-roll" and "Latest sites" `CnCard`s (placeholders, not data-bound).
- **`@pelilauta/threads`** is at **Stage 2 (Read & Render)** of its spec:
  - `ThreadSchema`, `ReplySchema`, `ChannelSchema` ported with v17 parse-parity.
  - `getThreads(limit, opts)`, `getChannels()` accessors live.
  - `ThreadCard.svelte` renders cards on `cn-card`.
- **DS:** `cyan` ships `AppShell`, `Page`, `AppBar`, `Tray`, `CnCard`, `CnIcon`, `CnAvatar`, `ProfileButton`, `CnBackgroundPoster` — enough chrome for an authenticated paint.
- **Middleware** populates `Astro.locals.uid` / `claims` for all SSR.
- **`/settings`** (auth-gated) hosts the logout affordance.

### Broken-on-click in v20 (live 404 traps)

These links are already shipped on the front page and inside `ThreadCard`, but the destinations don't exist:

| Origin | Link | Status |
|---|---|---|
| `TopThreadsStream` "show more" | `/channels` | **404** |
| `ThreadCard` title (every front-page card) | `/threads/{key}` | **404** |
| `ThreadCard` channel link | `/channels/{slug}` | **404** |

Anyone who clicks anything on the homepage hits a dead end. This frames the priority.

### Not yet started in v20 (exists in v17)

- `/threads/[threadKey]` — single-thread view + replies (v17: `pages/threads/[threadKey]/index.astro`, `ThreadArticle`, `ThreadInfoSection`, `DiscussionApp`).
- `/channels` index + `/channels/[slug]` — channel directory and per-channel paginated thread list.
- `/profiles/[uid]` — public author profile + their thread list.
- `/onboarding` (EULA + profile creation) — gates first-time writers (deferred by `auth/spec.md` §Out of Scope).
- Thread/reply **writes**: `/create/thread`, `[threadKey]/edit`, `addReply`, `updateReply`, `deleteReply`, reactions, Bluesky syndication. (Threads spec **Stage 3**.)
- `/sites/*`, `/characters/*`, `/library/*` — entire Sites vertical (spec marked TBD).
- `/inbox`, `/search`, `/admin`, `/tags`, RSS, sitemaps.
- `@pelilauta/threads/client` barrel (writes, listeners, interactive components) — empty shell today.

---

## Recommendation: port `/threads/[threadKey]` next (read-only)

### Why this one

1. **Closes a live broken link.** Every front-page click on a `ThreadCard` title is currently a 404. Fixing this is the smallest unit of "the site works."
2. **Fits cleanly inside the threads spec already on the books.** The component list (`ThreadDetail`, `DiscussionSection`, `ReplyArticle`) and accessors (`getThread`, `getReplies`) are already enumerated in `specs/pelilauta/threads/spec.md` §Module Structure — no new spec ground required.
3. **No auth, no writes, no new packages.** Read-only Stage-2 work. Doesn't touch onboarding, EULA, profile creation, Bluesky, or any CRUD path. SSR-anonymous-friendly (matches v17 behavior — anyone can read a thread).
4. **Small surface.** v17's three server components total **154 LOC**. The reply listener is the only CSR island and it can ship behind `client:only` exactly like v17.
5. **Unlocks the second domino.** Once thread detail exists, `/channels/[slug]` is mechanically the same data shape (paginated `getThreads({channel})`) plus a list wrapper — the second-broken-link goes away on the same arc.

### Concrete scope for "Thread detail MVP"

**`@pelilauta/threads` additions (Stage 2 finish):**
- `src/api/getThread.ts` — single-document fetch by key, parse through `ThreadSchema`, propagate errors per spec.
- `src/api/getReplies.ts` — sub-collection read, sort by `createdAt` ASC, parse through `ReplySchema`.
- `src/server/index.ts` — re-export both.
- `src/components/ThreadDetail.svelte` — title, author byline, markdown body, channel link, image. SSR-safe.
- `src/components/ReplyArticle.svelte` — single reply (read-only). SSR-safe.
- `src/components/DiscussionSection.svelte` — list of `ReplyArticle`s. **MVP: SSR-only**, fed pre-fetched replies via prop. Real-time `onSnapshot` listener stays deferred to Stage 3 per spec §Constraints (SSR uses one-shot queries).
- Vitest for the two accessors and the three components.

**Host (`app/pelilauta/`):**
- `src/pages/threads/[threadKey]/index.astro` — fetch thread + replies, render via `<Page>`. 404 on missing.
- i18n keys for byline / "no replies yet" / error messages (host-owned per `auth/spec.md` patterns: `pelilauta:error.fetch`, etc., or new `threads:` keys via the package's i18n sub-export).
- Playwright: load a known thread, assert title + body + reply count.

**Out of scope for this micro-port (deferred, named):**
- Reply CRUD, edit, delete (Stage 3).
- Real-time `onSnapshot` listener for replies (Stage 3).
- Reactions / love button (Stage 3).
- Author avatar/profile lookup — leave the `"-"` sentinel and any unresolved `uid` rendering as "anonymous" exactly as the threads spec §`"-"` owner sentinel describes. Author-profile fetch is part of the Profile vertical.
- Bluesky card.
- Quote bubble (`quoteRef`).
- "Confirm delete" page.
- Edit page.

### Why not the other obvious candidates

| Candidate | Why it's not next |
|---|---|
| **`/channels` + `/channels/[slug]`** | Closes the *other* broken link, same Stage-2 read-only shape — but a thread detail page is what users actually want when they click a card. Channels-index is the natural **second** port, immediately after, on the same accessor (`getThreads`) and same SSR pattern. |
| **Onboarding (EULA + profile creation)** | The `auth/spec.md` explicitly defers this and accepts any Google sign-in as a valid session for MVP. Onboarding only matters at the moment we add a write path. No write paths exist yet. Doing this before there's a thing to write is premature. |
| **Profile page (`/profiles/[uid]`)** | Useful, but no current consumer is broken without it. `ThreadCard` doesn't render an author byline today; thread detail can ship with a "by anonymous"/"by {uid}" placeholder and grow into a profile fetch later. Profile vertical is its own package per the spec template; introducing it now is a new package-creation chore on the critical path. |
| **Thread editor / writes (Stage 3)** | Requires onboarding/EULA, profile creation, auth-gated UI, validation, image upload, Bluesky integration. Multi-week chunk. The smallest-safe-change rule says: read everything that's linked first, then write. |
| **Sites vertical** | Spec is TBD. Front page already mocks it with placeholder cards; closing the broken thread/channel links is more user-visible than replacing mocks with real data behind a not-yet-spec'd schema. |
| **Inbox / search / admin** | Authenticated chrome of last resort. Inbox needs a notifications schema port; search needs an index strategy decision; admin needs the whole writes path first. Not contenders for "next." |

### Suggested sequence after thread detail

1. **`/threads/[threadKey]`** — this assessment's recommendation. ~2 accessors + 3 components + 1 page.
2. **`/channels` + `/channels/[slug]`** — same accessor (`getThreads({channel, limit})`), reuses `ThreadCard`, adds a channel directory list. Closes the remaining homepage 404.
3. **Profile vertical (`packages/profiles` + `/profiles/[uid]`)** — unblocks author bylines on `ThreadCard` and `ThreadDetail`, replaces the `"-"`/anonymous placeholder rendering for real users.
4. **Onboarding + EULA** — required gate before any write surface. Pulls in `packages/profiles` for the create-profile step.
5. **Threads Stage 3 writes** — `addReply` first (smallest write, single thread surface), then thread create/edit, then reactions, then Bluesky.
6. **Sites vertical (spec it first).**

This sequence keeps every step within an existing spec, ships read-before-write, and never leaves a broken link on a route the user can already discover from the homepage.

---

## Risks & open questions for the recommendation

- **Does v17 thread content render natively?** v17 `ThreadArticle` uses `markdownContent` straight from the doc. v20 has no markdown renderer wired into the threads package yet — confirm whether to bring v17's renderer over or pull a vetted markdown lib. This is the single biggest unknown for the port.
- **404 vs. SSR-error policy.** Threads spec §Accessor Surfaces says read accessors propagate errors to callers. The page must distinguish "no such thread → 404" from "Firestore failed → error block, not 5xx." Mirror `TopThreadsStream`'s try/catch pattern.
- **Author placeholder UX.** "Anonymous" rendering for `"-"` and stale uids is contractually correct per spec, but visually bland. Acceptable for the read-only MVP; revisit when the profile vertical lands.
- **Reply count vs. actual replies.** `replyCount` on the thread doc is denormalised and may drift from the live sub-collection. SSR shows what's on disk; that's fine and matches v17.
