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

#### Surface Palette (13 steps: MD3 tonal scale)

Tonal range blending between two inline anchor values:
- **Lightest (step 100):** `hsl(204, 100%, 100%)` — Absolute White
- **Darkest (step 0):** `hsl(204, 100%, 0%)` — Absolute Black

All intermediate steps derive from `color-mix()` between these two endpoints. No `black` mixing. The upstream K-S/S-K tokens are dropped in v20 — they were semantic roles disguised as palette primitives. The numbered steps (`--chroma-surface-0` through `--chroma-surface-100`) are the only public API.

#### Accent Palettes (partial step coverage)

Accent palettes define single-hue tonal scales for functional UI states. Unlike primary/secondary/surface, accents don't need all 13 steps — only the steps actually used. The step number indicates brightness on the MD3 tonal scale (0 = darkest, 100 = lightest).

| Palette | Base hue | Upstream source |
|---|---|---|
| `--chroma-error-{step}` | Magenta `hsl(318, 83%, 40%)` | `--chroma-error` |
| `--chroma-warning-{step}` | Yellow `hsl(65, 100%, 63%)` | `--chroma-warning` |
| `--chroma-info-{step}` | Teal `hsl(170, 100%, 20%)` | `--chroma-info` |
| `--chroma-love-{step}` | Red `#e03c31` | `--color-reaction-red` |

Steps are added as needed by the semantic layer and components. For example, if `--color-error` needs a step-40 and a tint at step-90, chroma provides `--chroma-error-40` and `--chroma-error-90`.

### Migration Notes

- **Namespace:** `--chroma-*` not `--cn-*` — decide whether to unify under `cn-` for v20 or keep chroma as a distinct namespace
- **Drop `-hsl` companion tokens:** The upstream primary palette ships raw HSL companions (`--chroma-primary-XX-hsl`) for every step. These were a pre-`color-mix()` workaround for alpha transparency (e.g. `rgba(var(--h), var(--s), var(--l), 0.1)`). No longer needed — `color-mix(in hsl, color, transparent N%)` replaces them
- **Accent palettes replace flat semantic colors:** Upstream `--chroma-info`, `--chroma-warning`, `--chroma-error` were single tokens. v20 replaces them with stepped palettes (`--chroma-error-40`, `--chroma-love-40`, etc.) so tints and variants derive from the same hue at different brightness levels. The [semantic layer](../semantic/spec.md) maps these to functional roles.
- **`--color-reaction-red` becomes `--chroma-love-*`:** The upstream hardcoded hex moves into chroma as a proper tonal scale.
- **Drop K-S / S-K anchor tokens:** The upstream `--chroma-K-S` and `--chroma-S-K` were semantic roles disguised as palette primitives. In v20, the HSL values are inlined directly in the surface palette derivation. The numbered steps (`--chroma-surface-0` through `--chroma-surface-100`) are the only public API.
- **Fix surface palette deep darks:** Use absolute black (0%) and white (100%) anchors for 0-100 numbering consistency.
- `color-mix()` requires modern browser support (baseline 2023) — acceptable for v20 targets

### Anti-Patterns

- **Don't hardcode hex/hsl values** — always reference chroma tokens or derive via `color-mix()`
- **Don't create palette steps outside the MD3 tonal scale** — use 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100
- **Don't add single-value semantic tokens to chroma** — chroma provides tonal steps; the semantic layer assigns roles
- **Don't mix the primary hue gradient assumption into component code** — the hue shift is a palette design decision, not a component concern

## Contract

### Definition of Done

- [ ] Primary palette covers all 13 MD3 tonal steps with perceptual hue curve from teal to yellow
- [ ] Surface palette derives entirely from endpoint values via `color-mix()` (0% Black / 100% White)
- [ ] Accent palettes (error, warning, info, love) use step numbering for brightness
- [ ] No `-hsl` companion tokens
- [ ] No flat single-value semantic tokens — all colors are stepped

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
