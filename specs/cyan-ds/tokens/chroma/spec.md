---
feature: Chroma Tonal Palettes
stylebook_url: https://localhost:4322/principles/color-system
---

# Feature: Chroma Tonal Palettes

Parent: [Cyan DS Tokens](../spec.md)

## Blueprint

### Context

Chroma defines the tonal color palettes for the Cyan design system, following Material Design 3 conventions. It provides primary (brand identity) and surface (elevation baseline) palettes using modern `color-mix()` for derived values.

### Tonal Scale Ruleset (MD3)

All palettes in Cyan must follow the standard 13-point tonal scale. The step numbering indicates the **perceived lightness** and determines **accessible contrast pairs**.

| Step | Lightness (%) | Perception | Contrast Mapping |
| :--- | :--- | :--- | :--- |
| **0** | **0%** | **Absolute Black** | Foundation for "darker than dark" sunken states |
| **10** | **~10%** | Deepest Shadow | **Cyan Baseline** (Body, Background, Elevation 0) |
| **20-30** | 20-30% | Dark Tones | Used for Surface levels 1-2 |
| **40** | **~40%** | Mid Dark | **WCAG AA (4.5:1)** minimum against White (100) |
| **50** | 50% | Midpoint | Neutral contrast balance |
| **60** | **~60%** | Mid Light | **WCAG AA (4.5:1)** minimum against Black (0) |
| **70-90** | 70-90% | Light Tones | High-light surfaces and secondary backgrounds |
| **95-99** | 95-99% | Near White | Subtle page tints and highlights |
| **100** | **100%** | **Absolute White** | Full brightness anchor |

#### Primary Palette (13 steps)

The primary palette is the brand identity core of Cyan. Unlike standard MD3 single-hue palettes, it rotates hue from **Teal (185°)** to **Yellow (65°)** across the tonal range.

- **Step 0 (Teal):** Deep branding anchor
- **Step 100 (Yellow):** Bright branding anchor
- **Curve:** Hue rotation must follow a **perceptual curve** (non-linear) to maintain consistent chroma across all steps.

#### Surface Palette (13 steps)

The surface palette provides the architectural depth for the system. It is **parameterized** using internal variables for rapid iteration:
- `--_surface-hue`: 204deg (Navy)
- `--_surface-saturation`: 20% (Slate)

Every tonal step is explicitly declared to ensure deterministic contrast and hand-tuned accuracy.

| Token | HSL Definition | Lightness | Role |
| :--- | :--- | :--- | :--- |
| `--chroma-surface-0` | `hsl(204, 20%, 0%)` | 0% | **Absolute Black** |
| `--chroma-surface-10` | `hsl(204, 20%, 10%)` | 10% | **Baseline** (Body/Ground) |
| `--chroma-surface-20` | `hsl(204, 20%, 20%)` | 20% | Surface level 1 |
| `--chroma-surface-30` | `hsl(204, 20%, 30%)` | 30% | Surface level 2 |
| `--chroma-surface-40` | `hsl(204, 20%, 40%)` | 40% | Surface level 3 |
| `--chroma-surface-50` | `hsl(204, 20%, 50%)` | 50% | Surface level 4 |
| `--chroma-surface-60` | `hsl(204, 20%, 60%)` | 60% | Mid-light / Secondary |
| `--chroma-surface-70` | `hsl(204, 20%, 70%)` | 70% | Light accent |
| `--chroma-surface-80` | `hsl(204, 20%, 80%)` | 80% | High-light |
| `--chroma-surface-90` | `hsl(204, 20%, 90%)` | 90% | Near white |
| `--chroma-surface-95` | `hsl(204, 20%, 95%)` | 95% | Tint |
| `--chroma-surface-99` | `hsl(204, 20%, 99%)` | 99% | Paper white |
| `--chroma-surface-100` | `hsl(204, 20%, 100%)` | 100% | **Absolute White** |

#### Accent Palettes (partial step coverage)

Accent palettes define single-hue tonal scales for functional UI states. Unlike primary/secondary/surface, accents don't need all 13 steps — only the steps actually used. The step number indicates brightness on the MD3 tonal scale (0 = darkest, 100 = lightest).

| Palette | Base hue |
| :--- | :--- |
| `--chroma-error-{step}` | Magenta `hsl(318, 83%, 40%)` |
| `--chroma-warning-{step}` | Yellow `hsl(65, 100%, 63%)` |
| `--chroma-info-{step}` | Teal `hsl(170, 100%, 20%)` |
| `--chroma-love-{step}` | Red `hsl(3, 74%, 54%)` |

Steps are added as needed by the semantic layer and components. For example, if `--color-error` needs a step-40 and a tint at step-90, chroma provides `--chroma-error-40` and `--chroma-error-90`.

### Anti-Patterns

- **Don't hardcode hex/hsl values** — always reference chroma tokens or derive via `color-mix()`
- **Don't create palette steps outside the MD3 tonal scale** — use 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100
- **Don't add single-value semantic tokens to chroma** — chroma provides tonal steps; the semantic layer assigns roles
- **Don't mix the primary hue gradient assumption into component code** — the hue shift is a palette design decision, not a component concern

## Contract

### Definition of Done

- [ ] Primary palette covers all 13 MD3 tonal steps with perceptual hue curve from teal to yellow
- [ ] Surface palette defines all 13 steps via explicit HSL (20% Saturation)
- [ ] Accent palettes (error, warning, info, love) use step numbering for brightness
- [ ] No `-hsl` companion tokens
- [ ] No flat single-value semantic tokens — all colors are stepped

### Regression Guardrails

- Surface palette must maintain exactly 13 steps (0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100).
- Primary palette hue must progress monotonically from teal (185°) to yellow (65°) — no hue reversals between steps.

### Scenarios

```gherkin
Scenario: Surface palette uses explicit HSL
  Given the surface palette is parameterized with --_surface-hue and --_surface-saturation
  When tonal steps (0-100) are explicitly defined using the shared variables
  Then all steps maintain exact HSL deterministic accuracy
  And no step relies on dynamic color-mix() or external anchor references
```
## Documentation (Living Style Book)

The documentation at `app/cyan-ds/src/content/principles/color-system.mdx` provides the definitive reference for the entire color architecture (Chroma + Semantic).

### Content Strategy & Demos

1. **Color Lifecycle**: Explains the 3-tier layering model and the "Swappable Chroma" principle.
2. **Semantic Mapping Reference**: Detailed tables showing how each functional role maps to its underlying positional chroma step.
3. **Contrast Matrix**: A live accessibility HUD demonstrating conformance across all surface levels.
4. **ThemeLab**: The interactive verification environment for real-time rebranding.
