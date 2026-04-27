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
| Check (types) | `pnpm check:types` | `package.json`, `tsconfig.json` |
| Verify (full gate chain) | `pnpm verify` | `scripts/verify.sh` |
| Ship (human convenience) | `pnpm ship "msg"` | `scripts/ship.sh` |

## Quality gates

A change is shippable only when every package or app it touches is clean across all gates. "Pre-existing" is never a pass.

| Gate | Command | Acceptance |
|---|---|---|
| Lint / format | `pnpm check` | zero warnings on any modified package |
| Type check | `pnpm check:types` | clean |
| Build | `pnpm build` | clean |
| Unit tests | `pnpm test` | all green |
| E2E | `pnpm test:e2e` | all green before `/ship` |

Run all five with `pnpm verify` (`scripts/verify.sh`).

**Cleanup radius.** When you modify a file under `packages/X/` or `app/X/`, *that entire package* must be clean — including pre-existing warnings or test failures you didn't introduce. Fix them in the same commit; that is in-scope, not scope creep. Other packages are out of scope unless the user asks.

**When a gate is red.** Stop. Surface it. Options are (a) fix it now, (b) skip/mark the test with a tracking note, (c) explicit user opt-in to ship anyway. Never pick (c) on agent authority.

**Convenience vs authority.** `pnpm verify` runs the gates; `pnpm ship` runs them then commits and pushes. The script `scripts/ship.sh` uses `git add .` and is for **human** use — agents stage files explicitly in the chat loop and never invoke `pnpm ship` directly.

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

## Data contracts

v20 is a code refresh, not a schema redo. Firestore document shapes, collection layouts, field names, and field types from v17 are preserved verbatim.

- **Allowed:** adding optional fields with `.default()` (existing docs parse cleanly).
- **Not allowed without explicit user approval:** renames, retypes, structural moves, collection reshapes.
- A v17 quirk that costs nothing to keep stays, even if a greenfield design would do it differently. "Modernization" instincts do not override this.
- Accessor / API surfaces (e.g. `getThreads({ public: false })`) MAY use modern naming that maps to legacy storage names internally — that is API ergonomics, not a contract change.

## UI Architecture (Modern SSR + Progressive Svelte)

- **Astro (`.astro`)**: Reserved for structural components, shells, layouts, and page-level data fetching (e.g., `AppShell`, `AppBar`, `Tray`). Tray toggle must remain pure CSS — no client-side JavaScript.
- **Svelte 5 (`.svelte`)**: **Default for Design System components** (Cards, Tags, Buttons, Icons). This ensures compatibility across both static Astro pages and interactive Svelte collections (sortable grids, filters).
- **Core Constraints (ADR-001)**:
  - **100% SSR-Compatible**: No reliance on browser globals (`window`, `document`) or logic that breaks during server rendering.
  - **100% Progressive**: Design-system level visuals and layout MUST work without client-side JavaScript. JS is strictly for "high-fidelity" progressive enhancements.
  - **Lazy Upgrade**: Existing Astro components remain in Astro until a requirement (like insertion into a Svelte list) necessitates an upgrade.
  - **Decision rule**: If a component will ever appear inside a Svelte-managed collection (list, grid, filter), it must be Svelte. If it wraps a `<body>`, owns a page-level `<nav>`, or defines the HTML shell, it stays Astro.

## Server architecture

- **No Firebase Cloud Functions.** Server-side logic lives in Astro API routes (`app/pelilauta/src/pages/api/**`), deployed as Netlify functions. Use `firebase-admin` inside API routes with service-account credentials. Adding a `functions/` directory or `firebase-functions` dependency requires explicit spec-level justification.
- **Anonymous = SSR-only.** Pages without an authenticated session render as pure SSR with no client-side JavaScript: no Firebase subscriptions, no editors, no CSR mounting. This is the SEO surface and must remain crawlable and lean.
- **Authenticated = SSR shell + CSR mount.** Once a valid session cookie is present, SSR still renders the base shell; Svelte islands hydrate on top for editors, subscribed Firestore data, and write actions.
- **Write actions on anonymous pages degrade to login prompts** (`<a href="/login?next=...">`), not disabled JS widgets.
- **Don't design features that require a CSR shell on every page** — that defeats the anonymous-SSR contract.

## Tokens

**Only `--cn-*` tokens are active.** All other formats are deprecated:

- `--cyan-*` — deprecated, do not use in new work
- `--color-*` — deprecated, do not use in new work

If you encounter `--cyan-*` or `--color-*` in existing code, flag it as a migration debt item.

## Apps never override the DS

App pages and app components MUST NOT use inline `style="..."` attributes or page-local `<style>` blocks to define layout, typography, or theming. Missing layout or typography patterns are DS bugs — escalate to `packages/cyan/` and spec a new primitive, do not paper over at the app layer.

**Exception (docs site):** `app/cyan-ds/**` MAY use inline styles on demo-swatch wrappers, because demonstrating primitives in varied contexts is the docs site's purpose. Production MDX content (prose, tables, copy) still follows the ban.

**Exception (deferred tech debt):** a feature's spec §Out of Scope may explicitly defer a DS escalation with a tracker link and a `/* DEFERRED */` marker comment; such deferrals are tech debt, not precedent.

**DS vs domain boundary.** Cyan DS holds *structural* primitives only — no `Cn**` components for domain concepts. Domain-shaped components (e.g. `ThreadCard`, `ChannelHeader`, `SitePageHeader`) live in their feature package (`packages/threads/`, future `packages/sites/`, etc.) and compose DS primitives underneath. If a plan mentions `CnThreadSummary`, `CnPostCard`, or similar, it's a hallucination — check `packages/<domain>/src/components/` before declaring a domain component missing.

## Workspace conventions

- **pnpm workspace, not a multi-package monorepo.** Feature packages share one version and release cycle; nothing is published to a registry. Cross-package refactors are cheap and normal — don't design abstractions to insulate packages from each other's churn. The release boundary is `app/pelilauta` and `app/cyan-ds`, not the packages. Inter-package deps use `workspace:*`.
- **Commit subjects are all-lowercase kebab-case.** Commitlint rejects pascal-case, sentence-case, and upper-case subjects. Code identifiers that are PascalCase in source (`AppBar.astro`, `CnCard.svelte`) become kebab-case in the subject (`app-bar`, `cn-card`). Body can keep original casing.
- **Reverse-spec before implementing any DS primitive.** When asked to implement a primitive that exists in cyan-4, run `/reverse-spec` against the cyan-4 source before writing any code. Inventing an implementation without checking upstream leads to wrong abstraction (Svelte component when CSS classes suffice) and wrong tokens.
