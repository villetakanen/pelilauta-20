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
Cyan uses a 4-level semantic heading scale (`h1-h4`). The "H5" level in legacy Cyan-4 was an implementation detail for mobile down-scaling which has been rationalized in v20 as a `bold-text` level.

The scale follows a **Major Third (1.25)** ratio, starting from the `1rem` base.

| Level | Desktop Size | Desktop Weight | Mobile Size (< 620px) |
|---|---|---|---|
| **H1** | `2.441rem` (--cn-font-size-h1) | 300 | H2 (`1.953rem`) |
| **H2** | `1.953rem` (--cn-font-size-h2) | 400 | H3 (`1.563rem`) |
| **H3** | `1.563rem` (--cn-font-size-h3) | 400 | H4 (`1.25rem`) |
| **H4** | `1.25rem` (--cn-font-size-h4) | 400 | **Text-Bold** (`1rem`) |

> [!NOTE]
> **The H5 Legacy:** In v20, `h5` tags are NOT targeted globally. The `.text-h5` utility and weight-500 logic are reserved for specific UI annotations and sub-headings that require high density but low hierarchy.


### Reading Scale
The base text scale used for `p`, `li`, `blockquote`, and other prose elements.

- **Primary Text:** `1rem` (`--cn-font-size-text`), line-height: `1.5`.
- **Monospace Text:** `--cn-font-family-mono`, size: `--cn-font-size-mono`.

---

## Semantic Behavioral Contracts

### 1. Vertical Rhythm & Spacing
Typography elements manage their own downward spacing to ensure a consistent typographical flow.
- **Headings:** `margin-bottom: var(--cn-line)` (standard grid unit).
- **Paragraphs/Lists/Quotes:** `margin-bottom: var(--cn-gap)` (standard gap unit).
- **Relief Rule:** The first `h1`, `h2`, `h3`, or `h4` inside an `<article>` must have `margin-top: 0` to prevent excessive gap at the top of a document.

### 2. Fluid Layout Fallbacks
To maintain header hierarchy on narrow screens, headings are down-scaled via media queries (Breakpoint: `620px`).
- **H1** → **H2** style (1.953rem).
- **H2** → **H3** style (1.563rem).
- **H3** → **H4** style (1.25rem).
- **H4** → **Bold Text** style (1rem).

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

### Testing Scenarios

#### Scenario: Heading Down-scaling
```gherkin
  Given a <h1> element in the main content area
  When the viewport width is reduced to 400px
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

---

## Documentation (Living Style Book)

The documentation at `app/cyan-ds/src/content/principles/typography.mdx` provides the visual and behavioral reference for Cyan's type system.

### Content Strategy & Demos

1. **The Scale Visualizer**: A side-by-side comparison of the **Desktop** vs. **Mobile** Major Third (1.25) scale, with each level (H1-H4) explicitly labeled with its `--cn-font-*` token.
2. **Semantic vs. Utility Labs**: A demonstration showing equivalent rendering for semantic tags (`h1`) and utility classes (`.text-h1`).
3. **Article Relief HUD**: A live demo block showing the first-child `margin-top: 0` logic, specifically identifying the removal of the standard gap.
4. **Contrast Guardrails**: A matrix demonstrating text readability across surface elevations (0-4), explicitly highlighting the **Elevation 4 (White Text)** mandatory rule in Dark Mode.
5. **Layout Atomics**: Examples of paragraphs, blockquotes, and lists interacting with the system's vertical rhythm tokens (`--cn-gap` and `--cn-line`).

