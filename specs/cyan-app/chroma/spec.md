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

The page documents the two core palettes and functional accents with tables and inline swatch demos:

1. **Primary Palette** — all 13 MD3 tonal steps (0–100), swatch strip showing the teal→highlighter neon hue rotation, table with token name and step
2. **Surface Palette** — all 13 MD3 tonal steps, swatch strip showing the Cerulean hand-tuned chroma curve, table with token name and step
3. **Functional Palettes** — selective tonal steps for Error, Warning, Info, and Love accents
4. **Usage Notes** — brief guidance on when to use primary vs. surface tokens, and the `color-mix(in oklch)` derivation model

### Inline Demos

Each palette section renders a horizontal swatch strip of `<div>` elements styled with `var(--chroma-*)` as `background-color`. These are live regression tests — if the tokens change, the swatches change.

- Swatches use `--cn-gap` for spacing and `--cn-border-radius-small` for rounding
- Each swatch displays its step number as a label
- Primary swatches should visually show the hue shift from teal (step 0) to yellow (step 100)
- Text on swatches uses a contrasting color from the same palette (light text on dark steps, dark text on light steps)

### Anti-Patterns

- **Don't hardcode color values in demos** — always use `var(--chroma-*)` so demos stay in sync with tokens
- **Don't include semantic token mapping details** — the semantic layer has its own documentation page; this page covers tonal palettes and functional accent scales only
- **Don't use placeholder token names** — use the canonical `--chroma-*` names even if the implementation doesn't exist yet
- **Don't explain the color-mix() math in detail** — the docs page is for consumers, not implementors. Link to the token spec for internals.

## Contract

### Definition of Done

- [ ] Page exists at `app/cyan-ds/src/pages/principles/chroma.mdx`
- [ ] Page uses Book layout via frontmatter
- [ ] Both core palettes (primary, surface) shown with swatch demos and token tables
- [ ] Surface endpoints displayed as a pair of contrasting swatches (surface-0, surface-100)
- [ ] Swatch demos reference tokens via `var()`, never hardcoded values
- [ ] Primary palette demo visually demonstrates the teal→yellow hue progression
- [ ] Page renders correctly at `pnpm dev` (once chroma tokens are implemented)

### Regression Guardrails

- Inline demos must reference tokens via `var()`, never hardcoded color values
- Token tables must list all 13 MD3 tonal steps for primary and surface palettes (0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100)
- Page must not contain semantic token mapping tables (those belong in the semantic-colors page)

### Testing Scenarios

#### Scenario: Color system page loads
```gherkin
Given the cyan-ds dev server is running
When the color system page is visited
Then the page renders with a visible heading
And ColorScale swatch strips are rendered for primary and surface palettes
```

#### Scenario: Swatch strips render all tonal steps
```gherkin
Given the color system page is loaded
When the primary ColorScale component is visible
Then it contains 13 swatch elements (one per tonal step)
```

- **Playwright E2E Test:** `app/cyan-ds/e2e/tokens/chroma.spec.ts`
