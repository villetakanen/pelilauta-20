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
- [Visually Hidden](visually-hidden/spec.md) — `.sr-only` accessibility utility
- [Text Caption](text-caption/spec.md) — `.text-caption` uppercase label typography
- [Flex](flex/spec.md) — `.flex-grow` and `.flex-none` flex-item primitives
- [Chip](chip/spec.md) — `.cn-chip` pill tag + `.cn-chip-list` flex-wrap row

## Contract

### Definition of Done
- [ ] Utilities use the `--cn-*` namespace for all tokens.
- [ ] Utilities avoid `!important` unless strictly necessary for utility-first overrides.
