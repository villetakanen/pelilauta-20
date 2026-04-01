# Feature: Cyan DS App

## Blueprint

### Context

The cyan-ds app (`app/cyan-ds/`) is the living documentation and demo site for the Cyan design system. It runs on Astro with Svelte components and serves as both developer reference and visual regression surface.

### Architecture

- **Framework:** Astro with `@astrojs/svelte`
- **Path aliases:** `@cyan` → `packages/cyan/src`, `@shell` → `packages/shell/src`
- **Pages:** `src/pages/` (Astro file-based routing)
- **Layouts:** `src/layouts/` (app-specific layouts that compose the [shell package](../shell/spec.md))

### Dependencies

- **[Shell](../shell/spec.md)** — `Base.astro` (HTML document), `TopNav.svelte` (navigation)
- **[Cyan tokens](../cyan-ds/tokens/spec.md)** — design tokens loaded globally via Base.astro

### Page Types

- **Index** (`src/pages/index.astro`) — landing page, composes Base + TopNav directly
- **Book pages** (`src/pages/principles/*.mdx`, etc.) — MDX documentation pages, use the [Book layout](book-layout/spec.md)

### Sub-Specs

- [Book Layout](book-layout/spec.md) — MDX page layout
- [Units & Grid](units-and-grid/spec.md) — units token documentation page
- [Chroma](chroma/spec.md) — chroma color token documentation page
- [Semantic Colors](semantic-colors/spec.md) — semantic color mapping documentation page

## Contract

### Definition of Done

- [ ] App runs with `pnpm dev` and serves pages at localhost
- [ ] All MDX pages use the Book layout
- [ ] Token imports resolve via `@cyan` alias (loaded by shell's Base.astro)
