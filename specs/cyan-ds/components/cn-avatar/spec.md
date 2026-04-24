# Feature: CnAvatar

> Reversed from: `cyan-design-system-4/packages/cyan-lit/src/cn-avatar/cn-avatar.ts`

## Blueprint

### Context
A circular avatar primitive used across the platform wherever a user's visual identity is shown: AppBar profile button, thread cards, comment attribution, member lists. Renders an image, initials fallback, or generic icon placeholder — in that priority order.

### Architecture
- **Component:** `packages/cyan/src/components/CnAvatar.svelte` (Svelte 5 leaf — no user-facing interactivity; one `onerror` handler flips the image → fallback via reactive state).
- **Props:**
  - `src?: string` — Image URL. Lazy-loaded. Falls back on error.
  - `nick?: string` — Username. Used for initials (first 2 chars, uppercased) and deterministic background color.
  - `size?: 'small' | 'medium'` — `small`: `--cn-line * 1.5` (36px). `medium` (default): `--cn-line * 2` (48px).
- **Dependencies:**
  - `CnIcon` (for the generic placeholder icon, noun `"avatar"`).
  - Tokens: `--cn-grid`, `--cn-line`, `--cn-text`, chroma surface tokens for nick-based tinting.

### Rendering Priority

1. **Image** — `<img>` with `loading="lazy"`, `decoding="async"`. On error, JS fallback hides the image and reveals initials layer beneath.
2. **Initials** — First 2 characters of `nick`, uppercased, centered. Always present in DOM when `nick` is set (acts as fallback layer behind image).
3. **Icon** — `CnIcon noun="avatar"` when neither `src` nor `nick` is provided.

### Background Color

A deterministic hash of `nick` produces a consistent per-user background tint:
- Hash: sum of character codes, modulo 100.
- Applied via `color-mix(in oklch, var(--chroma-surface-30), var(--chroma-surface-60) {hash}%)`.
- When no `nick` is set, falls back to `var(--cn-surface-2)`.

### Anti-Patterns (from v4)
- **`color-mix(in hsl)`** — v4 uses HSL. v20 is OKLCH-native.
- **Deprecated tokens** — v4 uses `--color-surface-4`, `--color-on-surface`, `--shadow-elevation-*`. Use `--cn-*` equivalents.
- **Lit Shadow DOM** — v20 uses Astro (SSR, global CSS, no Shadow DOM).
- **Elevation prop** — v4 avatar accepts `elevation` for box-shadow. v20 avatars should not carry elevation — the parent context controls elevation.

### Book Page
- **Target path:** `app/cyan-ds/src/content/components/cn-avatar.mdx`
- **Structure:**
  - **Overview** — Purpose and usage contexts.
  - **Image Demo** — Avatar with a real image URL.
  - **Initials Demo** — Several nicks showing varied hash-derived background colors.
  - **Fallback Demo** — Avatar with no props (icon placeholder).
  - **Size Demo** — `small` vs `medium` side by side.
  - **Props Table** — All props documented.
  - **CSS Token Reference** — Lists consumed `--cn-*` tokens.

## Contract

### Definition of Done
- [ ] Renders image when `src` is valid.
- [ ] Falls back to initials when image errors or `src` is empty.
- [ ] Falls back to icon when both `src` and `nick` are empty.
- [ ] Background color is deterministic per nick (same nick = same color, always).
- [ ] Both sizes render at correct dimensions.
- [ ] No deprecated tokens (`--color-*`, `--cyan-*`, `--shadow-*`).
- [ ] Documentation page exists with all demos.

### Regression Guardrails
- Must always be circular (`aspect-ratio: 1/1`, `border-radius: 50%`).
- Image error must silently fall back — no broken image icon visible.
- Nick hash must be pure (no randomness).
- No client-side JS except the minimal `onerror` handler for image fallback.

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
- **Vitest Unit Test:** `packages/cyan/src/components/CnAvatar.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/cn-avatar.spec.ts`

#### Scenario: Initials Display
```gherkin
Given a CnAvatar with nick="Bob" and no src
Then the text "BO" is rendered centered in the circle
And the background color is deterministic based on "Bob"
```
- **Vitest Unit Test:** `packages/cyan/src/components/CnAvatar.test.ts`

#### Scenario: Icon Placeholder
```gherkin
Given a CnAvatar with no src and no nick
Then a CnIcon with noun="avatar" is rendered
And the background is var(--cn-surface-2)
```
- **Vitest Unit Test:** `packages/cyan/src/components/CnAvatar.test.ts`

#### Scenario: Size Variants
```gherkin
Given a CnAvatar with size="small"
Then the frame dimensions are 36px x 36px

Given a CnAvatar with size="medium" (or default)
Then the frame dimensions are 48px x 48px
```
- **Vitest Unit Test:** `packages/cyan/src/components/CnAvatar.test.ts`
