---
feature: FAB
parent_spec: specs/cyan-ds/core/spec.md
stylebook_url: https://cyan.pelilauta.social/core/fab
---

# Feature: FAB

## Blueprint

### Context

Floating Action Buttons (FABs) are circular, elevated buttons reserved for
the primary contextual action in a view — "create thread", "add item", or
similar high-frequency actions that warrant persistent, surface-floating
affordance. There is no `CnFab` Svelte or Astro component: consumers
apply `.fab` as a modifier class to a native `<button class="fab">` or an
anchor `<a class="button fab">`. This keeps the FAB layer 100%
SSR-compatible and progressive (ADR-001) — a FAB on an unhydrated page is
already correctly styled and tappable.

Reversed from
[`villetakanen/cyan-design-system-4`](https://github.com/villetakanen/cyan-design-system-4/blob/main/packages/cyan-css/src/core/fab.css).
The gradient colour-space has been updated from `in lch` (cyan-4) to
`in oklab` (v20 convention, matching `buttons.css`).

### Architecture

- **Components:**
  - Global stylesheet `packages/cyan/src/core/fab.css` imported from
    the DS CSS entry (`packages/cyan/src/core/index.css`). No wrapper
    component. Consumers write semantic HTML — `<button class="fab">` for
    in-page actions, `<a class="button fab" href="…">` for navigational
    ones — and the DS styles them.
- **Data Models:** N/A (presentational).
- **API Contracts (CSS surface consumers may rely on):**
  - **Selectors:** `button.fab`, `a.fab`, `a.button.fab` (base).
  - **Variants:** `.cta` / `.call-to-action` (CTA synonym for cyan-4
    compat), `.secondary`, `.small`.
  - **Inner slot elements:** `.cn-icon` (rendered by the `CnIcon` Svelte
    component) and `.cn-loader` (rendered by `CnLoader`). Targeted by
    class, not by element tag.
  - **States:** `:hover` (lifts elevation), `:active` (lowers elevation).
- **Dependencies:**
  - `packages/cyan/src/tokens/units.css`: `--cn-fab-size` (7 × grid),
    `--cn-grid`, `--cn-border-radius-large`, `--cn-button-size`,
    `--cn-icon-size-small`.
  - `packages/cyan/src/tokens/semantic.css`: `--cn-shadow-elevation-1`,
    `--cn-shadow-elevation-2`, `--cn-shadow-elevation-4`,
    `--cn-fab`, `--cn-fab-blend`, `--cn-on-fab`,
    `--cn-fab-cta`, `--cn-fab-cta-blend`, `--cn-on-fab-cta`,
    `--cn-fab-secondary`, `--cn-fab-secondary-blend`,
    `--cn-on-fab-secondary`, `--cn-surface`,
    `--cn-surface`, `--cn-on-surface`, `--cn-duration-ui`, `--cn-easing-ui`.
- **Constraints:**
  - Zero JavaScript. Styling is pure CSS; the FAB works before hydration.
  - Only `--cn-*` tokens are referenced; no `--color-*` or `--cyan-*`.
  - **Gradient colour-space is `in oklab`** (not `in lch` as in cyan-4).
    The `137deg` angle for the default and CTA surfaces and `-37deg` for
    the secondary surface are preserved from cyan-4.
  - Circle shape is derived from `--cn-border-radius-large` applied to a
    square `--cn-fab-size × --cn-fab-size` bounding box.
  - Hover interaction lifts elevation to `--cn-shadow-elevation-4`.
  - Active interaction drops elevation to `--cn-shadow-elevation-2`.
  - FABs must **never grow** inside flex or grid containers.
    `flex: 0 0 auto` is declared on both the base rule and on
    element+class selector overrides to win over generic `.flex > *` rules.
  - No `filter: brightness()` for state feedback.
  - Anchor-as-FAB must suppress `text-decoration`.
  - **FAB always carries an icon.** The leading child of every FAB is a
    `<CnIcon noun="…" />`. An optional trailing `<span>` label may follow
    on roomy viewports; icon-only is the compact form. A FAB without an
    icon is a regression — use a regular `.button` if there is no glyph
    to convey the action. The icon stays at `--cn-icon-size-small`
    (inherited from buttons.css's leading-glyph rules) regardless of any
    `size` prop on `CnIcon`.

### Book Page

- **Target path:** `app/cyan-ds/src/content/core/fab.mdx`, rendered at
  URL `/core/fab`. Path mirrors the source location
  (`packages/cyan/src/core/fab.css`) and this spec's location
  (`specs/cyan-ds/core/fab/`).
- **Structure:** mirrors `app/cyan-ds/src/content/core/buttons.mdx`:
  1. Intro paragraph.
  2. `ThemeSplit` demo block showing all variants side-by-side in both
     themes (default, CTA, secondary, small, anchor).
  3. HTML usage snippets for `button.fab`, `a.button.fab`, `.cta`,
     `.secondary`, `.small`.
  4. Accessibility notes (`aria-label` required for icon-only FABs).
  5. Guidelines (when to use FABs vs regular buttons).
- **Imports:** `ThemeSplit`, `CnIcon`, `CnLoader` from existing patterns
  in `buttons.mdx`. No inline styles in prose or content (DS exception:
  demo-swatch wrappers may use inline styles).

## Contract

### Definition of Done

- [ ] Stylesheet at `packages/cyan/src/core/fab.css` is imported from
      `packages/cyan/src/core/index.css`.
- [ ] Only `--cn-*` tokens are referenced. No `--color-*`, `--cyan-*`,
      hardcoded colours, or `filter: brightness()`.
- [ ] `.fab` produces a circular elevated control of `--cn-fab-size`
      diameter (`min-width: var(--cn-fab-size); height: var(--cn-fab-size);
      border-radius: var(--cn-border-radius-large)`).
- [ ] `.fab.cta` (and synonym `.fab.call-to-action`) renders the CTA
      gradient using `--cn-fab-cta` → `--cn-fab-cta-blend` and colours
      text with `--cn-on-fab-cta`.
- [ ] `.fab.secondary` renders a recessive dark-blue → blue gradient using
      `--cn-fab-secondary` → `--cn-fab-secondary-blend`, with foreground
      `--cn-on-fab-secondary`. There is no `.text` variant for FAB — if the
      action doesn't warrant an elevated surface, use a regular `.button`.
- [ ] `.fab.small` collapses to `--cn-button-size` for both `min-width`
      and `height`.
- [ ] Hover lifts elevation to `--cn-shadow-elevation-4`; active drops to
      `--cn-shadow-elevation-2`.
- [ ] Anchor-as-FAB (`a.button.fab`) renders identically to `button.fab`
      (`text-decoration: none` is applied).
- [ ] Inside `.flex > .fab`, the FAB does **not** stretch — `flex: 0 0 auto`
      is declared with sufficient specificity to win over `.flex > *`
      generic rules.
- [ ] `--cn-fab` and `--cn-on-fab` are declared in
      `packages/cyan/src/tokens/semantic.css` as FAB-specific semantic
      surface/foreground tokens (not shared with `--cn-button*`). The default
      ramp resolves to a vibrant neon accent in both themes.
- [ ] `--cn-fab-size` (`calc(var(--cn-grid) * 7)`) is declared in
      `packages/cyan/src/tokens/units.css`.
- [ ] Book page at `app/cyan-ds/src/content/core/fab.mdx` exists and
      demonstrates all variants.
- [ ] `FrontpageFabs.svelte` and anonymous branch of `index.astro` use
      `class="button fab"` (anchor) / `class="fab"` (button).

### Regression Guardrails

- Circle shape must never become a rounded rectangle: border-radius must
  be `var(--cn-border-radius-large)` applied to a square bounding box
  defined by `--cn-fab-size`. A frozen pixel value is a regression.
- No `--color-*` or `--cyan-*` custom property may appear in `fab.css`.
- FABs must never grow in flex containers — `flex: 0 0 auto` overrides
  must be present at both generic (`.flex > .fab`) and element+class
  specificity levels.
- Gradient colour-space must be `in oklab` (not `in lch`). The `in lch`
  form from cyan-4 must not be re-introduced.

### Testing Scenarios

#### Scenario: Bare FAB adopts elevated circular shape

```gherkin
Given the DS stylesheet is loaded on a page
When a consumer renders `<button class="fab"></button>` with no extra classes
Then the element has min-width and height equal to --cn-fab-size
And border-radius is derived from --cn-border-radius-large
And box-shadow references --cn-shadow-elevation-1
And no --color-* or --cyan-* custom property is read by the element
```

- **Vitest Unit Test:** `packages/cyan/src/core/fab.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/core/fab.spec.ts`

#### Scenario: CTA variant

```gherkin
Given a FAB with class `cta` (i.e. `button.fab.cta`)
When it is rendered
Then its background gradient references --cn-fab-cta and --cn-fab-cta-blend
And its text colour equals --cn-on-fab-cta
And the gradient angle is 137deg in oklab
```

- **Vitest Unit Test:** `packages/cyan/src/core/fab.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/core/fab.spec.ts`

#### Scenario: call-to-action synonym

```gherkin
Given a FAB with class `call-to-action` (i.e. `button.fab.call-to-action`)
When it is rendered
Then it applies the same background gradient as `button.fab.cta`
```

- **Vitest Unit Test:** `packages/cyan/src/core/fab.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/core/fab.spec.ts`

#### Scenario: Secondary variant

```gherkin
Given a FAB with class `secondary` (i.e. `button.fab.secondary`)
When it is rendered
Then its background gradient references --cn-fab-secondary and --cn-fab-secondary-blend
And its text colour equals --cn-on-fab-secondary
```

- **Vitest Unit Test:** `packages/cyan/src/core/fab.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/core/fab.spec.ts`

#### Scenario: Small variant

```gherkin
Given a FAB with class `small` (i.e. `button.fab.small`)
When it is rendered
Then its height and min-width collapse to --cn-button-size
And border-radius remains --cn-border-radius-large
```

- **Vitest Unit Test:** `packages/cyan/src/core/fab.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/core/fab.spec.ts`

#### Scenario: Anchor FAB renders identically to button FAB

```gherkin
Given an `<a class="button fab" href="/create">` element
When it is rendered
Then it displays the same shape, gradient, and elevation as `button.fab`
And text-decoration is none
```

- **Vitest Unit Test:** `packages/cyan/src/core/fab.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/core/fab.spec.ts`

#### Scenario: FAB does not grow inside flex containers

```gherkin
Given a parent element with class `flex`
And a child `button.fab` inside it
When the parent distributes space to its children
Then the FAB retains its fixed --cn-fab-size dimensions
And does not stretch to fill remaining space (flex: 0 0 auto)
```

- **Vitest Unit Test:** `packages/cyan/src/core/fab.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/core/fab.spec.ts`
