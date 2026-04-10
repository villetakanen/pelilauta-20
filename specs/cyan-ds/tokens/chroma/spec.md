---
feature: Chroma Tonal Palettes
stylebook_url: https://localhost:4322/principles/color-system
---

# Feature: Chroma Tonal Palettes

Parent: [Cyan DS Tokens](../spec.md)

## Blueprint

### Context

Chroma defines the tonal color palettes for the Cyan design system. It utilizes the **OKLCH** color space to achieve deterministic perceptual lightness while maintaining "aggressive" levels of chroma (vibrance).

### Tonal Scale Ruleset (OKLCH)

All palettes follow a 13-point tonal scale where the step number maps directly to the OKLCH **Lightness (L)** component.

| Step | OKLCH L | Perception | Contrast Mapping |
| :--- | :--- | :--- | :--- |
| **0** | **0.00** | **Absolute Black** | Terminal dark anchor |
| **10** | 0.10 | Deepest Shadow | Ground baseline |
| **40** | **0.40** | Mid Dark | **WCAG AA (4.5:1)** minimum against White (1.0) |
| **60** | **0.60** | Mid Light | **WCAG AA (4.5:1)** minimum against Black (0.0) |
| **95-99** | 0.95-0.99 | Near White | Page tints and highlights |
| **100** | **1.00** | **Absolute White** | Terminal light anchor |

#### Primary Palette (Acid-Neon)

The primary palette rotates hue from **Teal (185)** to **Highlighter Neon (110)** while maintaining high Chroma levels (**Max 0.27 at Step 90**) for a radioactive, aggressive look.

- **Range:** 185° $\rightarrow$ 110°
- **Max Chroma:** 0.27 (0.90 Lightness)
- **Anchors:** `oklch(0 0 185)` (0) / `oklch(1 0 110)` (100)

#### Surface Palette (Cerulean)

Utilizes a **Hand-tuned Chroma Curve** to anchor the system's "Cerulean Soul" in the mid-tones while keeping terminals stable.

- **Hue (H):** 242° (Cerulean Point)
- **Chroma Curve (C):** 
    - **Mid-Soul (60-70):** **0.17** (Peak Quintessential Vibrance)
    - **Action-Mid (50):** 0.14
    - **Light Fade (80-99):** Chroma tapers from 0.12 → 0.015 (desaturating toward white)
    - **Baseline (10):** 0.05
- **Lightness (L):** Strictly `Step / 100`

| Token | OKLCH (L C H) | Role |
| :--- | :--- | :--- |
| `--chroma-surface-0` | `oklch(0 0 242)` | Absolute Black |
| `--chroma-surface-10` | `oklch(0.1 0.05 242)` | Baseline Architectural Ground |
| `--chroma-surface-60` | `oklch(0.6 0.17 242)` | **Peak Cerulean Soul** |
| `--chroma-surface-100` | `oklch(1 0 242)` | Absolute White |

#### Accent Palettes

Single-hue scales using OKLCH steps for functional intent (Error, Warning, Info, Love).

### Anti-Patterns

- **Don't use HSL for raw color definitions** — use OKLCH for perceptual uniformity.
- **Don't use `color-mix(in hsl)` for derived values** — all mixing must use `color-mix(in oklch)` to preserve perceptual uniformity across the system.
- **Don't thin out primary chroma at high lightness** — maintain vibrance until Step 95. Surface palette is exempt: it tapers chroma above Step 70 for clean light-mode surfaces.

## Contract

### Definition of Done

- [ ] All primary steps follow `oklch(Step/100 C H)` mapping.
- [ ] Surface palette uses parameterized OKLCH variables.
- [ ] Absolute anchors (0/100) are pure Black/White.

### Regression Guardrails

- OKLCH Lightness must match `Step / 100` (e.g. Step 40 must have L=0.4). **Exception:** Primary step 10 is hand-tuned to L=0.12 for legibility separation from step 0.
- Chroma must remain > 0.10 for all primary steps between 20 and 95.
- Surface chroma curve is hand-tuned and exempt from the global chroma floor.

### Testing Scenarios

#### Scenario: Lightness invariant
```gherkin
Given the chroma.css token file
When each --chroma-{palette}-{step} token is parsed
Then the OKLCH Lightness value equals step / 100
Exception: primary-10 is hand-tuned to L=0.12
```

#### Scenario: Anchor purity
```gherkin
Given the chroma.css token file
When step 0 or step 100 tokens are parsed
Then Chroma (C) must be 0 (pure black or pure white)
```

#### Scenario: Primary chroma floor
```gherkin
Given the primary palette tokens in chroma.css
When steps 20 through 95 are parsed
Then Chroma (C) must be greater than 0.10
```

#### Scenario: OKLCH-only color space
```gherkin
Given the chroma.css and semantic.css token files
When all color values and color-mix() calls are parsed
Then no HSL, RGB, or hex color definitions appear (except inside comments)
And all color-mix() calls use "in oklch"
```

- **Vitest Unit Test:** `packages/cyan/src/tokens/chroma.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/tokens/chroma.spec.ts`
