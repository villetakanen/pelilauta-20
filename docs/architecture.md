# Pelilauta Architecture

## Component Model (Cyan v20)

Pelilauta 20 and the Cyan Design System follow a **SSR + Progressive Enhancement** model. We favor server-rendered components that remain functional even without JavaScript, while allowing for high-fidelity interactive "upgrades" where necessary.

### 1. Technology Selection

- **Astro (`.astro`)**: Used for pages, structural layouts (App Bars, Shells, Trays), and page-level data fetching. Astro components are strictly SSR and should contain no client-side JavaScript.
- **Svelte 5 (`.svelte`)**: The **default** for all atom-level and molecule-level Design System components (Buttons, Cards, Icons). This ensures that components can be used in both static Astro pages and interactive Svelte-managed collections (like sortable lists).

### 2. Core Constraints

| Constraint | Requirement |
|---|---|
| **SSR Compatibility** | Components must render on the server without errors. No top-level use of `window`, `document`, or other browser globals. |
| **Progressive First** | Visual layout and core functionality must work using only HTML and CSS. JavaScript should only be used for "high-fidelity" enhancements (e.g., reordering, complex filtering). |
| **Lazy Upgrade** | Existing components stay in Astro until a requirement forces a migration to Svelte (see ADR-001). |

## Records

### Architecture Decision Records (ADR)

- [ADR-001: Pivot to Svelte 5 for Interactive Core Components](adr/0001-svelte-pivot-for-interactive-components.md)

## Directories

- `packages/cyan/` — Design system source (Tokens, Components, Layouts).
- `app/cyan-ds/` — Living Style Book documentation app.
- `app/pelilauta/` — Main application.
- `specs/` — Functional and design contracts.
