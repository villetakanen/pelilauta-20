# ADR-001: Pivot to Svelte 5 for Interactive Core Components

- **Status:** Accepted
- **Date:** 2026-04-09
- **Author:** Antigravity (Agentic AI)

## Context

The Cyan Design System v20 architecture is primarily "Astro-first," leveraging Server-Side Rendering (SSR) for performance and simplicity. However, Pelilauta 20 requires complex client-side interactivity, specifically **interactive collections** such as:
1. Sortable lists of gaming sessions.
2. Dynamic filtering of character cards.
3. Drag-and-drop grid layouts.

### Technical Constraint
Astro components are rendered to static HTML/CSS during build or SSR. While they can contain Svelte/React components, **Svelte components cannot render Astro components inside their reactive context (slots or children)**. 

To implement a sortable grid of `CnCard` components in Svelte:
- The parent grid must be a Svelte component.
- Every `CnCard` item in that grid must also be a Svelte component to participate in the Svelte reconciliation and reactive movement.

If we continue with Astro-only versions of core primitives (Icons, Cards, Tags), we create a "locked" architecture where interactive components must reinvent these primitives as Svelte implementations, leading to duplication and token drift.

## Decision

We will pivot the design system to provide **Svelte 5 (Runes-based) implementations** for core components that are likely to be used within interactive collections.

We will pivot the design system to provide **Svelte 5 (Runes-based) implementations** for core components that are likely to be used within interactive collections, under four strict guidelines:

1. **SSR Renderable**: Components must be 100% renderable on the server. They must not rely on browser-only globals (`window`, `document`) or logic that fails in a non-browser environment. 
2. **100% Progressive Enhancement**: All design-system level functionality (visuals, layout, core states) must be achievable without client-side JavaScript. JS is reserved strictly for "high-fidelity" enhancements (reordering, live filtering, complex animation) that occur *after* a successful static render.
3. **Lazy Upgrade**: Existing Astro components will **not** be automatically converted to Svelte. They will remain in Astro until a specific feature requirement (e.g., insertion into an interactive Svelte list) necessitates an upgrade.
4. **Svelte by Default for Future Components**: All new Design System components should be authored in **Svelte 5** by default, rather than Astro, unless they are structural/foundational layout elements (e.g., `AppShell`, `Tray`, `AppBar`).

### Implementation Rules:
- **Primitive Porting**: Primitives like `CnIcon` will be provided as Svelte components (avoiding Node-only `fs` in favor of client-safe imports where necessary) to support composition.
- **Interactive Variants**: Components like `CnCard`, `CnTag`, and `CnButton` will be implemented as Svelte 5 components to maximize their reuse across both Astro pages and Svelte-only contexts.

## Consequences

### Positive
- **End-to-End Interactivity**: Enables the implementation of sortable grids, live filters, and other complex RPG platform features.
- **Single Source of Truth**: Avoids "Shadow Design Systems" where Svelte-specific versions of components are built ad-hoc.
- **Resilient Delivery**: The "Progressive First" constraint ensures that components work perfectly for crawlers and users with slow connections/disabled JS.
- **Advanced State Management**: Leverages Svelte 5 Runes for highly performant, deterministic reactivity.

### Negative
- **Runtime Footprint**: Increases the JavaScript bundle size for pages using these interactive components.
- **Architectural Complexity**: Developers and agents must now choose between Astro and Svelte implementations based on the context of parent components.
- **Migration Cost**: Requires porting logic from existing Astro primitives to Svelte-compatible logic (e.g., removing `node:fs` dependencies for icon loading during CSR).

### Neutral
- Standardizing on Svelte 5 snippets/slots for a consistent developer experience across the repo.

## Alternatives Considered

- **Custom Elements (Web Components)**: Rejected. While framework-agnostic, Web Components have complex SSR stories (declarative shadow DOM support is still evolving) and can be less ergonomic for complex slotting compared to Svelte/Runes.
- **Astro-Only with Partial Hydration**: Rejected. It is impossible to have a Svelte-driven sorting algorithm move Astro component children around in the DOM without breaking the reactivity or losing state.

## References
- [AGENTS.md](file:///Users/ville.takanen/dev/pelilauta-20/AGENTS.md)
- [specs/cyan-ds/components/cn-card/spec.md](file:///Users/ville.takanen/dev/pelilauta-20/specs/cyan-ds/components/cn-card/spec.md)
