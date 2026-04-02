# AGENTS.md

> **Project:** Pelilauta 20 monorepo for RPG community platform and Cyan design system.
> **Core constraints:** spec-anchored delivery, deterministic checks over inference, smallest safe change.

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
  components/     — DS components (Astro or Svelte)
  tokens/         — CSS custom properties (--cn-* namespace only)
  fonts/          — Font files

packages/shell/src/
  layouts/        — Base.astro: root HTML shell used by all apps
  nav/            — TopNav.svelte: top navigation bar

app/cyan-ds/src/
  pages/          — DS documentation site (Astro + MDX)
  layouts/        — Book.astro: MDX page wrapper

app/pelilauta/src/
  pages/          — Main RPG platform app
  stores/         — Nanostores (user preferences, auth)

specs/
  cyan-ds/        — DS component and token contracts
  cyan-app/       — DS documentation site page specs
  shell/          — Shell package contracts
  pelilauta/      — Main app feature contracts
```

## Specs

- `specs/cyan-ds/**` — contracts for `packages/cyan/` and `packages/shell/`
- `specs/cyan-app/**` — contracts for `app/cyan-ds/` documentation pages
- `specs/pelilauta/**` — contracts for `app/pelilauta/`

**Spec Formatting:**
All specs MUST follow the structure outlined in `specs/TEMPLATE.md`. Importantly, specs must define automated test mappings (Vitest unit tests & Playwright E2E tests) to ensure deterministic feedback loops for agents acting on them.

## UI Architecture (Lit → Astro/Svelte)

- **Astro (`.astro`)**: Default for all structural components, shells, data-fetching, and CSS-only interactions (SSR + CSS). For example, `Tray` is CSS-driven and must be an Astro component with no client-side JavaScript.
- **Svelte 5 (`.svelte`)**: Reserved strictly for client-side progressive enhancement (CSR) where complex reactive state is unavoidable (e.g., highly interactive widgets). Use Runes (`$props`).

## Tokens

**Only `--cn-*` tokens are active.** All other formats are deprecated:

- `--cyan-*` — deprecated, do not use in new work
- `--color-*` — deprecated, do not use in new work

If you encounter `--cyan-*` or `--color-*` in existing code, flag it as a migration debt item.
