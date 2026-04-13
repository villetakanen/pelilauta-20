# AGENTS.md

> **Project:** Pelilauta 20 pnpm workspace for RPG community platform and Cyan design system.
> **Core constraints:** spec-anchored delivery, deterministic checks over inference, smallest safe change.
> **Browser Support:** Targeted at modern (evergreen) browsers only. No legacy fallbacks required for experimental CSS features (e.g. scroll-driven animations).

## Toolchain

| Action | Command | Authority |
|---|---|---|
| Dev (main app) | `pnpm dev` | `package.json` |
| Dev (design system app) | `pnpm dev:ds` | `package.json` |
| Build | `pnpm build` | `package.json` |
| Test (unit) | `pnpm test` | `package.json` |
| Test (e2e) | `pnpm test:e2e` | `package.json` |
| Check (lint/format) | `pnpm check` | `package.json`, `biome.json` |

## Where Things Live

```
packages/cyan/src/
  components/     — DS components (Svelte 5 default; Astro for structural shells)
  layouts/        — Base.astro: root HTML shell used by all apps
  tokens/         — CSS custom properties (--cn-* namespace only)
  fonts/          — Font files


app/cyan-ds/src/
  pages/          — DS documentation site (Astro + MDX)
  layouts/        — Book.astro: MDX page wrapper

app/pelilauta/src/
  pages/          — Main RPG platform app
  stores/         — Nanostores (user preferences, auth)

specs/
  cyan-ds/        — DS component, token, layout, and documentation site contracts
  pelilauta/      — Main app feature contracts

plans/            — Transient scratch: multi-session implementation plans,
                    porting checklists. NOT authoritative. Delete when work
                    ships. See plans/README.md.
```

## Specs

- `specs/cyan-ds/**` — contracts for `packages/cyan/` and `app/cyan-ds/`
- `specs/pelilauta/**` — contracts for `app/pelilauta/`

**Spec Formatting:**
All specs MUST follow the structure outlined in `specs/TEMPLATE.md`. Importantly, specs must define automated test mappings (Vitest unit tests & Playwright E2E tests) to ensure deterministic feedback loops for agents acting on them.

## UI Architecture (Modern SSR + Progressive Svelte)

- **Astro (`.astro`)**: Reserved for structural components, shells, layouts, and page-level data fetching (e.g., `AppShell`, `AppBar`, `Tray`). Tray toggle must remain pure CSS — no client-side JavaScript.
- **Svelte 5 (`.svelte`)**: **Default for Design System components** (Cards, Tags, Buttons, Icons). This ensures compatibility across both static Astro pages and interactive Svelte collections (sortable grids, filters).
- **Core Constraints (ADR-001)**:
  - **100% SSR-Compatible**: No reliance on browser globals (`window`, `document`) or logic that breaks during server rendering.
  - **100% Progressive**: Design-system level visuals and layout MUST work without client-side JavaScript. JS is strictly for "high-fidelity" progressive enhancements.
  - **Lazy Upgrade**: Existing Astro components remain in Astro until a requirement (like insertion into a Svelte list) necessitates an upgrade.
  - **Decision rule**: If a component will ever appear inside a Svelte-managed collection (list, grid, filter), it must be Svelte. If it wraps a `<body>`, owns a page-level `<nav>`, or defines the HTML shell, it stays Astro.

## Tokens

**Only `--cn-*` tokens are active.** All other formats are deprecated:

- `--cyan-*` — deprecated, do not use in new work
- `--color-*` — deprecated, do not use in new work

If you encounter `--cyan-*` or `--color-*` in existing code, flag it as a migration debt item.
