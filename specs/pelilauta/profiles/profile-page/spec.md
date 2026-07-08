---
feature: Public profile page
status: draft
last_major_review: 2026-07-08
parent_spec: ../spec.md
---

# Feature: Public profile page

## Blueprint

### Context

`/profiles/{uid}` is the public, anonymous-SSR rendering of a user's identity: avatar, nick, username, bio, and self-published links. Everything on the page is public — there is no auth-gated content and no per-viewer variation; the page is cache-shareable.

Reverse-engineered from `pelilauta-17` (pelilauta@18.13.3) sources:

- `.tmp/pelilauta-17/src/pages/profiles/[uid].astro` — route, SEO, caching, not-found handling
- `.tmp/pelilauta-17/src/components/server/profile/ProfileApp.astro` + `ProfileArticle.astro` → `src/components/shared/ProfileSection.svelte` — page content

### Architecture

- **Components:**
  - `app/pelilauta/src/pages/profiles/[uid].astro` — route. Resolves the profile in frontmatter via `getProfile(uid)` from `@pelilauta/profiles/server` (in-process; v17's `/api/profiles/[uid].json` HTTP hop is not carried forward). Renders 404 on a `null` resolution.
  - `packages/profiles/src/components/ProfileCard.svelte` (v17 `ProfileSection`) — SSR Svelte component receiving a resolved `Profile` prop: `CnAvatar`, nick, username, bio, and `links` rendered as buttons opening in a new tab with `rel="noopener"`. No `client:*` directive — the profiles package stays SSR-only per [`../spec.md`](../spec.md) §Constraints.
- **Data models:** `ProfileSchema` from `packages/profiles/src/server/schemas.ts` — no new fields. `tags` and `lovedThreads` exist in the schema but are not rendered (v17 parity).
- **API contracts:**
  - Route `GET /profiles/{uid}` → 200 profile page, or 404 when the uid is empty, the `"-"` sentinel, missing, or unparseable (all surface as `getProfile → null`).
  - Response is publicly cacheable; v17 shipped `s-maxage=3600`. The host page owns the header (`ARCHITECTURE.md` §Package boundaries).
  - SEO: `<meta name="description">` derives from `bio`; when absent, the i18n fallback `profiles:seo.fallback` (v17: `"{nick} - Pelilauta-käyttäjä…"`).
- **Dependencies:** [`../spec.md`](../spec.md) (`getProfile`, `ProfileSchema`), [`../../app-flags/spec.md`](../../app-flags/spec.md) (`profiles` flag gates the route tree), `packages/cyan` (`CnAvatar`, layout primitives).
- **Constraints:**
  - The page ships zero profile-related client JS; the only islands are the app-shell auth chrome from `layouts/Page.astro`.
  - `packages/profiles` does not import threads or sites; cross-domain content on this page is composed at the host level (see §Out of Scope).
  - Nick and bio are user-controlled text and render as text nodes; `links[].url` renders only into `href`.

### Out of Scope

- **Threads and sites streams.** v17's profile page listed the user's 11 latest threads and public sites. These are host-level cross-domain compositions, gated by the owning app's flag, and land separately (issue #52). This spec's page is complete without them.
- **Own-profile editing, avatar upload, onboarding.** v17 keeps profile editing inside the settings surface (`SettingsApp` → `ProfileTool`) and onboarding at `/create-profile`; both remain settings/onboarding concerns, not this page.
- **`@nick` mention markdown extension** (v17 `createProfileTagExtension`) — markdown-pipeline concern.
- **Profile directory / listing page.** v17 had none.

## Contract

### Definition of Done

- [ ] `/profiles/{uid}` renders avatar, nick, username, bio, and link buttons fully at SSR for an existing profile.
- [ ] Unknown, empty, sentinel (`"-"`), and unparseable uids all render the site's 404.
- [ ] SEO description uses `bio`, falling back to `profiles:seo.fallback` when bio is absent.
- [ ] Page-level i18n strings live under the `profiles:` namespace in `packages/profiles/src/i18n` and are wired into `app/pelilauta/src/i18n.ts`.
- [ ] With `PUBLIC_app_profiles=false`, the route returns 404 (see [`../../app-flags/spec.md`](../../app-flags/spec.md)).

### Regression Guardrails

- **Everything rendered is public.** No auth-gated fragment, no per-viewer branch; the anonymous and authenticated response bodies differ only by the app-shell chrome.
- **`ProfileCard` is mounted without a `client:*` directive.**
- **User-controlled fields render as text.** Nick, username, bio, and link labels are never interpolated into markup-bearing contexts; link URLs appear only in `href`.

### Testing Scenarios

#### Scenario: Existing profile renders its public identity at SSR

```gherkin
Given a profiles/{uid} doc with nick, username, avatarURL, bio, and one link
When an anonymous request fetches /profiles/{uid}
Then the response is 200
And the HTML contains the nick, username, bio, and avatar image
And the link renders as an anchor with rel="noopener" opening in a new tab
And no profile-related island is present in the HTML
```

#### Scenario: Unknown profile renders 404

```gherkin
Given no profiles doc exists for uid "nobody"
When a request fetches /profiles/nobody
Then the response status is 404
```

#### Scenario: Sentinel and empty uids render 404 without a Firestore read

```gherkin
Given the uid path segment is "-"
When the route resolves
Then the response status is 404
And no profiles collection read is issued
```

#### Scenario: SEO description falls back when bio is absent

```gherkin
Given a profile doc without a bio
When /profiles/{uid} renders
Then the meta description equals the profiles:seo.fallback string with the nick interpolated
```

#### Scenario: Malformed link entries never break the page

```gherkin
Given a profile doc whose links array contains a malformed entry
When /profiles/{uid} renders
Then the response is 200
And only well-formed links render as anchors
```
