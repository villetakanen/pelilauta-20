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

## Text conventions

- **Ellipsis: Unicode `…` (U+2026), universally.** Truncation, elision, and "more to come" markers in any generated text — UI snippets, SEO `<meta name="description">`, notification bodies, RSS `description`, plain-text and HTML projections of markdown — use the single Unicode horizontal ellipsis character, not three ASCII dots `...`. One glyph, one code point, semantically a punctuation mark, consistent across surfaces. Helpers that produce truncated strings (e.g. `packages/utils/src/markdownToPlainText.ts`) emit `…` and callers that prefer ASCII override at the call site rather than at the helper.

## Records

### Architecture Decision Records (ADR)

- [ADR-001: Pivot to Svelte 5 for Interactive Core Components](docs/adr/0001-svelte-pivot-for-interactive-components.md)

## Directories

- `packages/cyan/` — design system source (tokens, components, layouts).
- `packages/threads/`, `packages/auth/`, `packages/firebase/`, `packages/utils/`, `packages/models/`, `packages/i18n/` — domain and infrastructure packages.
- `app/cyan-ds/` — living style book documentation site.
- `app/pelilauta/` — main application.
- `specs/` — feature contracts (intent + DoD + scenarios).
- `docs/adr/` — Architecture Decision Records.
