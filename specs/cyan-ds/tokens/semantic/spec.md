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
- **Dependencies:** [Chroma tokens](../chroma/spec.md) — all values derive from `--chroma-*` via `light-dark()` and `color-mix()`

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
| `--color-heading-1` | surface-70 | surface-30 | H1 headings |
| `--color-heading-2` | surface-80 | surface-20 | H2 headings |

#### Links

| Token | Light | Dark | Role |
|---|---|---|---|
| `--color-link` | surface-60 | surface-40 | Default link |
| `--color-link-hover` | surface-50 | surface-20 | Link hover |
| `--color-link-active` | surface-40 | surface-70 | Link active |

#### Buttons & Interactive

| Token | Light | Dark | Role |
|---|---|---|---|
| `--color-button` | surface-50 | surface-80 | Default button fill |
| `--color-button-light` | primary-60 | primary-95 | Light variant |
| `--color-button-accent` | primary-20 | primary-70 | Accent/emphasized |
| `--color-button-cta` | error | error | Call-to-action (destructive) |
| `--color-hover` | surface-50 @ 10% | surface-50 @ 20% | Hover overlay |

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
| `--color-warning` | chroma-warning | chroma-warning | Warning state |
| `--color-error` | chroma-error | chroma-error | Error/destructive state |
| `--color-info` | chroma-info | chroma-info | Informational accent |

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
| `--color-shadow` | Shadow color (light-dark from surface palette) |
| `--color-elevation-1/2/3` | Aliases to surface levels for elevation system |

### Migration Notes

- **Drop the `--cn-color-*` legacy aliases** — upstream has a parallel set (`--cn-color-primary`, `--cn-color-surface`, etc.) that are backward-compat shims mapping to the same `--color-*` values. v20 should only ship the `--color-*` namespace.
- **Drop `--chroma-info/warning/error` from chroma.css** — already done in v20 chroma. The three accent hues (`info: hsl(170, 100%, 20%)`, `warning: hsl(65, 100%, 63%)`, `error: hsl(318, 83%, 40%)`) and their tints move here as functional tokens.
- **`light-dark()` requires `color-scheme`** — the `<html>` or `:root` must declare `color-scheme: light dark` for `light-dark()` to work. Base.astro should set this.
- **Upstream uses `white` as a literal** — surface levels 1–3 use `white` in light mode instead of `--chroma-surface-100`. Use `--chroma-surface-100` so the entire system derives from the same palette.
- **Component-specific tokens should move out** — `--color-bubble`, `--color-reply-bubble`, `--cn-color-avatar-*` are component-specific. They should live in their component's CSS, not in the semantic layer.
- **`--color-reaction-red`** is a hardcoded hex (`#e03c31`) — the only non-derived color. Needs a decision: keep as-is, or derive from error palette.

### Anti-Patterns

- **Don't reference `--chroma-*` tokens directly in components** — always go through semantic tokens so theme switching works
- **Don't add component-specific color tokens here** — this file is the shared semantic layer. Component colors belong in component CSS.
- **Don't use hardcoded colors** — derive everything from chroma via `light-dark()` and `color-mix()`
- **Don't duplicate the chroma accent hues** — info/warning/error are defined once in this file; chroma should not also define them

## Contract

### Definition of Done

- [ ] All semantic tokens derive from `--chroma-*` palette via `light-dark()` or `color-mix()`
- [ ] `color-scheme: light dark` is set on `:root` (via Base.astro or global reset)
- [ ] No `--cn-color-*` legacy aliases — only `--color-*` namespace
- [ ] No component-specific tokens (bubble, avatar, etc.) — only shared semantic roles
- [ ] Functional colors (success, warning, error, info) defined with their accent hues and tints
- [ ] No `-hsl` companion tokens

### Regression Guardrails

- Changing a chroma palette step must cascade correctly through all semantic tokens that reference it
- Light and dark theme must both produce readable contrast (WCAG AA minimum for text tokens)
- `--color-on-*` tokens must always contrast against their corresponding `--color-*` surface

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
