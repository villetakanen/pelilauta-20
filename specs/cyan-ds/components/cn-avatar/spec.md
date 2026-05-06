# Feature: CnAvatar

> Reversed from: `cyan-design-system-4/packages/cyan-lit/src/cn-avatar/cn-avatar.ts`

## Blueprint

### Context
A circular avatar primitive used across the platform wherever a user's visual identity is shown: AppBar profile button, thread cards, comment attribution, member lists. Renders an image, initials fallback, or generic icon placeholder — in that priority order. The avatar always carries a subtle visual lift (elevation-1 shadow) so it reads as a distinct identity token across surfaces.

### Architecture
- **Component:** `packages/cyan/src/components/CnAvatar.svelte` (Svelte 5 leaf — no user-facing interactivity; one `onerror` handler flips the image → fallback via reactive state).
- **Props:**
  - `src?: string` — Image URL. Lazy-loaded. Falls back on error.
  - `nick?: string` — Username. Used for initials (first 2 chars, uppercased) and deterministic background color.
  - `size?: 'small' | 'medium'` — `small`: `--cn-line * 1.5` (36px). `medium` (default): `--cn-line * 2` (48px).
  - `aria-hidden?: boolean | 'true' | 'false'` — Decorative-mode hatch. When truthy, suppresses `role="img"` and `aria-label` and emits `aria-hidden="true"` on the root. For hosts that wrap the avatar in their own labelled boundary (e.g. `AvatarLink`'s anonymous fallback).
- **Dependencies:**
  - `CnIcon` (for the generic placeholder icon, noun `"avatar"`).
  - Tokens: `--cn-grid`, `--cn-line`, `--cn-text`, `--cn-shadow-elevation-1`, chroma surface tokens for nick-based tinting.

### Rendering Priority

1. **Image** — `<img>` with `loading="lazy"`, `decoding="async"`. On error, JS fallback hides the image and reveals initials layer beneath.
2. **Initials** — First 2 characters of `nick`, uppercased, centered. Always present in DOM when `nick` is set (acts as fallback layer behind image).
3. **Icon** — `CnIcon noun="avatar"` when neither `src` nor `nick` is provided.

### Background Color

A deterministic hash of `nick` produces a consistent per-user background tint:
- Hash: sum of character codes, modulo 100.
- Applied via `color-mix(in oklch, var(--chroma-surface-30), var(--chroma-surface-60) {hash}%)`.
- When no `nick` is set, falls back to `var(--cn-surface-2)`.

### Elevation

The avatar always renders with `box-shadow: var(--cn-shadow-elevation-1)`. This is a structural choice, not an opt-in: every avatar across the platform carries the same subtle lift. v17 (cyan-4) exposed elevation as a numeric prop (`elevation="1"` / `elevation="2"`) which let callers vary the shadow per surface; v20 collapses that surface to a single always-on elevation. Callers that need a different elevation tier compose differently (e.g. wrap the avatar in a layer that owns its own shadow), they don't toggle it on the avatar.

### Constraints

- **OKLCH only.** Background tints use `color-mix(in oklch, ...)`. Older `color-mix(in hsl, ...)` from cyan-4 is not used; OKLCH is the v20 colour space.
- **Tokens are `--cn-*` only.** No `--color-*`, `--cyan-*`, or `--shadow-*` tokens appear in the component CSS.
- **No Shadow DOM.** v20 uses Astro SSR with global CSS. The component renders ordinary DOM nodes; there is no `:host` boundary.
- **Always-on elevation-1.** No `elevation` prop. The shadow is part of the primitive's identity; varying it per call site is the consumer's responsibility, not the avatar's API surface.
- **SSR-pure rendering.** No `onMount`, no browser-globals access. The single `$effect` resets the `imageErrored` reactive flag when `src` changes; it does not gate first paint.

### Book Page
- **Target path:** `app/cyan-ds/src/content/components/cn-avatar.mdx`
- **Structure:**
  - **Overview** — Purpose and usage contexts.
  - **Image Demo** — Avatar with a real image URL.
  - **Initials Demo** — Several nicks showing varied hash-derived background colors.
  - **Fallback Demo** — Avatar with no props (icon placeholder).
  - **Size Demo** — `small` vs `medium` side by side.
  - **Props Table** — All props documented.
  - **CSS Token Reference** — Lists consumed `--cn-*` tokens (including `--cn-shadow-elevation-1`).

## Contract

### Definition of Done
- [ ] Renders image when `src` is valid.
- [ ] Falls back to initials when image errors or `src` is empty.
- [ ] Falls back to icon when both `src` and `nick` are empty.
- [ ] Background color is deterministic per nick (same nick = same color, always).
- [ ] Both sizes render at correct dimensions.
- [ ] Every avatar instance carries `box-shadow: var(--cn-shadow-elevation-1)` via the `.cn-avatar` class — no prop, no opt-in.
- [ ] No deprecated tokens (`--color-*`, `--cyan-*`, `--shadow-*`).
- [ ] Documentation page exists with all demos.

### Regression Guardrails
- Must always be circular (`aspect-ratio: 1/1`, `border-radius: 50%`).
- Image error must silently fall back — no broken image icon visible.
- Nick hash must be pure (no randomness).
- No client-side JS except the minimal `onerror` handler for image fallback.
- The `.cn-avatar` class MUST resolve a non-`none` `box-shadow`. Removing the always-on elevation is a regression.
- The component MUST NOT expose an `elevation` prop. Re-introducing the cyan-4 prop shape would split the surface into per-call-site visual variants.

### Testing Scenarios

#### Scenario: Image with Error Fallback
```gherkin
Given a CnAvatar with src="valid-url.jpg" and nick="Alice"
When the image loads successfully
Then the image is displayed inside a circular frame

When the image fails to load
Then the initials "AL" are displayed instead
And no broken image indicator is visible
```

#### Scenario: Initials Display
```gherkin
Given a CnAvatar with nick="Bob" and no src
Then the text "BO" is rendered centered in the circle
And the background color is deterministic based on "Bob"
```

#### Scenario: Icon Placeholder
```gherkin
Given a CnAvatar with no src and no nick
Then a CnIcon with noun="avatar" is rendered
And the background is var(--cn-surface-2)
```

#### Scenario: Size Variants
```gherkin
Given a CnAvatar with size="small"
Then the frame dimensions are 36px x 36px

Given a CnAvatar with size="medium" (or default)
Then the frame dimensions are 48px x 48px
```

#### Scenario: Always-on elevation
```gherkin
Given a CnAvatar rendered in any branch (image, initials, or icon)
And size is either "small" or "medium"
When the .cn-avatar element's computed style is inspected
Then box-shadow resolves to a non-"none" value
And the offset matches the --cn-shadow-elevation-1 token's geometry
```
