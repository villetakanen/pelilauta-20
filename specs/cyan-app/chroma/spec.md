# Feature: Chroma Documentation Page

Parent: [Cyan DS App](../spec.md)

## Blueprint

### Context

A living documentation and demo page that showcases the Cyan chroma (color) token system. Part of the **Principles** collection in the cyan-ds app. Serves as both a developer reference and a visual regression surface — if the palette tokens break, this page shows it.

### Architecture

- **Target path:** `app/cyan-ds/src/pages/principles/chroma.mdx`
- **Format:** MDX using [Book layout](../book-layout/spec.md) (`app/cyan-ds/src/layouts/Book.astro`)
- **Collection:** Principles
- **Dependencies:** `--chroma-*` tokens from `packages/cyan/src/tokens/chroma.css`, `--cn-*` unit tokens for spacing/layout

### Page Structure

The page documents the three palettes with tables and inline swatch demos:

1. **Key/Surface Anchors** — `--chroma-K-S` and `--chroma-S-K`, two swatches showing the light/dark reference points
2. **Primary Palette** — all 13 MD3 tonal steps (0–100), swatch strip showing the teal→yellow hue rotation, table with token name and step
3. **Secondary Palette** — all 13 MD3 tonal steps, swatch strip, table with token name and step
4. **Surface Palette** — all 13 MD3 tonal steps, swatch strip showing K-S to S-K range, table with token name and step
5. **Usage Notes** — brief guidance on when to use primary vs. secondary vs. surface tokens, and the `color-mix()` derivation model

### Inline Demos

Each palette section renders a horizontal swatch strip of `<div>` elements styled with `var(--chroma-*)` as `background-color`. These are live regression tests — if the tokens change, the swatches change.

- Swatches use `--cn-gap` for spacing and `--cn-border-radius-small` for rounding
- Each swatch displays its step number as a label
- Primary swatches should visually show the hue shift from teal (step 0) to yellow (step 100)
- Text on swatches uses a contrasting color from the same palette (light text on dark steps, dark text on light steps)

### Anti-Patterns

- **Don't hardcode color values in demos** — always use `var(--chroma-*)` so demos stay in sync with tokens
- **Don't include semantic colors** — chroma is tonal palettes only; info/warning/error belong elsewhere
- **Don't use placeholder token names** — use the canonical `--chroma-*` names even if the implementation doesn't exist yet
- **Don't explain the color-mix() math in detail** — the docs page is for consumers, not implementors. Link to the token spec for internals.

## Contract

### Definition of Done

- [ ] Page exists at `app/cyan-ds/src/pages/principles/chroma.mdx`
- [ ] Page uses Book layout via frontmatter
- [ ] All three palettes (primary, secondary, surface) shown with swatch demos and token tables
- [ ] Key/Surface anchors displayed as a pair of contrasting swatches
- [ ] Swatch demos reference tokens via `var()`, never hardcoded values
- [ ] Primary palette demo visually demonstrates the teal→yellow hue progression
- [ ] Page renders correctly at `pnpm dev` (once chroma tokens are implemented)

### Regression Guardrails

- Inline demos must reference tokens via `var()`, never hardcoded color values
- Token tables must list all 13 MD3 tonal steps per palette (0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100)
- Page must not contain semantic color tokens (info, warning, error)
