# Feature: Cyan Design Tokens

Parent: [Cyan DS](../spec.md)

## Blueprint

### Context

Design tokens are the single source of truth for visual constants in the Cyan design system. They are consumed as CSS custom properties on `:root`, prefixed with `cn-` to avoid namespace collisions.

### Architecture

- **Source:** `packages/cyan-css/src/tokens/` (upstream: [cyan-design-system-4](https://github.com/villetakanen/cyan-design-system-4))
- **Format:** CSS custom properties on `:root`
- **Namespace:** `--cn-*`

### Sub-Specs

- [Units](units/spec.md) — spatial primitives, grid system, sizing
- [Chroma](chroma/spec.md) — color system, tonal palettes
- [Semantic](semantic/spec.md) — functional UI color mappings (surfaces, text, buttons, status)
- [Z-Index](z-index/spec.md) — stacking hierarchy for layered components

## Contract

### Definition of Done

- [ ] All tokens are `cn-`-prefixed
- [ ] All tokens are defined on `:root`
- [ ] Tokens use `rem` or `calc()` from `rem` values for accessibility scaling (exception: z-index tokens are unitless integers and exempt from this requirement)
