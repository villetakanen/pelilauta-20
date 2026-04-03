# Feature: Typography Tokens

Parent: [Cyan DS Tokens](../spec.md)

## Blueprint

### Context

Typography tokens define the core fonts, scale, and readability constraints for the Cyan design system. They are designed to scale with user preferences (`rem` based) and maintain strict accessibility across different surface elevations.

### Architecture

- **v20 target:** `packages/cyan/src/tokens/typography.css`
- **Namespace:** `--cn-font-*` (replacing deprecated `--cyan-font-*`)
- **Format:** CSS custom properties on `:root`
- **Unit:** `rem` for sizes (exception: unitless line-heights and numeric weights)

### Core Tokens

| Property | Token | Default Value |
|---|---|---|
| **Family** | `--cn-font-family` | `system-ui, -apple-system, sans-serif` |
| **Mono** | `--cn-font-family-mono` | `ui-monospace, monospace` |
| **Sizes** | `--cn-font-size-{xs..3xl}` | `0.75rem` to `2.5rem` |
| **Line-Height** | `--cn-line-height-{tight, normal, relaxed}` | `1.25`, `1.5`, `1.75` |
| **Weight** | `--cn-font-weight-{normal, medium, bold}` | `400`, `500`, `700` |

---

## Color & Contrast Guardrails

### Elevation 4 Contrast Rule (Dark Mode)

> [!IMPORTANT]
> **Accessibility Constraint:** In Dark Mode, when a surface is **Elevation 4** (Chroma Step 40), typography MUST use **Step 100 (White)** to maintain WCAG AA (4.5:1) compliance.

- **Background:** `var(--chroma-surface-40)` (~13.5% relative luminance)
- **Text:** `var(--chroma-surface-100)` (White)
- **Resulting Contrast:** **4.6:1** (AA Pass)
- **Why?** Even near-white Step 99 yields only 4.42:1, which is technically a failure.

### General Guidelines

- **Primary Text (Dark):** Use Step 95 or higher for safe AA on all surfaces up to Elevation 3.
- **De-emphasized Text:** Step 60 is the dark-mode floor for readability; below this, text is strictly decorative or fails AA.

## Contract

### Definition of Done

- [ ] All typography tokens use the `--cn-font-*` namespace.
- [ ] Font sizes are `rem` based to support browser zoom/scaling.
- [ ] Line heights are unitless for correct proportional inheritance.

### Regression Guardrails

- Changes to `--cn-font-family` must be verified against vertical alignment in components like `AppBar` and `Button`.
- Tonal changes in the `chroma` surface scale MUST trigger a re-verification of the Elevation 4 Contrast Rule.
