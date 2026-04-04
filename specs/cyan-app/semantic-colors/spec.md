# Feature: Semantic Colors Documentation Page

Parent: [Cyan DS App](../spec.md)

## Blueprint

### Context

A living documentation and demo page that showcases the semantic color token system — the mapping layer between chroma palettes and functional UI roles. Part of the **Principles** collection in the cyan-ds app. Serves as both a developer reference for which token to use where, and a visual regression surface for theme switching.

### Architecture

- **Target path:** `app/cyan-ds/src/pages/principles/semantic-colors.mdx`
- **Format:** MDX using [Book layout](../book-layout/spec.md) (`app/cyan-ds/src/layouts/Book.astro`)
- **Collection:** Principles
- **Dependencies:** `--color-*` tokens from `packages/cyan/src/tokens/semantic.css`, `--chroma-*` tokens (indirectly), `--cn-*` unit tokens for spacing/layout

### Page Structure

The page documents the semantic token groups with tables and inline demos:

1. **Surfaces** — surface levels 0–4 with `--color-on-surface` contrast demos. Rendered as stacked cards showing each elevation level.
2. **Background** — app background vs surface distinction
3. **Text** — text hierarchy demo: `--color-text`, `--color-text-high`, `--color-text-low`, headings
4. **Links** — default, hover, active states shown as styled link examples
5. **Buttons & Interactive** — button variants (default, light, accent, CTA) rendered as demo buttons
6. **Borders** — border token swatches with default, hover, focus states
7. **Functional / Status** — error, warning, info, success, love — colored badges or banners
8. **Inputs / Forms** — input field demo showing default, hover, focus, disabled states
9. **Theme switching note** — explain that all tokens use `light-dark()` and respond to `color-scheme`

### Inline Demos

- Surface demos: nested cards at each elevation level, showing on-surface text
- Text demos: paragraphs at each text token, demonstrating hierarchy
- Button demos: row of buttons using each button color variant
- Status demos: colored badges for error/warning/info/success/love
- All demos use `var(--color-*)`, never hardcoded values

### Anti-Patterns

- **Don't hardcode color values in demos** — always use `var(--color-*)` semantic tokens
- **Don't reference `--chroma-*` tokens directly in demos** — the whole point of this page is to show the semantic layer; demos should prove that components only need `--color-*`
- **Don't duplicate chroma docs** — link to the chroma page for palette details

## Contract

### Definition of Done

- [ ] Page exists at `app/cyan-ds/src/pages/principles/semantic-colors.mdx`
- [ ] Page uses Book layout via frontmatter
- [ ] All token groups (surfaces, text, links, buttons, borders, status, inputs) shown with demos and tables
- [ ] Demos reference tokens via `var(--color-*)`, never hardcoded values or `--chroma-*` tokens
- [ ] Page renders correctly in both light and dark mode (once semantic tokens are implemented)

### Regression Guardrails

- Inline demos must reference tokens via `var()`, never hardcoded color values
- No direct `--chroma-*` references in demo markup — only `--color-*` semantic tokens
- Page must not contain component-specific tokens (bubble, avatar, etc.)
