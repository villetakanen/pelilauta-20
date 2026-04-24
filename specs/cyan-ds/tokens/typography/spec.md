# Feature: Typography Principles & Tokens

Parent: [Cyan DS Tokens](../spec.md)

## Blueprint

### Context

Typography defines the core personality and informational hierarchy of Cyan. It provides a set of deterministic scales, semantic tag behaviors, and accessibility-first contrast rules that ensure readability across all application surfaces.

### Architecture

- **Implementation:** `packages/cyan/src/tokens/typography.css` and `packages/cyan/src/tokens/typography-semantics.css` (or combined).
- **Namespace:** `--cn-font-*` (replacing deprecated `--cyan-font-*`).
- **Hosting Strategy:** Fonts are resolved from the `lato-font` npm package. Astro/Vite will automatically bundle and hash these assets during build time, ensuring professional font delivery with local fallback and `font-display: swap` support.
- **Unit Strategy:** 
  - **Sizes:** `rem` for accessibility and scaling.
  - **Line-Heights:** Unitless (1.25, 1.5, 1.75).
  - **Weights:** Numeric (300, 400, 700).

---

## Typography Scales

### Heading Scale
Cyan uses a 4-level semantic heading scale (`h1-h4`). The v20 architecture prioritizes a high-contrast, "punchy" look by utilizing the **Augmented Fourth (1.414)** ratio.

To optimize the legibility of the **Lato** typeface, the base reading size is established at **17px**.

| Level | Scale Step | Desktop Size (rem) | Mobile Fallback (< 620px) |
|---|---|---|---|
| **H1** | Step 4 | **4.25rem** (~68px) | **3.0rem** (~48px) |
| **H2** | Step 3 | **3.0rem** (~48px) | **2.125rem** (~34px) |
| **H3** | Step 2 | **2.125rem** (~34px) | **1.5rem** (~24px) |
| **H4** | Step 1 | **1.5rem** (~24px) | **Base-Bold** (1.0625rem) |

### Reading Scale
The base text scale used for `p`, `li`, `blockquote`, and other prose elements.

- **Primary Text:** `1.0625rem` (~17px) using `--cn-font-size-text`.
- **Root Scale:** Anchored to a 16px base (standard browser default), resulting in a 17px (`1.0625rem`) legibility baseline.
- **Monospace Text:** `--cn-font-family-mono`, size: `--cn-font-size-mono`.

### UI Scale

The small-scale text tier used inside UI affordances — button labels, tags,
metadata lines, section eyebrows, and inline code. These are visually
distinct from prose: tighter in size, often in a different weight or case,
and always used in chrome rather than long-form reading.

Reversed from [`cyan-design-system-4/packages/cyan-css/src/tokens/typography.css`](https://github.com/villetakanen/cyan-design-system-4/blob/main/packages/cyan-css/src/tokens/typography.css).

**Naming:** each UI role owns a namespaced triple
(`size` / `line-height` / `letter-spacing`) plus an optional `weight` when
the role deviates from `--cn-font-weight-text`. The role, not a generic
`ui` bucket, is the token discriminator.

| Role       | Size token                    | Default       | Line-height token                    | Default | Letter-spacing token                  | Weight token                    |
|------------|-------------------------------|---------------|--------------------------------------|---------|---------------------------------------|---------------------------------|
| text-small | `--cn-font-size-text-small`   | `0.9375rem` (15px) | `--cn-line-height-text-small`   | `1.5rem` (24px) | `--cn-letter-spacing-text-small` | inherits `--cn-font-weight-text` |
| caption    | `--cn-font-size-caption`      | `0.8125rem` (13px) | `--cn-line-height-caption`      | `1rem` (16px)   | `--cn-letter-spacing-caption`    | inherits `--cn-font-weight-text` |
| overline   | `--cn-font-size-overline`     | `0.6875rem` (11px) | `--cn-line-height-overline`     | `1rem` (16px)   | `--cn-letter-spacing-overline`   | `--cn-font-weight-medium`        |
| button     | `--cn-font-size-button`       | `0.9375rem` (15px, alias of `--cn-font-size-text-small`) | `--cn-line-height-button` | `1.5` (unitless, ≈ 22px cap) | `--cn-letter-spacing-button`    | `--cn-font-weight-button` (500) |
| mono       | `--cn-font-size-mono`         | `0.875rem` (14px)  | `--cn-line-height-mono`         | `1.5rem` (24px) | `--cn-letter-spacing-mono`       | `--cn-font-weight-mono` (400)   |

**Role semantics:**

- **text-small** — body-adjacent text that must sit in a tight space
  (dense lists, secondary descriptions). Same line-height as prose so it
  mixes on the grid.
- **caption** — metadata (timestamps, authors, counts). Never used for
  primary reading.
- **overline** — short UPPERCASE labels above a section or card.
  Authors apply `text-transform: uppercase` at the selector level; the
  token family does not bake case in.
- **button** — labels inside `<button>` / `a.button` / any UI action.
  The weight is `500`, one step heavier than prose, for tap-target
  legibility.
- **mono** — inline `<code>`, `<kbd>`, and `<pre>`. Uses
  `--cn-font-family-mono`.

**Utility classes:** `.text-small`, `.text-caption`, `.text-overline`
mirror the token triples so authors can apply the UI scale to non-semantic
tags, matching the existing `.text-h1..h5` pattern.

---

## Semantic Behavioral Contracts

### 1. Vertical Rhythm & Spacing
Typography elements manage their own downward spacing to ensure a consistent typographical flow.
- **Headings:** `margin-bottom: var(--cn-line)` (standard grid unit).
- **Paragraphs/Lists/Quotes:** `margin-bottom: var(--cn-gap)` (standard gap unit).
- **Relief Rule:** The first `h1`, `h2`, `h3`, or `h4` inside an `<article>` must have `margin-top: 0` to prevent excessive gap at the top of a document.

### 2. Fluid Layout Fallbacks
To maintain header hierarchy when the content area is constrained, headings are down-scaled via **container queries** on the parent `main` or `article` element (Breakpoint: `620px`).
- **H1** → **H2** style (`2.828rem`).
- **H2** → **H3** style (`2rem`).
- **H3** → **H4** style (`1.412rem`).
- **H4** → **Bold Text** style (`1rem`).

### 3. Utility Classes
Applications can apply typographical styles to non-semantic tags or override defaults using utility classes:
- **Classes:** `.text-h1` through `.text-h5`.
- **Behavior:** These classes mirror the properties (size, weight, line-height) of their corresponding semantic tags.

---

## Color & Contrast Guardrails

### Elevation 4 Contrast Rule (Dark Mode)

> [!IMPORTANT]
> **Accessibility Constraint:** In Dark Mode, when a surface is **Elevation 4** (Chroma Step 40), typography MUST use **Step 100 (White)** to maintain WCAG AA (4.5:1) compliance.

- **Background:** `var(--chroma-surface-40)` (~13.5% relative luminance)
- **Text:** `var(--chroma-surface-100)` (White)
- **Resulting Contrast:** **4.6:1** (AA Pass)

---

## Contract

### Definition of Done

- [ ] All typography uses the `--cn-font-*` namespace.
- [ ] Font sizes are `rem` based to support browser scaling.
- [ ] Line heights are unitless for correct inheritance.
- [ ] Global `h1-h4` tags are anchored to their respective scale tokens.
- [ ] Mobile down-scaling logic (H1->H2) is implemented for all headings.
- [ ] UI Scale tokens (`text-small`, `caption`, `overline`, `button`, `mono`) are defined on `:root`.
- [ ] `--cn-font-weight-button` is defined (value `500`) and `--cn-font-size-button` aliases `--cn-font-size-text-small`.
- [ ] Utility classes `.text-small`, `.text-caption`, `.text-overline` render the UI Scale tokens correctly.
- [ ] No `--cn-*-ui` token names appear anywhere in the codebase (the role name *is* the discriminator).

### Testing Scenarios

#### Scenario: Heading Down-scaling
```gherkin
  Given a <h1> element inside a container
  When the container width is reduced to 400px
  Then the computed font-size must match the var(--cn-font-size-h2) token
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/tokens/typography.spec.ts`

#### Scenario: Article First-Heading Relief
```gherkin
  Given an <article> containing an <h2> as its first child
  When the article is rendered
  Then the <h2> must have exactly 0px margin-top
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/tokens/typography.spec.ts`

#### Scenario: UI Scale Tokens Resolve
```gherkin
  Given the DS stylesheet is loaded on `:root`
  When computed styles are read for the custom properties
    --cn-font-size-text-small,
    --cn-font-size-caption,
    --cn-font-size-overline,
    --cn-font-size-button,
    --cn-font-size-mono,
    --cn-font-weight-button
  Then each resolves to a non-empty rem value (sizes) or numeric weight
  And --cn-font-size-button equals --cn-font-size-text-small
  And --cn-font-weight-button equals 500
```
- **Vitest Unit Test:** `packages/cyan/src/tokens/typography.test.ts`
- **Playwright E2E Test:** `app/cyan-ds/e2e/tokens/typography.spec.ts`

#### Scenario: Overline Utility Applies Role Triple
```gherkin
  Given a <span class="text-overline"> element
  When it is rendered
  Then its computed font-size matches --cn-font-size-overline
  And its line-height matches --cn-line-height-overline
  And its letter-spacing matches --cn-letter-spacing-overline
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/tokens/typography.spec.ts`

---

## Documentation (Living Style Book)

The documentation at `app/cyan-ds/src/content/principles/typography.mdx` provides the visual and behavioral reference for Cyan's type system.

### Content Strategy & Demos

1. **The Scale Visualizer**: A side-by-side comparison of the **Desktop** vs. **Mobile** Augmented Fourth (1.414) scale, with each level (H1-H4) explicitly labeled with its `--cn-font-*` token.
2. **Semantic vs. Utility Labs**: A demonstration showing equivalent rendering for semantic tags (`h1`) and utility classes (`.text-h1`).
3. **Article Relief HUD**: A live demo block showing the first-child `margin-top: 0` logic, specifically identifying the removal of the standard gap.
4. **Contrast Guardrails**: A matrix demonstrating text readability across surface elevations (0-4), explicitly highlighting the **Elevation 4 (White Text)** mandatory rule in Dark Mode.
5. **Layout Atomics**: Examples of paragraphs, blockquotes, and lists interacting with the system's vertical rhythm tokens (`--cn-gap` and `--cn-line`).

