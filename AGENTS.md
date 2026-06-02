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
| Check (Astro) | `pnpm astro:check` | `package.json`, `astro.config.mjs` |

## Quality gates

Gates are enforced by `lefthook` at git boundaries. `pnpm install` wires them.

| Boundary | Gates |
|---|---|
| pre-commit | `check`, `check:types`, `astro:check` |
| pre-push | `build`, `test`, `spec:coverage`, `test:e2e` |

`lefthook.yml` is the only definition of the chain. Bypass is `--no-verify` — explicit, visible, never used on agent authority.

**Cleanup radius.** When you modify a file under `packages/X/` or `app/X/`, that entire package must be clean across the gates that apply to it — including pre-existing failures you didn't introduce. Fix them in the same commit.

**When a gate is red.** Fix it, mark the test with a tracking note, or get explicit user opt-in to bypass. Agents never pick bypass on their own authority.

**During iteration.** Hooks run at the boundary. Don't run the full chain mid-cycle; run only the focused command for the package you touched (`pnpm --filter <package> test`).

## Change tiers

Match process weight to change scope. The tier is decided at task start; in ambiguous cases the lower tier wins unless the user upgrades it.

| Tier | What it is | Process |
|---|---|---|
| **Trivial** | Single file, ≤ ~20 lines, no new public API, no schema change, no new files. Examples: copy edits, component prop swaps, dep bumps, small refactors confined to one function. | Edit → focused test if uncertain → ship. No spec, no critic, no mid-cycle full chain. Hooks gate `/ship`. |
| **Standard** | A feature with a clear contract — new component, sidebar widget, API endpoint, page route. Single package or two-package change. | Spec → dev → focused tests during iteration → ship. Critic optional. Hooks gate `/ship`. |
| **High-risk** | Cross-package refactor, data-contract change, security-sensitive path (auth, write endpoints), new shared primitive. | Spec → dev → critic → manual browser check → ship. Hooks gate `/ship`. |

**Spec depth follows tier.** Trivial tasks need no spec. Standard tasks need a spec scoped to user-observable contracts. High-risk tasks may justify deeper architecture notes and more scenarios.

**Critic-cycle invocation.** `/assemble` runs dev → critic by default. For Trivial tasks, `/assemble` short-circuits to dev only (no critic). Standard tasks use the critic only if there's reason to (e.g. a tricky composition, a contract update the dev might miss). High-risk tasks always use the critic.

**Gates during cycles.** Don't run the full chain per cycle. Hooks run it at commit and push. During iteration, run only what you need to confirm the change works — typically `pnpm --filter <package> test` for the package you touched.

## Spec discipline

Specs describe **intent and observable contract** only. Implementation rationale, decision history, and "we chose X because Y" prose belong in code comments, ADRs (`docs/adr/`), or commit messages — not in `specs/`.

**Do**
- State what the feature is, what the reader sees, and what the contract is.
- Reference file paths instead of restating implementation.
- Cap scenarios at 5-7. More than that almost always means more than one feature; split into sub-specs.

**Don't**
- Defend implementation choices in the spec. ("We use `z.preprocess` because…") If the choice needs defending, that's an ADR or a code comment.
- Restate Architecture as Constraints in negative form. (If Architecture says "markdown rendered upstream," don't also add "MUST NOT call markdownToHTML inside templates" as a Constraint — same statement, different polarity, doubled maintenance.)
- Create scenarios that defend against hypothetical regressions of code being written in the same diff. ("What if `.some()` is changed back to `[0]` index check") That belongs in code review, not in the spec.

Verification artifacts (tests, lint rules) hook back to scenarios via `Verifies:` tags — see `specs/VERIFICATION.md`. Tags are a **navigation** tool ("find me the test for this contract"), not a forcing function. Load-bearing contracts should be covered by a tagged test. Aspirational or visually-validated scenarios may stay un-tagged.

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
All specs MUST follow the structure outlined in `specs/TEMPLATE.md`. Specs describe **intent** — contracts, scenarios, regression guardrails — and stay silent on which tool verifies them. Each Gherkin scenario MUST be covered by at least one **verification artifact** (test, lint rule, build check, anything deterministic that runs in a gate); the artifact declares upward via a `Verifies:` tag. See `specs/VERIFICATION.md` for the convention and registry. Run `pnpm spec:coverage` to print the inverse map; it fails on orphan tags. Legacy specs using the old `**Vitest Unit Test:**` / `**Playwright E2E Test:**` slots are grandfathered — migrate when you next touch them.

## Data contracts

v20 is a code refresh, not a schema redo. Firestore document shapes, collection layouts, field names, and field types from v17 are preserved verbatim.

- **Allowed:** adding optional fields with `.default()` (existing docs parse cleanly).
- **Not allowed without explicit user approval:** renames, retypes, structural moves, collection reshapes.
- A v17 quirk that costs nothing to keep stays, even if a greenfield design would do it differently. "Modernization" instincts do not override this.
- Accessor / API surfaces (e.g. `getThreads({ public: false })`) use modern naming and may map to legacy storage names internally. Canonical rule: [`ARCHITECTURE.md`](ARCHITECTURE.md) §Accessor naming. That is API ergonomics, not a contract change.

## UI Architecture (Modern SSR + Progressive Svelte)

> Canonical record: [`ARCHITECTURE.md`](ARCHITECTURE.md). The points below are the agent-facing summary; consult `ARCHITECTURE.md` for the full component model, SSR data-flow rules, and ADR index.

- **Astro (`.astro`)**: Reserved for structural components, shells, layouts, and page-level data fetching (e.g., `AppShell`, `AppBar`, `Tray`). Tray toggle must remain pure CSS — no client-side JavaScript.
- **Svelte 5 (`.svelte`)**: **Default for Design System components** (Cards, Tags, Buttons, Icons). This ensures compatibility across both static Astro pages and interactive Svelte collections (sortable grids, filters).
- **Core Constraints (ADR-001)**:
  - **100% SSR-Compatible**: No reliance on browser globals (`window`, `document`) or logic that breaks during server rendering.
  - **100% Progressive**: Design-system level visuals and layout MUST work without client-side JavaScript. JS is strictly for "high-fidelity" progressive enhancements.
  - **Lazy Upgrade**: Existing Astro components remain in Astro until a requirement (like insertion into a Svelte list) necessitates an upgrade.
  - **Decision rule**: If a component will ever appear inside a Svelte-managed collection (list, grid, filter), it must be Svelte. If it wraps a `<body>`, owns a page-level `<nav>`, or defines the HTML shell, it stays Astro.
- **SSR data flow** (see `ARCHITECTURE.md` §SSR Data Flow): Async work, schema parsing, markdown rendering, and other data prep happen **upstream** of Svelte components — in Astro frontmatter or SSR TS modules. Svelte components receive prepared data as props and render synchronously. No `{#await}` for SSR data, no `markdownToHTML(...)` in templates, no Firestore reads inside components. Reasons: caching, SSR purity (Svelte 5's `{#await}` renders its pending branch on the server), testability, host reuse.

## Server architecture

- **No Firebase Cloud Functions.** Server-side logic lives in Astro API routes (`app/pelilauta/src/pages/api/**`), deployed as Netlify functions. Use `firebase-admin` inside API routes with service-account credentials. Adding a `functions/` directory or `firebase-functions` dependency requires explicit spec-level justification.
- **Anonymous = SSR-only and cache-shareable.** Pages without an authenticated session render content fully at the server: no client-side data fetching, no Firebase subscriptions, no editors, no per-viewer state resolution. This is the SEO surface and must remain crawlable, lean, and byte-identical across all anonymous viewers. Decorative or visual `client:*` islands (animations, scroll effects, theme toggles, and similar enhancements that don't fetch data, render content, or vary by viewer identity) are permitted on anonymous renders provided they preserve cache-shareability.
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

**DS vs domain boundary.** Canonical contract lives in [`ARCHITECTURE.md`](ARCHITECTURE.md) §DS-vs-domain boundary. Short version: cyan holds structural primitives only; anything whose API or markup names a feature concept (`Thread`, `Channel`, `Profile`, ...) lives in the owning feature package's `./components`. Names like `CnThreadCard` or `CnPostSummary` should never appear; if a plan references one, check `packages/<domain>/src/components/` first.

## Workspace conventions

- **pnpm workspace, not a multi-package monorepo.** Feature packages share one version and release cycle; nothing is published to a registry. Cross-package refactors are cheap and normal — don't design abstractions to insulate packages from each other's churn. The release boundary is `app/pelilauta` and `app/cyan-ds`, not the packages. Inter-package deps use `workspace:*`.
- **Commit subjects are all-lowercase kebab-case.** Commitlint rejects pascal-case, sentence-case, and upper-case subjects. Code identifiers that are PascalCase in source (`AppBar.astro`, `CnCard.svelte`) become kebab-case in the subject (`app-bar`, `cn-card`). Body can keep original casing.
- **Reverse-spec before implementing any DS primitive.** When asked to implement a primitive that exists in cyan-4, run `/reverse-spec` against the cyan-4 source before writing any code. Inventing an implementation without checking upstream leads to wrong abstraction (Svelte component when CSS classes suffice) and wrong tokens.
