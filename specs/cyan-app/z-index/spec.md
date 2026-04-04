# Feature: Z-Index Tokens Documentation Page

Parent: [Cyan DS App](../spec.md)

## Blueprint

### Context

A living documentation page that showcases the z-index token hierarchy — the stacking order for all layered DS components. Part of the **Principles** collection. Serves as a developer reference for which layer a component occupies and a visual demo of the stacking order.

### Architecture

- **Target path:** `app/cyan-ds/src/pages/principles/z-index.mdx`
- **Format:** MDX using [Book layout](../book-layout/spec.md)
- **Collection:** Principles
- **Dependencies:** `--cn-z-*` tokens from `packages/cyan/src/tokens/z.css`

### Page Structure

1. **Overview** — explains why z-index tokens exist and the problem they solve (no magic numbers, predictable stacking)
2. **Hierarchy table** — all six tokens listed back-to-front with token name, value, and purpose
3. **Visual stack demo** — layered rectangles or cards showing the stacking order, each labeled with its token name. Demonstrates that snackbar > modal > reply-dialog > tray-button > rail > tray
4. **Usage guidance** — when to use which token, how to add a new layer

### Inline Demos

- Stack visualization: overlapping colored panels at each z-index level, positioned to show depth ordering
- All demos use `var(--cn-z-*)`, never raw z-index numbers

### Anti-Patterns

- **Don't use raw z-index numbers in demos** — always reference `var(--cn-z-*)`
- **Don't demo z-index in isolation from positioning** — z-index only works with positioned elements, demos should make this clear

## Contract

### Definition of Done

- [ ] Page exists at `app/cyan-ds/src/pages/principles/z-index.mdx`
- [ ] Page uses Book layout via frontmatter
- [ ] Hierarchy table lists all `--cn-z-*` tokens with values and purposes
- [ ] Visual stack demo shows correct layering order
- [ ] All demos use `var(--cn-z-*)`, never hardcoded values

### Regression Guardrails

- Demos must reference tokens via `var()`, never raw numbers
- Hierarchy table must stay in sync with the token spec
