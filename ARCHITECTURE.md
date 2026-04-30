# Pelilauta 20 Architecture

Canonical architecture record for Pelilauta 20 and the Cyan v20 design system. `AGENTS.md` / `CLAUDE.md` cite this file for extended context; ADRs under `docs/adr/` cite it for component-model invariants. Anything written here is binding on agent and human work alike.

## Component Model

Pelilauta 20 follows an **SSR + Progressive Enhancement** model. Server-rendered components remain functional without JavaScript; high-fidelity interactive upgrades hydrate on top where required.

### Technology selection

- **Astro (`.astro`)** — pages, structural layouts (`AppShell`, `AppBar`, `Tray`), and page-level data fetching. Astro components run in SSR and ship no client-side JavaScript by themselves.
- **Svelte 5 (`.svelte`)** — default for atom- and molecule-level Design System components (Buttons, Cards, Icons, Tags) and for domain components that may appear inside Svelte-managed collections (sortable grids, filters). Authored with runes (`$props`, `$state`, `$derived`).

### Core constraints

| Constraint | Requirement |
|---|---|
| **SSR Compatibility** | Components render on the server without errors. No top-level use of `window`, `document`, or other browser globals. |
| **Progressive First** | Visual layout and core functionality must work using only HTML and CSS. JavaScript is reserved for high-fidelity enhancements (reordering, complex filtering, real-time listeners). |
| **Lazy Upgrade** | Existing Astro components stay in Astro until a requirement forces a migration to Svelte (see ADR-001). |
| **Decision rule** | If a component will ever appear inside a Svelte-managed collection (list, grid, filter), it must be Svelte. If it wraps `<body>`, owns a page-level `<nav>`, or defines the HTML shell, it stays Astro. |

## SSR Data Flow

**The principle.** All data preparation — async work, schema parsing, expensive transforms, network calls, markdown rendering — happens **upstream** of Svelte components, not inside them.

- **Astro frontmatter** (`.astro` files): the canonical home for SSR data prep on a page. Frontmatter is async-native, runs before the response is generated, and its output participates in any HTTP-layer caching the host (Astro / Netlify) applies.
- **SSR TS modules** (`server/`, `api/`, `utils/`): pure functions called from frontmatter. Type-checked, unit-testable, free of UI concerns.
- **Svelte components**: receive prepared data as props and render synchronously. No `{#await}` for SSR data, no `markdownToHTML(...)` in templates, no Firestore reads.

### Why

1. **Caching.** Data prep in Astro frontmatter or an API route is cacheable at the response boundary. Inside a Svelte component, every render re-runs the work and bypasses any HTTP-layer cache.
2. **SSR purity.** Svelte 5 SSR renders synchronously — `{#await}` blocks render their pending branch on the server, which defeats anonymous-SSR-only pages whose entire purpose is delivering finished HTML to crawlers and slow-network users.
3. **Testability.** A sync component that accepts prepared data is a pure render function. Tests assert on rendered output, not on data fetching.
4. **Reuse.** A component that takes `{ thread, bodyHtml }` works in any host that can produce the markdown HTML. A component that knows how to fetch markdown is glued to one host.

### Pattern

When a component would naively want to do async work, lift the work to the page:

```astro
---
// app/pelilauta/src/pages/threads/[threadKey]/index.astro
import { getThread } from "@pelilauta/threads/server";
import { markdownToHTML } from "@pelilauta/utils";
import ThreadDetail from "@pelilauta/threads/components/ThreadDetail.svelte";

const thread = await getThread(Astro.params.threadKey!);
const bodyHtml = await markdownToHTML(thread?.markdownContent ?? "");
---
<ThreadDetail thread={thread} bodyHtml={bodyHtml} />
```

The component stays small and synchronous; the page owns the awaits.

### When this rule does not apply

Authenticated CSR islands (editors, real-time `onSnapshot` listeners, write actions) run after hydration and are inherently client-side. Async work there is expected — but it is a *different* class of code, lives under each package's `client/` entry, and runs only behind an authenticated session, so the anonymous-SSR contract from `AGENTS.md` is preserved.

## Workspace topology

The repo is a single pnpm workspace organised into five tiers. Each tier has a positive responsibility and a "does not own" boundary; new code lands in the tier whose responsibility matches.

### 1. Host — `app/pelilauta`

**Owns:** routes (`pages/`, `pages/api/`), page-level data fetching in Astro frontmatter, layout composition (`layouts/Page.astro` wrapping `@cyan/layouts/Page.astro`), the session/auth boundary (cookie middleware, SSR identity projection from claims), the i18n composition seam (`src/i18n.ts` registering each package's locale exports under a namespace), and the HTTP shell on API routes (status codes, headers, ETag, `Cache-Control`).

**Does not own:** schemas, domain UI, or locale strings. Each of those belongs to a domain package.

### 2. DS docs — `app/cyan-ds`

**Owns:** the living style book — a separate Astro site that documents the design system. Demos may use inline styles on demo wrappers (the carve-out from the apps-never-override-DS rule); production MDX content (prose, tables, copy) follows the ban.

**Does not own:** anything that ships in the product. The two apps deploy independently. `app/cyan-ds` is not a microfrontend subset of `app/pelilauta`.

### 3. Design system — `packages/cyan`

**Owns:** structural primitives (`CnCard`, `CnIcon`, `CnAvatar`, `CnBackgroundPoster`, `Tray`, `AppBar`, `AppShell`), layouts (`Page.astro`, content grids, card grid), tokens (`--cn-*` namespace only), fonts. Components are i18n-agnostic — strings come from props/slots.

**Does not own:** domain concepts. There is no `CnThreadCard`, no `CnChannelHeader`, no `CnPostSummary`. See §DS-vs-domain boundary below.

### 4. Domain (vertical) packages — `packages/threads`, `packages/profiles`, future `packages/sites`

**Owns:** one feature vertical each. The directory listing surface for a vertical may live inside the owning package even when the route is host-side (e.g. channel directory components live in `packages/threads/src/components/` because they consume `Channel` data). Each package ships these sub-exports:

- `./server` — SSR-safe accessors, schemas, types, read-only fetches. No `firebase/*` (non-admin) imports.
- `./client` — CSR-only writes, listeners, interactive islands. Runs only after authenticated hydration.
- `./components` — domain UI components (Svelte 5 default). May be consumed from any host page.
- `./i18n` — locale strings owned by the feature, ready to mount under a namespace by the host's composition seam.

**Does not own:** routing (host), HTTP shell on API endpoints (host), structural primitives (cyan), or cross-cutting infrastructure (firebase, utils, models, i18n engine).

### 5. Infrastructure (cross-cutting) packages — `packages/firebase`, `packages/models`, `packages/utils`, `packages/i18n`, `packages/auth`

**Owns:** services consumed by both the host and domain packages. `firebase` initialises admin and client SDKs; `models` ships shared Zod schemas; `utils` ships pure helpers (logger, markdown transforms); `i18n` ships the translation engine; `auth` ships the auth machinery (session store, `authedFetch`, login/logout islands, `AuthHandler`/`AuthChrome`).

**Does not own:** any single feature vertical. If a function reads `Thread`-shaped data, it belongs in `packages/threads/`, not in `utils/`.

### Microfrontends — explicitly out of scope

There is no microfrontend layer. `app/pelilauta` is one Astro host, deployed as one Netlify function set. Splits between packages exist for cognitive boundaries inside that single deploy, not to enable independent shipping. Patterns that exist only to share code across hosts (re-export shims, framework-agnostic adapters, "package as redistributable unit") are not in scope; if a future split into multiple hosts is genuinely required, that decision lands as an ADR before any code moves.

## DS-vs-domain boundary

Cyan holds **structural** primitives only — visual building blocks defined in terms of geometry, elevation, typography, tokens, slots. **Domain-shaped** components — anything whose API or markup mentions a feature concept (`Thread`, `Channel`, `Profile`, `Site`, `Reply`, etc.) — live in the owning feature package's `./components` and compose cyan primitives underneath.

The deciding test for any new component:

- Does its props or its rendered markup reference a feature concept (a domain type, a feature route, a domain string)? → **Domain**, lives in `packages/<feature>/`.
- Is its API expressible in geometry, elevation, slots, tokens, and DS-internal vocabulary alone? → **DS**, lives in `packages/cyan/`.

Practical consequences:

- A "missing v17 visual feature" lands in a domain spec only when the resolution is a consumption choice (which DS slot to fill, which token to bind). If the resolution requires a new structural primitive, it escalates to `specs/cyan-ds/` and lands in `packages/cyan/` first.
- Names like `CnThreadCard`, `CnChannelInfoRow`, `CnPostSummary` should never appear. If a plan or commit message references one, it is a hallucination — check `packages/<domain>/src/components/` for the real component before assuming anything is missing.
- DS components carry no locale-bound strings. The host (or the consuming domain component) supplies text via props or slots; cyan stays i18n-agnostic.

## Package boundaries

**Packages exist for cognitive boundaries, not for distribution.** The pnpm workspace is sized so that humans and AI agents can hold one package's working set in mind (or in context) at a time. Boundaries serve maintainability and explicit dependency direction; they do not serve reuse, redistribution, or multi-host stubbing.

Practical consequences:

- **Routes stay in the host.** API route handlers (`app/pelilauta/src/pages/api/**`) own the HTTP shell — status codes, ETag, cache headers, `Cache-Control` directives. The host imports schemas and accessors from the relevant package; the package never ships a route handler. Specs document what API routes exist, so reuse-via-stub-and-export solves a problem nobody has.
- **No multi-host stubs.** Pelilauta has effectively one host (`app/pelilauta`). Patterns that exist only to share code across hosts — re-export shims, framework-agnostic adapters, "package as redistributable unit" — are not worth their cost.
- **Cross-package refactors are cheap.** Because there is no `workspace:*` consumer outside this repo, and no published version, moving symbols between packages is a normal operation, not a breaking change. Don't design abstractions to insulate packages from each other's churn.
- **Default to the host until pressure justifies a split.** "Could this go in a package?" is a weaker question than "does it help to put this in a package?" Splits are justified by domain coherence, dependency-direction enforcement, or working-set size — not by speculative reuse.

This complements the ban on framing packages as independently versionable: that rule says what packages are *not* (a release boundary); the rule above says what they *are* (a cognitive boundary).

## Text conventions

- **Ellipsis: Unicode `…` (U+2026), universally.** Truncation, elision, and "more to come" markers in any generated text — UI snippets, SEO `<meta name="description">`, notification bodies, RSS `description`, plain-text and HTML projections of markdown — use the single Unicode horizontal ellipsis character, not three ASCII dots `...`. One glyph, one code point, semantically a punctuation mark, consistent across surfaces. Helpers that produce truncated strings (e.g. `packages/utils/src/markdownToPlainText.ts`) emit `…` and callers that prefer ASCII override at the call site rather than at the helper.

## Records

### Architecture Decision Records (ADR)

- [ADR-001: Pivot to Svelte 5 for Interactive Core Components](docs/adr/0001-svelte-pivot-for-interactive-components.md)

## Directories

Top-level layout (tier responsibilities are documented in §Workspace topology):

- `app/pelilauta/` — host application.
- `app/cyan-ds/` — living style book.
- `packages/cyan/` — design system.
- `packages/threads/`, `packages/profiles/` — domain (vertical) packages.
- `packages/auth/`, `packages/firebase/`, `packages/i18n/`, `packages/models/`, `packages/utils/` — infrastructure (cross-cutting) packages.
- `specs/` — feature contracts (intent + DoD + scenarios).
- `docs/adr/` — Architecture Decision Records.
