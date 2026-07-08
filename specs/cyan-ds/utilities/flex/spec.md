---
feature: Flex utilities (.flex-grow, .flex-none)
status: draft
last_major_review: 2026-05-02
parent_spec: ../spec.md
---

# Feature: Flex utilities (`.flex-grow`, `.flex-none`)

Parent: [Utilities](../spec.md)

## Blueprint

### Context

`.flex-grow` and `.flex-none` are the canonical primitives for distributing
space inside flex rows that the design system already lays out — most
visibly the actions slot of `CnCard`, but the same pattern recurs in any
toolbar-style row a feature builds out of DS-supplied flex containers.

A consumer shouldn't need to drop a `<style>` block or an inline
`flex: 1` to push a sibling to the right edge of an actions row; the DS
should provide the verb. These utilities are the verb.

Reverse-specced from cyan-4's `flex.css`
(`.tmp/cyan-design-system-4/packages/cyan-css/src/atomics/flex.css`)
where `.grow` and `.flex-none` were the same primitives under different
names. v20 standardises on the `.flex-*` prefix for consistency with
`.flex-grow` reading as a single token rather than a bare descriptor.

### Architecture

- **Source:** `packages/cyan/src/utilities/flex.css`. Imported from
  `packages/cyan/src/utilities/index.css` so both classes are reachable
  on every cyan-built page.
- **API contract:** authors apply `class="flex-grow"` or
  `class="flex-none"` to any flex item. The classes set `flex-grow` only;
  no other flex properties (`flex-shrink`, `flex-basis`, `flex-direction`)
  are touched. Composition with the parent's flex layout — direction,
  alignment, gap — is the parent's responsibility.
- **Computed properties:**
  - `.flex-grow` → `flex-grow: 1;`
  - `.flex-none` → `flex-grow: 0; flex-shrink: 0;`
- **Constraints:**
  - **Leaf utilities, no `!important`.** Specificity is base.
  - **Globally available.** No import or composition setup at the call
    site.
  - **Layout-direction agnostic.** Works in row, column, or wrap layouts —
    the utility only sets growth, not direction.

### Book Page

- **Target path:** `app/cyan-ds/src/content/utilities/flex.mdx` (new).
- **Structure:**
  - One-line intent statement.
  - Live demo: a flex row with three pills, the middle one carrying
    `.flex-grow`, demonstrating that the outer pills hug the edges.
  - Live demo: a flex row of buttons where one carries `.flex-none`,
    showing it stays its intrinsic width while siblings shrink.
  - Properties table with the two classes' computed values.

## Contract

### Definition of Done

- [x] `packages/cyan/src/utilities/flex.css` defines exactly one ruleset
      per class — `.flex-grow` and `.flex-none` — and nothing else.
- [x] `.flex-grow` resolves `flex-grow: 1` on its element.
- [x] `.flex-none` resolves `flex-grow: 0` and `flex-shrink: 0` on its
      element.
- [x] `packages/cyan/src/utilities/index.css` imports `./flex.css`.
- [x] Composing `.flex-grow` on a child of `nav.actions` (CnCard's
      actions slot, which the cn-card spec now lays out as a flex row)
      causes that child to expand and push later siblings toward the row
      end.

### Regression Guardrails

- **No `!important`.** These utilities lose to in-component overrides on
  purpose — they're a *default*, not a hammer.
- **No siblings on the contract.** This spec scopes `.flex-grow` /
  `.flex-none` only. Direction, gap, and alignment utilities (`.flex-row`,
  `.gap-1`, etc.) are out of scope and should not be added here without
  a separate spec entry.
- **`.flex-grow` does not implicitly set `flex-basis`.** Authors who need
  a specific basis declare it explicitly at the call site.

### Testing Scenarios

#### Scenario: .flex-grow expands a flex child

```gherkin
Given a flex row container with two children
And the first child carries class="flex-grow"
When computed styles are read for the first child
Then flex-grow resolves to 1
And the first child's box width exceeds the second child's intrinsic width
```

#### Scenario: .flex-none holds a child at intrinsic width

```gherkin
Given a flex row container with three children
And the middle child carries class="flex-none"
When the parent's available width shrinks below the sum of children's intrinsic widths
Then the middle child's box width remains at its intrinsic width
And other children shrink first
```

#### Scenario: One ruleset per class

```gherkin
Given the cyan utility CSS bundle
When all rulesets matching the selectors ".flex-grow" and ".flex-none" are enumerated
Then exactly one ruleset is found per selector
And both rulesets live in packages/cyan/src/utilities/flex.css
```
