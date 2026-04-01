# Feature: Cyan Chroma (Color Tokens)

> Reversed from: https://github.com/villetakanen/cyan-design-system-4/blob/main/packages/cyan-css/src/tokens/chroma.css

Parent: [Cyan DS Tokens](../spec.md)

## Blueprint

### Context

Chroma defines the tonal color palettes for the Cyan design system, following Material Design 3 conventions. It provides primary, secondary, and surface palettes using modern `color-mix()` for derived values. Chroma is purely about tonal scales — semantic colors (info, warning, error) belong in a separate token file.

### Architecture

- **Source:** `packages/cyan-css/src/tokens/chroma.css` (upstream: cyan-design-system-4)
- **Format:** CSS custom properties on `:root`
- **Namespace:** `--chroma-*`

#### Primary Palette (13 steps: MD3 tonal scale)

MD3 tonal steps: 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100.

The primary palette is unique to Cyan — it rotates hue from teal (185°) to yellow (65°) across the tonal range, unlike standard MD3 single-hue palettes. This is a deliberate Cyan identity choice.

The hue rotation must follow a **perceptual curve** (not linear interpolation). The upstream implementation uses hand-tuned per-step HSL values that approximate a perceptual curve — v20 should derive these from a proper formula.

**Hue range:** 185° (step 0/darkest) → 65° (step 100/lightest)

#### Secondary Palette (13 steps: MD3 tonal scale)

Derived via `color-mix()` between two anchor points:
- **Anchor dark:** `--chroma-secondary-99` (`#232b2b` — near-black green)
- **Anchor light:** `--chroma-secondary-20` (`#d0f0c0` — tea green)

Steps are blended between the anchors. The v20 implementation must use a **consistent, evenly-spaced progression** — the upstream mix percentages drifted over time and are non-uniform.

Upstream step 10 blended the light anchor with `--chroma-K-S` at 50% — in v20, step 10 follows the same even-spacing pattern as all other steps.

#### Surface Palette (13 steps: MD3 tonal scale)

Tonal range blending between two inline anchor values:
- **Lightest (step 100):** `hsl(204, 78%, 97%)` — near-white, cool blue tint
- **Darkest (step 0):** `hsl(204, 100%, 11%)` — near-black, deep blue

All intermediate steps derive from `color-mix()` between these two endpoints. No `black` mixing. The upstream K-S/S-K tokens are dropped in v20 — they were semantic roles disguised as palette primitives. The numbered steps (`--chroma-surface-0` through `--chroma-surface-100`) are the only public API.

### Migration Notes

- **Namespace:** `--chroma-*` not `--cn-*` — decide whether to unify under `cn-` for v20 or keep chroma as a distinct namespace
- **Drop `-hsl` companion tokens:** The upstream primary palette ships raw HSL companions (`--chroma-primary-XX-hsl`) for every step. These were a pre-`color-mix()` workaround for alpha transparency (e.g. `rgba(var(--h), var(--s), var(--l), 0.1)`). No longer needed — `color-mix(in hsl, color, transparent N%)` replaces them
- **Remove semantic colors from chroma:** The upstream file includes `--chroma-info`, `--chroma-warning`, `--chroma-error` and their tint variants. These are not part of chroma's responsibility — they belong in the [semantic color token file](../semantic/spec.md)
- **Drop K-S / S-K anchor tokens:** The upstream `--chroma-K-S` and `--chroma-S-K` were semantic roles disguised as palette primitives. In v20, the HSL values are inlined directly in the surface palette derivation. The numbered steps (`--chroma-surface-0` through `--chroma-surface-100`) are the only public API.
- **Align to MD3 13-step scale:** Upstream has 11 steps (10–99). Add steps 0 and 100
- **Fix secondary palette spacing:** Replace drifted mix percentages with an even progression
- **Fix surface palette deep darks:** Replace `black` mixing at steps 95/99 with endpoint blend
- `color-mix()` requires modern browser support (baseline 2023) — acceptable for v20 targets

### Anti-Patterns

- **Don't hardcode hex/hsl values** — always reference chroma tokens or derive via `color-mix()`
- **Don't create palette steps outside the MD3 tonal scale** — use 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100
- **Don't put semantic colors in chroma** — chroma is tonal palettes only
- **Don't mix the primary hue gradient assumption into component code** — the hue shift is a palette design decision, not a component concern

## Contract

### Definition of Done

- [ ] Primary palette covers all 13 MD3 tonal steps with perceptual hue curve from teal to yellow
- [ ] Secondary palette derives from two anchors via `color-mix()` with even spacing
- [ ] Surface palette derives entirely from K-S and S-K via `color-mix()` (no `black` mixing)
- [ ] No `-hsl` companion tokens
- [ ] No semantic color tokens (info/warning/error) in chroma

### Regression Guardrails

- The surface palette endpoint values (`hsl(204, 78%, 97%)` and `hsl(204, 100%, 11%)`) must remain consistent across `--chroma-surface-0`, `--chroma-surface-100`, and all `color-mix()` derivations
- Primary palette hue must progress monotonically from teal to yellow — no hue reversals between steps

### Scenarios

```gherkin
Scenario: Surface palette derives from endpoints
  Given surface-0 and surface-100 define the dark and light anchors
  When intermediate steps are computed via color-mix()
  Then all steps blend only between the two endpoints
  And no step uses an independent color value or mixes with black
```
