---
feature: AvatarLink — Avatar-Linked Profile Citation
status: draft
last_major_review: 2026-05-06
---

# Feature: AvatarLink — Avatar-Linked Profile Citation

## Blueprint

### Context

The profiles package already provides the parts for an avatar-linked profile citation — `CnAvatar` from `@pelilauta/cyan/components`, `ProfileLink` for the text/nick citation, `getProfile` for upstream resolution — but no combined primitive that pairs an avatar with the `/profiles/{uid}` link target. `AvatarLink` fills that gap: a sibling to `ProfileLink` that renders `<a href="/profiles/{uid}"><CnAvatar nick src/></a>` for resolved profiles and a bare `<CnAvatar/>` for the anonymous fallback.

`ReplyArticle.svelte` (`packages/threads/src/components/`, see [`../threads/detail-page/replies/spec.md`](../threads/detail-page/replies/spec.md)) is the immediate consumer — it pairs `AvatarLink` and `ProfileLink` inside a `cn-bubble` header to render reply bylines. The primitive is reusable on every surface that wants an avatar-linked profile citation: thread cards, channel directories, search results, member listings.

Reverse-engineered from `pelilauta-17`:

- `src/components/svelte/app/AvatarLink.svelte` — v17 CSR component (uid prop, auto-fetch via `getProfileAtom`).
- `src/stores/profiles/index.ts` — v17's CSR atom store that v20 has dropped in favour of upstream SSR resolution.

### Architecture

- **Component:** `packages/profiles/src/components/AvatarLink.svelte` — single Svelte 5 file. SSR-renderable without a `client:*` directive.
- **Prop shape:** `{ profile?: Profile | null; size?: "small" | "medium" }`. Mirrors `ProfileLink`'s profile-as-prop pattern: the host resolves the profile upstream via `getProfile(uid)` in Astro frontmatter and passes the result in.
- **Composition:** wraps `CnAvatar` from `@pelilauta/cyan/components`. No other DS primitives, no domain components.
- **Render states:**
  - **Resolved (`profile` is non-null):** `<a href="/profiles/{profile.key}" aria-label={profile.nick}><CnAvatar nick={profile.nick} src={profile.avatarURL} size={size}/></a>`. The anchor target points to the profile page; `aria-label` carries the nick so screen readers announce "link to Ada's profile" rather than reading the URL.
  - **Nullish (`profile` is null/undefined):** `<CnAvatar size={size} aria-hidden="true"/>`. Bare placeholder with no link, no nick, no src — `CnAvatar`'s deterministic background fallback handles the empty case. `aria-hidden="true"` because the avatar is decorative when there is nothing to link to.
- **Default size:** `"small"`. Matches the visual scale used by `ReplyArticle` byline avatars in v17.
- **Sibling relationship to `ProfileLink`:** both components consume `Profile | null | undefined` and render the same anonymous-fallback pattern. They are independently usable; consumers that want both an avatar and a nick render two siblings (or an enclosing `<header>` that contains both) — there is no combined `AvatarLinkedProfileLink` super-component.

### Dependencies

- `@pelilauta/profiles/server` — `Profile` type. Type-only import.
- `@pelilauta/cyan/components` — `CnAvatar` Svelte component.
- No Firestore, no `nanostores`, no `firebase/client`. The package's SSR-only constraint (already enforced by `biome.json` per [`../profiles/spec.md`](../profiles/spec.md) §Constraints) covers this component.

### Constraints

- **Profile-as-prop, not uid-as-prop.** The component receives an already-resolved `Profile | null | undefined`. It does not call `getProfile` or any other accessor; resolution happens upstream in the host's Astro frontmatter, identical to `ProfileLink`.
- **SSR-only.** The component renders synchronously with no `onMount`, no `$effect` for data fetching, no atom subscription. No `client:*` directive at consumption sites.
- **Anonymous fallback is the universal not-found path.** Empty uid, `"-"` sentinel, parse failure, deleted user — all surface as `null` at the `getProfile` boundary upstream and produce the bare-avatar render. The component itself is not aware of these cases; `null` is the only signal it consumes.
- **Anchor target `/profiles/{uid}`.** During alpha this anchor 404s; the route lands with the future profile-page spec. Identical alpha behaviour to `ProfileLink`.
- **Decorative on the anonymous branch.** `aria-hidden="true"` on the bare `<CnAvatar>` keeps assistive tech from announcing a meaningless decoration. The resolved branch is non-decorative — the anchor's `aria-label` carries the nick.
- **Apps never inline this rendering.** Pages MUST NOT pair a bare `<a href="/profiles/{uid}">` with an `<img>` or a raw `CnAvatar`. Every avatar-linked profile citation goes through `AvatarLink`. Mirrors the parent spec's "Apps never override the package" rule.

## Contract

### Definition of Done

- [ ] `AvatarLink.svelte` exists at `packages/profiles/src/components/AvatarLink.svelte`.
- [ ] Re-exported from `packages/profiles/src/components/index.ts`.
- [ ] Prop shape: `{ profile?: Profile | null; size?: "small" | "medium" }`. `size` defaults to `"small"`.
- [ ] Resolved branch renders `<a href="/profiles/{profile.key}" aria-label={profile.nick}><CnAvatar nick={profile.nick} src={profile.avatarURL} size={size}/></a>`.
- [ ] Nullish branch (null, undefined, or omitted prop) renders `<CnAvatar size={size} aria-hidden="true"/>` with no anchor.
- [ ] Component is sync — no `onMount`, no `$effect` for fetching, no atom subscription, no `getProfile` import.
- [ ] Consumers MUST NOT mount `AvatarLink` with a `client:*` directive. No regression check needed beyond the package-level SSR-only enforcement already in `biome.json`.
- [ ] Component test covers both render branches and the size-default behaviour.

### Regression Guardrails

- **No upstream-resolution bypass.** `AvatarLink.svelte` MUST NOT import `getProfile` or any `firebase/*` symbol. The host resolves profiles upstream and passes them in.
- **No raw `<a>` + `<img>` inlining at consumption sites.** Every avatar-linked profile citation goes through `AvatarLink`. Pages and other components MUST NOT pair `<a href="/profiles/{uid}">` with a bare image element or with a raw `<CnAvatar>` outside this primitive.
- **Anonymous fallback never emits an anchor.** The nullish branch produces no `<a>` element — it cannot accidentally link to `/profiles/undefined` or `/profiles/-`.
- **The `Profile` type import stays type-only.** `import type { Profile } from "@pelilauta/profiles/server"` — preventing accidental value imports that would drag server code into the component bundle.

### Testing Scenarios

#### Scenario: AvatarLink renders an avatar-linked anchor when given a profile

```gherkin
Given <AvatarLink profile={{ key: "uid-a", nick: "Ada", avatarURL: "https://x/ada.png" }}/> is rendered at SSR
When the page output is inspected
Then an <a> element targets href="/profiles/uid-a"
And the anchor's aria-label is "Ada"
And a CnAvatar element appears inside the anchor
And the CnAvatar receives nick="Ada" and src="https://x/ada.png"
```

#### Scenario: AvatarLink renders the bare avatar when profile is nullish

```gherkin
Given <AvatarLink profile={null}/> is rendered at SSR
When the page output is inspected
Then a CnAvatar element is emitted with no enclosing anchor
And the CnAvatar carries aria-hidden="true"
And no nick or src is forwarded to the CnAvatar

Given <AvatarLink/> (profile prop omitted) is rendered at SSR
When the page output is inspected
Then a CnAvatar element is emitted with no enclosing anchor
And the CnAvatar carries aria-hidden="true"
```

#### Scenario: AvatarLink defaults size to "small" and forwards an explicit size to CnAvatar

```gherkin
Given <AvatarLink profile={{ key: "uid-a", nick: "Ada" }}/> is rendered at SSR
When the page output is inspected
Then the inner CnAvatar receives size="small"

Given <AvatarLink profile={{ key: "uid-a", nick: "Ada" }} size="medium"/> is rendered at SSR
When the page output is inspected
Then the inner CnAvatar receives size="medium"
```

#### Scenario: AvatarLink omits avatarURL when the profile has none

```gherkin
Given a Profile with key, nick, and no avatarURL field
When AvatarLink renders that profile
Then the inner CnAvatar receives nick but no src
And CnAvatar's nick-derived background fallback is what the user sees
And the anchor still resolves to /profiles/{key}
```

## Migration Debt and Decisions

> Captured for the user's review during v20 implementation. NOT part of the v20 contract.

### Bugs / anomalies in the v17 source (do not propagate)

- **v17 takes a `uid` prop and auto-fetches via `getProfileAtom(uid)`.** Drops profile data into a `nanostores` cache and triggers a CSR Firestore read. v20 inverts this: profile resolution happens upstream in the host's Astro frontmatter via `getProfile(uid)`, and the component receives the resolved `Profile | null` as a prop. Identical pattern to `ProfileLink`. This is the same decision documented in the parent profiles spec; carrying forward AvatarLink's v17 prop shape would re-introduce the per-render Firestore read that the parent spec explicitly removed.
- **v17 renders a `<cn-loader icon="avatar">` while the atom is loading.** v20 has no loading state — the parent has resolved the profile by SSR time. Drop the loader entirely. This simplifies the component to two render branches instead of three.
- **v17 uses `nick="A0"` as a magic placeholder string** on the anonymous branch. v20 omits the `nick` prop on the anonymous `CnAvatar` and lets the primitive's empty-state visual handle it. `"A0"` was a v17 affordance that piggybacked on the deterministic-hash background of cn-avatar 4 — `CnAvatar` v20 already has a nick-less fallback, so the magic string is redundant.
- **v17 passes `elevation="1"` to `cn-avatar`.** v20 lifts elevation into `CnAvatar` itself: every avatar always carries `--cn-shadow-elevation-1` ([`../../cyan-ds/components/cn-avatar/spec.md`](../../cyan-ds/components/cn-avatar/spec.md) §Always-on elevation). The prop is gone but the visual is preserved — `AvatarLink` inherits the lift without configuring it.

### Decisions for v20

1. **Default size = `"small"`.** v17 hardcodes `size="small"` on the inner `cn-avatar` because byline avatars are visually downscaled. v20 makes it the default but allows callers to pass `size="medium"` for surfaces that want a larger avatar (future profile cards, comment headers, etc.). Open question: should `size` accept additional values someday? Out of scope for the MVP.
2. **`aria-hidden` on the anonymous branch.** The bare `CnAvatar` is decorative — there is nothing to link to and no identity to announce. `aria-hidden="true"` keeps screen readers from announcing it as a meaningful element. Alternative: `role="presentation"`. Picked `aria-hidden` because it also suppresses the element's children from the accessibility tree. Confirm this is the desired behaviour.
3. **No `anonymousLabel` prop.** Unlike `ProfileLink`, `AvatarLink` shows no text — the anonymous fallback is a visual placeholder, not a label. No translatable string is needed.
4. **No combined `AvatarLinkedProfileLink` primitive.** Consumers that want avatar + nick render two siblings inside a parent layout. Decision rationale: the two components have different consumption patterns (avatar at the start of a byline, nick possibly elsewhere), and a combined component would constrain layout choices. Easier to compose at the call site.
