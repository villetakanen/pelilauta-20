# Feature: Cyan Utilities

Parent: [Cyan DS](../spec.md)

## Blueprint

### Context
Utilities provide reusable CSS classes for layout, typography, and visual concepts (like elevation) that span across multiple components. They allow composing complex layouts and visual hierarchies without writing custom CSS for every element.

### Architecture
- **Source:** `packages/cyan/src/utilities/`
- **Format:** CSS utility classes

### Sub-Specs
- [Elevation](elevation/spec.md) — visual depth and surface z-axis grouping

## Contract

### Definition of Done
- [ ] Utilities use the `--cn-*` namespace for all tokens.
- [ ] Utilities avoid `!important` unless strictly necessary for utility-first overrides.
