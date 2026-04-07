# Feature: ProfileButton

> Reversed from: `pelilauta-17/src/components/svelte/app/SettingNavigationButton.svelte`

## Blueprint

### Context
An auth-aware navigation button placed in the `AppBar` trailing-action slot. It switches between login prompt, loading skeleton, and authenticated avatar based on session state. This is the single entry point for identity navigation in all Cyan apps.

### Architecture
- **Component:** `packages/cyan/src/components/ProfileButton.svelte` (CSR — requires reactive session state via nanostores, Svelte 5 runes).
- **Props:**
  - `loading?: boolean` — Session is rehydrating.
  - `nick?: string` — Authenticated user's display name.
  - `photoURL?: string` — Authenticated user's avatar image URL.
  - `loginHref?: string` — Anonymous login destination (default: `/login`).
  - `settingsHref?: string` — Authenticated settings destination (default: `/settings`).
- **Dependencies:**
  - `CnAvatar` ([spec](../cn-avatar/spec.md)) — renders the authenticated state visual.
  - `CnIcon` — renders the login icon for anonymous state.
  - Tokens: `--cn-grid`, `--cn-link` (focus ring), `--cn-hover`, `--cn-surface-1`.
  - Consumed by: `AppBar` default slot ([spec](../app-bar/spec.md)).

### Visual States

| State | Condition | Renders | Behavior |
|---|---|---|---|
| **Loading** | `loading` is true | Circular skeleton pulse (CSS animation, `--cn-surface-2` tint) | Non-interactive, no link |
| **Authenticated** | `nick` is set | `<a>` wrapping `CnAvatar` with `nick`/`photoURL` | Links to `settingsHref` |
| **Anonymous** | Default | `<a>` with `CnIcon noun="login"` | Links to `loginHref` |

### Anti-Patterns (from v17)
- **Hardcoded routes** — v17 hardcodes `/settings` and `/login`. v20 accepts href props so the DS component is app-agnostic.
- **Loader web component** — v17 uses `<cn-loader small>`. v20 uses a CSS-only skeleton pulse — no component dependency for a transient loading state.
- **Store coupling in DS** — v17 imports session stores directly. v20 ProfileButton accepts props; the app layer wires stores to props via Svelte 5 `$props()`.

### Book Page
- **Target path:** `app/cyan-ds/src/content/components/profile-button.mdx`
- **Structure:**
  - **Overview** — Purpose and placement (AppBar trailing slot).
  - **State Demo** — Loading, authenticated, anonymous states side-by-side (use static props, no real auth).
  - **Props Table** — All props documented.
  - **Integration Example** — Shows how an app wires nanostores to ProfileButton props.
  - **CSS Token Reference** — Lists consumed `--cn-*` tokens.

## Contract

### Definition of Done
- [ ] Renders loading skeleton when `loading` is true.
- [ ] Renders login link with icon when anonymous (no `nick`).
- [ ] Renders avatar link when authenticated (`nick` is set).
- [ ] `loginHref` and `settingsHref` are configurable with sensible defaults.
- [ ] Loading state is non-interactive (no anchor element rendered).
- [ ] Fits within `AppBar` trailing-action slot without layout overflow.
- [ ] Focus ring visible on keyboard navigation (both anonymous and authenticated links).
- [ ] No deprecated tokens.
- [ ] Documentation page exists with state demos.

### Regression Guardrails
- Must never render a link during loading state.
- Must never import session stores directly — props only.
- Skeleton size must match `CnAvatar` medium size (48px) to prevent layout shift on state transition.

### Testing Scenarios

#### Scenario: Anonymous Login State
```gherkin
Given a ProfileButton with no nick and loading=false
Then a link to the login page is rendered
And a login icon is visible
And the link is keyboard-focusable with a visible focus ring
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/profile-button.spec.ts`

#### Scenario: Authenticated Profile State
```gherkin
Given a ProfileButton with nick="Charlie" and photoURL="https://example.com/avatar.jpg"
Then a CnAvatar is rendered with the provided nick and src
And the element links to the settings page
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/profile-button.spec.ts`

#### Scenario: Loading Skeleton
```gherkin
Given a ProfileButton with loading=true
Then a circular skeleton placeholder is visible
And no anchor element is present in the DOM
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/profile-button.spec.ts`

#### Scenario: No Layout Shift on Transition
```gherkin
Given a ProfileButton transitioning from loading to authenticated
Then the component's bounding box dimensions remain constant (48px x 48px)
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/profile-button.spec.ts`
