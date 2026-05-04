---
feature: MembershipBadge Component
status: draft
maturity: design
last_major_review: 2026-05-04
parent_spec: ../spec.md
---

# Feature: MembershipBadge Component

> Reverse-spec'd from
> `.tmp/pelilauta-17/src/components/svelte/sites/SiteOwnerToken.svelte`
> with a v20 expansion to cover player membership too. v18 only
> ships an owner badge; v20 unifies owner + player into a single
> `MembershipBadge` component that picks the right icon based on
> the viewer's relationship to the site.

## Blueprint

### Context

`MembershipBadge` is a CSR-only indicator that signals the
current viewer's relationship to a `Site`:

- **Owner** — `$uid` is in `site.owners`. Renders cyan icon
  `avatar` (carry-forward from v18).
- **Player** — `$uid` is in `site.players` AND not in
  `site.owners`. Renders cyan icon `meeple`. (An owner who is
  also listed as a player shows the owner badge only — matches
  v18's `SitePlayersTool` derivation.)
- **Stranger** — viewer is in neither array, or no viewer is
  present at all. Renders nothing.

The badge is a self-membership indicator ("you are a member of
this site"), not a byline. It surfaces no name, nick, avatar
image, or profile link.

### Architecture

- **Component:** `packages/sites/src/components/MembershipBadge.svelte`
  — Svelte 5, runes (`$props`, `$derived`).
- **Mount.** CSR-only. Callers gate the mount on session
  presence (typically via `Astro.locals.session` in Astro
  frontmatter, then `<MembershipBadge … client:idle />` only
  when authenticated). Cross-site contract is owned by callers
  — see [`../site-card.md`](../site-card.md) for the canonical
  consumer pattern. The badge does not re-validate the gate.
- **Session source.** Imports `uid` from
  `@pelilauta/auth/client` (an `atom<string | null>` nanostore)
  and reads it reactively as `$uid` post-hydration.

#### Props

```ts
interface MembershipBadgeProps {
  owners: readonly string[];   // site.owners
  players: readonly string[];  // site.players ?? [] — caller pre-coerces
}
```

#### Render logic

```ts
import { uid } from "@pelilauta/auth/client";
// inside the Svelte component:
const role = $derived(
  !$uid                    ? 'none'
  : owners.includes($uid)  ? 'owner'
  : players.includes($uid) ? 'player'
  :                          'none'
);
```

- `role === 'owner'` → `<CnIcon noun="avatar" size="small" />`.
- `role === 'player'` → `<CnIcon noun="meeple" size="small" />`.
- `role === 'none'` → empty fragment.

#### Constraints

- **Caller gates the mount.** The badge does not re-validate
  the session; callers MUST emit `client:idle` only on
  authenticated requests. Mounting on an anonymous request
  ships JS unnecessarily and breaks the front-page
  anonymous-zero-JS contract (see
  [`../../front-page/spec.md`](../../front-page/spec.md)
  §Regression Guardrails).
- **Apps never override the DS.** No `<style>`, no inline
  styles, no app-local utility classes. Only `CnIcon` from
  cyan, with the documented nouns.

### Dependencies

- `@pelilauta/cyan` — `CnIcon.svelte`. Both `avatar` and
  `meeple` nouns are registered in
  `packages/pelilauta-icons/src/index.ts`.
- `@pelilauta/auth/client` — exports the `uid` nanostore atom.

### Consumers

- [`../site-card.md`](../site-card.md) — mounts the badge in
  the card actions slot when `isAuthenticated === true`.

## Contract

### Definition of Done

- [ ] `packages/sites/src/components/MembershipBadge.svelte`
      exists and exports a Svelte 5 component matching the
      §Props interface.
- [ ] The component imports `uid` from `@pelilauta/auth/client`
      and reads it reactively as `$uid`.
- [ ] When `$uid` is in `owners`, a single
      `<CnIcon noun="avatar" size="small" />` renders.
- [ ] When `$uid` is in `players` AND not in `owners`, a
      single `<CnIcon noun="meeple" size="small" />` renders.
- [ ] When `$uid` is in both arrays, only the owner icon
      renders (player derivation: `players` minus `owners`).
- [ ] When `$uid` is in neither array OR is absent, the
      component renders an empty fragment.
- [ ] The component contains no `<style>`, no inline styles,
      no app-local classes.

### Testing Scenarios

#### Scenario: Owner viewer sees the owner icon

```gherkin
Given $uid is "u-alice"
And owners = ["u-alice"], players = ["u-alice", "u-bob"]
When MembershipBadge hydrates
Then exactly one <CnIcon> renders with noun="avatar" and size="small"
And no <CnIcon noun="meeple"> renders
```

#### Scenario: Player viewer (not owner) sees the player icon

```gherkin
Given $uid is "u-bob"
And owners = ["u-alice"], players = ["u-bob"]
When MembershipBadge hydrates
Then exactly one <CnIcon> renders with noun="meeple" and size="small"
And no <CnIcon noun="avatar"> renders
```

#### Scenario: Viewer in both arrays sees only the owner icon

```gherkin
Given $uid is "u-alice"
And owners = ["u-alice"], players = ["u-alice"]
When MembershipBadge hydrates
Then exactly one <CnIcon> renders with noun="avatar"
And no <CnIcon noun="meeple"> renders
```

#### Scenario: Stranger viewer sees nothing

```gherkin
Given $uid is "u-charlie"
And owners = ["u-alice"], players = ["u-bob"]
When MembershipBadge hydrates
Then the component renders an empty fragment
```

#### Scenario: No viewer (no session) sees nothing

```gherkin
Given $uid is null
And owners = ["u-alice"], players = ["u-bob"]
When MembershipBadge hydrates
Then the component renders an empty fragment
```
