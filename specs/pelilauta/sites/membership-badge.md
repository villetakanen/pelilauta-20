---
feature: MembershipBadge Component
status: draft
maturity: design
last_major_review: 2026-05-04
parent_spec: ./spec.md
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

`MembershipBadge` is a small CSR-only indicator that signals the
current viewer's relationship to a `Site`:

- **Owner** — the viewer's uid is in the site's `owners` array.
  The badge renders the cyan icon `avatar` (carrying v18
  forward).
- **Player** — the viewer's uid is in the site's `players`
  array AND not in `owners`. The badge renders the cyan icon
  `meeple`. (An owner who is also listed as a player shows the
  owner badge only — this matches the v18 derivation in
  `.tmp/pelilauta-17/src/components/svelte/sites/SitePlayersTool.svelte`
  that filters listed players to "those not in owners.")
- **Stranger** — the viewer is in neither array, or no viewer
  is present at all. The badge renders nothing.

It is a self-membership indicator, not a byline: the badge tells
the viewer "you are a member of this site," not "this site has
these owners." The component never displays an owner's name,
nick, avatar image, or profile link.

### Architecture

- **Component:**
  `packages/sites/src/components/MembershipBadge.svelte` —
  Svelte 5 component, authored with runes (`$props`,
  `$derived`).
- **Mount mechanism: CSR-only.** The badge reads the viewer's
  uid from a session store after hydration; there is nothing
  to render server-side because the SSR has no per-viewer
  state. Callers MUST mount the badge with `client:idle` (or
  another `client:*` directive); rendering it inline as part
  of an Astro server component would produce nothing useful.
- **Mount discipline (caller's responsibility).** Callers MUST
  emit the badge only when the request carries an authenticated
  session — typically by branching on
  `Astro.locals.session` in the page's frontmatter and
  conditionally including the `<MembershipBadge … client:idle />`
  fragment. This is enforced at the consumer layer (e.g.
  [`site-card.md`](./site-card.md) gates the mount on its
  `isAuthenticated` prop). The badge component itself does not
  re-validate the gate — it trusts the caller.
- **Session source.** On hydration, the component reads the
  viewer's uid from the session store exposed by
  `@pelilauta/auth` (the v20 equivalent of v18's
  `src/stores/session.ts` nanostore). The exact import path is
  determined by `packages/auth`'s public surface; this spec
  references the dependency, not the path.

#### Props

```ts
interface MembershipBadgeProps {
  owners: readonly string[];   // site.owners
  players: readonly string[];  // site.players ?? []
}
```

The badge takes only the two membership arrays. It derives the
viewer's role internally; it never receives the viewer's uid as
a prop (reading it from the session store at hydration time is
the whole point of being a CSR island).

#### Render logic (post-hydration)

```ts
const uid = $sessionUid;          // reactive, from @pelilauta/auth's session store
const role = $derived(
  !uid                  ? 'none'
  : owners.includes(uid) ? 'owner'
  : players.includes(uid) ? 'player'
  :                       'none'
);
```

- `role === 'owner'` → render `<CnIcon noun="avatar" small />`.
- `role === 'player'` → render `<CnIcon noun="meeple" small />`.
- `role === 'none'` → render nothing (an empty fragment).

The badge is reactive to session changes — if the viewer logs
out post-hydration, the badge disappears; if they log in, the
appropriate badge appears. (This reactivity is a consequence of
reading from the session nanostore, not a separately specified
behaviour.)

#### Constraints

- **CSR-only.** The component must not produce meaningful
  server-rendered output. SSR may render the empty
  pre-hydration shell, but the badge state is computed only
  after hydration.
- **No per-viewer SSR.** The component does not exist on the
  SSR side. Callers MUST NOT try to "pre-resolve" the badge
  state and pass it as a prop — that would defeat the
  shared-cache contract on consuming pages (where the SSR HTML
  is identical across viewers and the badge differentiation
  happens only after hydration).
- **No owner identity rendered as text.** The badge displays
  an icon only — never a name, nick, avatar image, or profile
  link. Different feature, different surface.
- **No write paths.** The badge is read-only; it observes
  membership state but never mutates it. Owner / player
  management lives in future authoring sub-specs (see
  [`./spec.md`](./spec.md) §Authoring DoD).
- **Player derivation matches v18.** A viewer who is in both
  `owners` and `players` shows as an owner only — never two
  badges, never the player badge, never both icons rendered
  side-by-side.
- **Apps never override the DS.** No `<style>` block, no
  inline `style="..."`, no app-local utility class. Only
  `CnIcon` from cyan, with the documented nouns.

### Dependencies

- `@pelilauta/cyan` — `CnIcon.svelte` (consumed for both the
  `avatar` and `meeple` nouns; both nouns must exist in the
  cyan icon set or escalate to `packages/cyan/`).
- `@pelilauta/auth` — session store from which the viewer's
  uid is read post-hydration.

### Consumers (initial)

- `SiteCard` per [`site-card.md`](./site-card.md) — mounts
  the badge inside the card's actions slot when
  `isAuthenticated === true`.
- Any future sites surface that wants a "you are a member of
  this site" indicator. The badge is not card-specific; it
  works inside any container that gives it room for a small
  icon.

## Contract

### Definition of Done

- [ ] `packages/sites/src/components/MembershipBadge.svelte`
      exists and exports a Svelte 5 component matching the
      §Props interface above.
- [ ] On hydration, the component reads the viewer's uid from
      `@pelilauta/auth`'s session store reactively.
- [ ] When the viewer's uid is in `owners`, a single
      `<CnIcon noun="avatar" small />` renders.
- [ ] When the viewer's uid is in `players` AND not in
      `owners`, a single `<CnIcon noun="meeple" small />`
      renders.
- [ ] When the viewer's uid is in both `owners` and `players`,
      only the owner icon renders (player derivation: `players`
      minus `owners`).
- [ ] When the viewer's uid is in neither array, nothing
      renders (an empty fragment).
- [ ] When no viewer is present (uid is empty / null /
      undefined), nothing renders.
- [ ] The component contains no `<style>` block, no inline
      `style="..."` attribute, and no app-local utility
      classes anywhere in its template.
- [ ] The component never imports from
      `@pelilauta/firebase/server` or otherwise depends on a
      server SDK.
- [ ] `pnpm check:types` passes against the
      `MembershipBadgeProps` shape.

### Regression Guardrails

- The component MUST NOT render the player icon when the
  viewer is in both `owners` and `players` — that would
  visually contradict the "owner is the strongest membership
  signal" rule and diverge from v18's `SitePlayersTool`
  derivation.
- The component MUST NOT receive the viewer's uid as a prop.
  Pre-resolving the uid upstream and threading it through
  defeats the shared-cache contract on consuming pages and
  reverses the CSR-only design.
- The component MUST NOT render any owner identity text or
  link — adding a byline-shaped affordance is a different
  feature.
- The badge MUST NOT mount on an unauthenticated request. The
  enforcement lives in callers (see [`site-card.md`](./site-card.md)
  for the `isAuthenticated` gate); the badge component does
  not validate this itself, so a caller bypassing the gate is
  a regression at the consumer layer.

### Testing Scenarios

#### Scenario: Owner viewer sees the owner icon

```gherkin
Given the session store reports uid "u-alice"
And owners = ["u-alice"], players = ["u-alice", "u-bob"]
When MembershipBadge hydrates
Then exactly one <CnIcon> renders with noun="avatar" and small=true
And no <CnIcon noun="meeple"> renders
```

#### Scenario: Player viewer (not owner) sees the player icon

```gherkin
Given the session store reports uid "u-bob"
And owners = ["u-alice"], players = ["u-bob"]
When MembershipBadge hydrates
Then exactly one <CnIcon> renders with noun="meeple" and small=true
And no <CnIcon noun="avatar"> renders
```

#### Scenario: Viewer in both arrays sees only the owner icon

```gherkin
Given the session store reports uid "u-alice"
And owners = ["u-alice"], players = ["u-alice"]
When MembershipBadge hydrates
Then exactly one <CnIcon> renders with noun="avatar"
And no <CnIcon noun="meeple"> renders
```

#### Scenario: Stranger viewer sees nothing

```gherkin
Given the session store reports uid "u-charlie"
And owners = ["u-alice"], players = ["u-bob"]
When MembershipBadge hydrates
Then the component renders an empty fragment
And no <CnIcon> appears in the badge subtree
```

#### Scenario: No viewer (no session) sees nothing

```gherkin
Given the session store reports no uid (empty / null / undefined)
And owners = ["u-alice"], players = ["u-bob"]
When MembershipBadge hydrates
Then the component renders an empty fragment
```

#### Scenario: Reactive update on session change

```gherkin
Given a hydrated MembershipBadge with owners = ["u-alice"], players = ["u-bob"]
And the session store reports uid "u-bob"
When the session store updates to uid "u-alice"
Then the badge re-renders to show <CnIcon noun="avatar"> instead of <CnIcon noun="meeple">
```

#### Scenario: No write paths

```gherkin
Given a hydrated MembershipBadge
When the user interacts with the rendered icon (click, keyboard activation)
Then no Firestore write is issued
And no API request is made
And the icon is not interactive (no link, no button — pure indicator)
```
