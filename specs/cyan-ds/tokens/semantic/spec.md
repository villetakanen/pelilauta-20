# Feature: Semantic Color Tokens

> Reversed from: https://github.com/villetakanen/cyan-design-system-4/blob/main/packages/cyan-css/src/tokens/colors.css

Parent: [Cyan DS Tokens](../spec.md)

## Blueprint

### Context

Semantic color tokens map the raw chroma palette to functional UI roles (surface, text, border, interactive states). They use `light-dark()` for automatic light/dark theme switching, so components reference a single token that resolves to the correct value per color scheme. This layer sits between chroma (tonal palettes) and components — components never reference `--chroma-*` directly.

### Architecture

- **Source:** `packages/cyan-css/src/tokens/colors.css` (upstream: cyan-design-system-4)
- **v20 target:** `packages/cyan/src/tokens/semantic.css`
- **Format:** CSS custom properties on `:root`
- **Namespace:** `--color-*` for core semantic tokens
- **Dependencies:** [Chroma tokens](../chroma/spec.md) — all values derive from `--chroma-*` via `light-dark()` and `color-mix(in oklch)`

### Token Groups

#### Surfaces (backgrounds, cards, sheets)

| Token | Light | Dark | Role |
|---|---|---|---|
| `--color-surface` | `chroma-surface-10` | `chroma-surface-90` | Default surface |
| `--color-surface-1` | white | surface-90/80 blend | Elevated surface (level 1) |
| `--color-surface-2` | white | surface-80 | Elevated surface (level 2) |
| `--color-surface-3` | white | surface-80/70 blend | Elevated surface (level 3) |
| `--color-surface-4` | surface-50 | surface-70 | Elevated surface (level 4) |
| `--color-on-surface` | surface-90 | surface-10 | Text/icons on surface |
| `--color-on-surface-secondary` | surface-60 | surface-40 | Lower-emphasis text on surface |

#### Background (app shell, below surfaces)

| Token | Light | Dark | Role |
|---|---|---|---|
| `--color-background` | surface + surface-20 blend | surface-99 | App background |
| `--color-on-background` | surface-90 | surface-30 | Text on background |

#### Text

| Token | Light | Dark | Role |
|---|---|---|---|
| `--color-text` | surface-90 | surface-20 | Default body text |
| `--color-text-high` | black | white | Maximum contrast text |
| `--color-text-low` | surface-80 | surface-40 | De-emphasized text |
| `--color-text-heading` | surface-30 | surface-99 | H1 and H2 (Primary) |
| `--color-text-subheading` | surface-40 | surface-80 | H3 and H4 (Secondary) |

#### Links

| Token | Light | Dark | Role |
|---|---|---|---|
| `--cn-link` | primary-30 | primary-80 | Default content link |
| `--cn-link-hover` | primary-40 | primary-90 | Link hover |
| `--cn-link-active` | primary-50 | primary-20 | Link active/pressed |

> **Note:** Tray navigation components (TrayButton, TrayLink) use surface-tinted chroma tokens directly, not `--cn-link-*`. These semantic link tokens are for content-area inline links.

#### Buttons & Interactive

> **Namespace note [2026-04-17]:** The canonical namespace in v20 is
> `--cn-*`, not `--color-*` (see CLAUDE.md; the codebase at
> `packages/cyan/src/tokens/semantic.css` already uses `--cn-*`). The
> `--color-*` entries in the tables above are stale and should be renamed
> in a dedicated pass. The Button Foregrounds, Interaction Wash, Motion,
> and Button Shadow sub-sections below are authored in the correct
> `--cn-*` form.

**Container surfaces (existing):**

| Token | Light | Dark | Role |
|---|---|---|---|
| `--cn-button` | surface-50 | surface-40 | Default button fill — lower stop of the default gradient |
| `--cn-button-light` | primary-50 | primary-50 | Upper stop of the default gradient (unified across modes for a consistent sliding-colour signature) |
| `--cn-button-accent` | primary-20 | primary-70 | Accent / emphasized variant |
| `--cn-button-cta` | error-40 | error-40 | Call-to-action fill (destructive) |

**Button foregrounds (to be added):** every `--cn-button*` container is
paired with a foreground token that's been picked for AA contrast on that
container. The `.text` variant sits on surface rather than on a button
fill, so it continues to use `--cn-on-surface`.

| Token | Light | Dark | Pairs with | Role |
|---|---|---|---|---|
| `--cn-on-button` | surface-100 (white) | surface-100 (white) | `--cn-button`, `--cn-button-light`, `--cn-button-accent`, `.secondary` button | Label + icon color on the default gradient |
| `--cn-on-button-cta` | surface-100 (white) | surface-100 (white) | `--cn-button-cta` | Label + icon color on the CTA fill |

Exact chroma steps to be verified during implementation against contrast
audits — the shape of the pairing (container ↔ on-container) is the
contract; the step choice is tunable.

**Interaction wash (hover / active):**

| Token | Light | Dark | Role |
|---|---|---|---|
| `--cn-hover` (existing) | surface-50 @ 10% opacity | surface-50 @ 20% opacity | Hover overlay — composited over any interactive surface via a pseudo-element |
| `--cn-active` (to be added) | surface-50 @ 20% opacity | surface-50 @ 30% opacity | Active/pressed overlay — one step darker than `--cn-hover`, same composition model |

Interaction feedback is **additive overlay**, not `filter: brightness()`.
Overlays preserve label/icon colors (which stay locked to their
`--cn-on-*` token) and can be theme-tuned per mode.

**Button shadow (to be added):**

| Token | Value | Role |
|---|---|---|
| `--cn-shadow-button-hover` | alias of `--cn-shadow-elevation-2` | Hover/active shadow for buttons |

Named separately from the raw elevation scale so theme authors can retune
button elevation without touching every other elevated surface.

**Motion (to be added):** shared by every interactive component, not
button-specific — lives in the semantic layer so hover/active/focus
transitions look consistent across the DS.

| Token | Value | Role |
|---|---|---|
| `--cn-duration-ui` | `0.22s` | Default duration for interactive state transitions |
| `--cn-easing-ui` | `ease-in-out` | Default easing curve for interactive state transitions |

#### Borders

| Token | Light | Dark | Role |
|---|---|---|---|
| `--color-border` | surface-40 | surface-70 | Default border |
| `--color-border-hover` | surface-50 | surface-60 | Border hover |
| `--color-border-focus` | primary-70 | primary-40 | Focus ring |

#### Functional / Status

| Token | Light | Dark | Role |
|---|---|---|---|
| `--color-success` | primary-60 | primary-60 | Success state |
| `--color-warning` | chroma-warning-{step} | chroma-warning-{step} | Warning state |
| `--color-error` | chroma-error-{step} | chroma-error-{step} | Error/destructive state |
| `--color-info` | chroma-info-{step} | chroma-info-{step} | Informational accent |

Exact steps TBD during implementation — the semantic layer picks the steps that give appropriate contrast for each theme.

#### Inputs / Forms

| Token | Light | Dark | Role |
|---|---|---|---|
| `--color-input` | surface-20 | surface-95 | Input background |
| `--color-on-input` | on-surface | on-surface | Input text |
| `--color-input-hover` | surface-30 | surface-99 | Input hover background |
| `--color-input-focus` | surface-30 | surface-99 | Input focus background |
| `--color-input-disabled` | surface-20 | surface-80 | Disabled input |

#### Elevation

| Token | Role |
|---|---|
| `--cn-shadow-color` | Shadow color (light-dark from surface palette) |
| `--color-elevation-1/2/3` | Aliases to surface levels for elevation system |

### Migration Notes

- **Drop the `--cn-color-*` legacy aliases** — upstream has a parallel set (`--cn-color-primary`, `--cn-color-surface`, etc.) that are backward-compat shims mapping to the same `--color-*` values. v20 should only ship the `--color-*` namespace.
- **Accent colors are now stepped palettes in chroma** — `--chroma-error-{step}`, `--chroma-warning-{step}`, `--chroma-info-{step}`, `--chroma-love-{step}`. The semantic layer maps specific steps to functional roles via `light-dark()`.
- **`light-dark()` requires `color-scheme`** — the `<html>` or `:root` must declare `color-scheme: light dark` for `light-dark()` to work. Base.astro should set this.
- **Upstream uses `white` as a literal** — surface levels 1–3 use `white` in light mode instead of `--chroma-surface-100`. Use `--chroma-surface-100` so the entire system derives from the same palette.
- **Component-specific tokens should move out** — `--color-bubble`, `--color-reply-bubble`, `--cn-color-avatar-*` are DS component tokens (bubble, avatar). In v20, they belong in each component's own CSS with their own `light-dark()` derivations, not in the shared semantic layer.
- **`--color-reaction-red` is replaced by `--chroma-love-{step}`** — the hardcoded hex moves to chroma as a proper tonal scale. The semantic layer references the appropriate step.

### Constraints

- Components reference semantic tokens, not `--chroma-*` directly — theme
  switching works only through the semantic layer.
- This file holds shared semantic roles only; component-specific color
  tokens live with their component CSS.
- Every color value derives from the chroma palette via `light-dark()` or
  `color-mix(in oklch)`. Chroma steps are referenced, not duplicated.
- Color mixing uses OKLCH (`color-mix(in oklch, ...)`). The system is
  OKLCH-native; perceptual uniformity across mixes depends on it.

## Contract

### Definition of Done

- [ ] All semantic tokens derive from `--chroma-*` palette via `light-dark()` or `color-mix(in oklch)`
- [ ] `color-scheme: light dark` is set on `:root` (via Base.astro or global reset)
- [ ] No `--cn-color-*` legacy aliases — only `--color-*` namespace
- [ ] No component-specific tokens (bubble, avatar, etc.) — only shared semantic roles
- [ ] Functional colors (success, warning, error, info) defined with their accent hues and tints
- [ ] No `-hsl` companion tokens
- [ ] Every `--cn-button*` container token has a paired `--cn-on-button*` foreground token that passes WCAG AA against the container in both light and dark modes.
- [ ] `--cn-active` is defined alongside `--cn-hover`, one step darker in each mode.
- [ ] `--cn-shadow-button-hover`, `--cn-duration-ui`, and `--cn-easing-ui` are defined on `:root`.
- [ ] No `filter: brightness()` appears anywhere in DS CSS — interactive feedback is overlay-based.

### Regression Guardrails

- Changing a chroma palette step must cascade correctly through all semantic tokens that reference it
- Light and dark theme must both produce readable contrast (WCAG AA minimum for text tokens)
- `--color-on-*` tokens must always contrast against their corresponding `--color-*` surface
- **Elevation 4 Contrast Rule (Dark Mode):** When the background is Elevation 4 (Step 40), typography MUST use Step 100 (White) to maintain the 4.5:1 AA contrast ratio. Step 99 and below are forbidden on Elevation 4 due to insufficient contrast.

### Scenarios

```gherkin
Scenario: Theme switching via color-scheme
  Given color-scheme is set to "light" on :root
  When the user switches to dark mode (color-scheme: dark)
  Then all --color-* tokens resolve to their dark variants
  And text remains readable against surfaces

Scenario: Surface elevation hierarchy
  Given default light theme
  When surfaces at levels 0–4 are rendered
  Then each level is visually distinct (progressively elevated)
  And --color-on-surface is readable against all surface levels
```

## Documentation (Living Style Book)

The documentation at `app/cyan-ds/src/content/principles/semantic-colors.mdx` provides the functional mapping reference for role-based tokens.

### Content Strategy & Demos

1. **Role Hierarchies**: Tables and visual swatches for each functional group (Surfaces, Text, Interactive, Status).
2. **Semantic Immutability**: Clearly documents the constraint that functional role names are a stable API and should not be overridden by sub-sites.
3. **Contrast HUD**: Inline demonstrations of text readability across surface elevations, specifically enforcing the Elevation 4 mandatory white-text rule.
4. **Theme-Awareness**: Explains how `--cn-*` tokens (standardizing from legacy `--color-*`) utilize `light-dark()` for automatic scheme adaptation.
