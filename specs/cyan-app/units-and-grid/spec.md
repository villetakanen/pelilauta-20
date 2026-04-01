# Feature: Units & Grid Documentation Page

> Reversed from: https://github.com/villetakanen/cyan-design-system-4/blob/main/apps/cyan-docs/src/books/principles/units-and-grid.mdx

## Blueprint

### Context

A living documentation and demo page that showcases the Cyan unit token system. Part of the **Principles** collection in the cyan-ds app. Serves as both a reference for consumers and a visual regression surface — if the tokens break, this page shows it.

### Architecture

- **Target path:** `app/cyan-ds/src/pages/principles/units-and-grid.mdx`
- **Format:** MDX using [Book layout](../book-layout/spec.md) (`app/cyan-ds/src/layouts/Book.astro`)
- **Collection:** Principles
- **Dependencies:** `--cn-*` unit tokens from `packages/cyan/src/tokens/`, `--chroma-*` palette tokens (for demo visuals), atomic CSS classes

### Page Structure

The page documents token groups with tables and inline demos:

1. **Core Spacing** — `--cn-grid`, `--cn-gap`, `--cn-line`
2. **Responsive Sizing** — container queries replace the legacy `--cn-breakpoint-*` tokens
3. **Button Sizing** — physical touch target (56px), visual size (38px), navigation size (56px); includes visual comparison demo with three circles
4. **Border Radius** — small (4px) through xl (24px)
5. **Icon Sizes** — xsmall (16px) through xlarge (128px)
6. **Layout Dimensions** — rail width (80px), tray width (336px)
7. **Atomic CSS Classes** — flexbox, grid, and spacing utility overview with a card example

### Inline Demos

The button sizing section renders three `<div>` circles styled with token `var()` references (`--cn-button-physical-size`, `--cn-button-size`, `--cn-navigation-button-size`) against `--chroma-primary-40` backgrounds. This makes the demo a live regression test — if the tokens change, the circles change.

The atomic CSS card example uses `.flex`, `.flex-col`, `.gap-2`, `.p-2`, `.elevation-1`, `.radius-m` to demonstrate layout composition.

### Token Availability

The following tokens are spec'd but **not yet implemented** in `packages/cyan/src/tokens/`. The page must still reference them by their canonical `--cn-*` names, but demos using missing tokens will not render correctly until the tokens are added.

**Missing from v20 (required by this page):**

| Token | Spec | Status |
|---|---|---|
| `--cn-grid` | [units spec](../../cyan-ds/tokens/units/spec.md) | Not implemented |
| `--cn-gap` | [units spec](../../cyan-ds/tokens/units/spec.md) | Not implemented |
| `--cn-line` | [units spec](../../cyan-ds/tokens/units/spec.md) | Not implemented |
| `--cn-button-physical-size` | [units spec](../../cyan-ds/tokens/units/spec.md) | Not implemented |
| `--cn-button-size` | [units spec](../../cyan-ds/tokens/units/spec.md) | Not implemented |
| `--cn-navigation-button-size` | [units spec](../../cyan-ds/tokens/units/spec.md) | Not implemented |
| `--cn-border-radius-*` | [units spec](../../cyan-ds/tokens/units/spec.md) | Not implemented |
| `--cn-icon-size-*` | [units spec](../../cyan-ds/tokens/units/spec.md) | Not implemented |
| `--cn-width-rail` | [units spec](../../cyan-ds/tokens/units/spec.md) | Not implemented |
| `--cn-width-tray` | [units spec](../../cyan-ds/tokens/units/spec.md) | Not implemented |
| `--chroma-primary-40` | [chroma spec](../../cyan-ds/tokens/chroma/spec.md) | Not implemented |

> Note: existing `--cyan-space-*` and `--cyan-radius-*` tokens in `packages/cyan/src/tokens/` are scaffolding placeholders. The canonical token names are `--cn-*` as defined in the upstream specs.

### Migration Notes

- Breakpoint tokens (`--cn-breakpoint-*`) are **retired for v20** — replaced by container queries (see [units token spec](../../cyan-ds/tokens/units/spec.md)). The docs page should explain the container query approach instead of listing breakpoint tokens

### Anti-Patterns

- **Don't hardcode pixel values in demos** — always use `var(--cn-*)` so demos stay in sync with tokens
- **Don't separate docs from demos** — inline HTML demos that consume real tokens are the point; they're visual regression tests
- **Don't use placeholder token names** — use the canonical `--cn-*` names even if the implementation doesn't exist yet

## Contract

### Definition of Done

- [ ] Page exists at `app/cyan-ds/src/pages/principles/units-and-grid.mdx`
- [ ] Page renders all token groups with accurate tables
- [ ] Button sizing demo shows three circles at correct relative sizes using token `var()` references
- [ ] Atomic CSS card example renders correctly using only utility classes
- [ ] Responsive sizing section explains container query approach (no breakpoint tokens)
- [ ] Missing tokens are clearly flagged in the page content until implemented

### Regression Guardrails

- Inline demos must reference tokens via `var()`, never hardcoded values
- Token tables must match the actual computed values from the token source
