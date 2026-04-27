---
feature: Markdown Rendering
parent_spec: ../spec.md
---

# Feature: Markdown Rendering

> Reverse-engineered from `.tmp/pelilauta-17/src/utils/marked.ts`.

## Blueprint

### Context

User-authored content (thread bodies, replies, site pages) is stored as
markdown in Firestore and rendered to HTML at display time. v20 needs a
single, share-able helper that converts a markdown string into the same HTML
v17 produced — so any string that rendered in v17 keeps rendering identically
in v20 per `feedback_no_breaking_data_contracts`.

This spec covers only the **basic** rendering surface — the helper used by
read-only thread/reply paths (#12 epic). Richer rendering with site-aware
wikilinks and profile tags is out of scope here; see §Migration debt.

### Architecture

- **Source (v17):** `.tmp/pelilauta-17/src/utils/marked.ts`
- **v20 target:** `packages/utils/src/markdownToHTML.ts`
- **Sub-export:** add `./markdownToHTML` to `packages/utils/package.json` exports map (mirrors the existing `./log` and `./sanitizeNext` shape).
- **Co-located test:** `packages/utils/src/markdownToHTML.test.ts`.
- **API:**
  - `markdownToHTML(markdown: string): Promise<string>` — async because the underlying `marked.parse()` is async-capable and the implementation lazy-imports its dependencies.
- **Implementation contract** (v17 verbatim):
  - Dynamic-import `marked` and `marked-footnote` inside the function — avoids loading the parser into bundles that never render markdown (e.g. SSR routes that only emit metadata).
  - Construct a **fresh `Marked` instance per call** (`new Marked()`) — prevents state leakage between renders. This matches the v17 `getMarkedInstance()` rationale even though the basic helper has no extensions today.
  - Plug `marked-footnote` (`m.use(markedFootnote.default())`) — footnote syntax (`[^1]` / `[^1]: …`) renders to footnote markup.
  - Return `m.parse(markdown)` directly. No post-processing, no class injection, no truncation.
- **Dependencies:**
  - `marked` (`^15.x` — track v17's `^15.0.11` baseline)
  - `marked-footnote` (`^1.x` — track v17's `^1.2.4` baseline)
- **Consumers (initial):**
  - `packages/threads/src/components/ThreadDetail.svelte` (#15) — renders `thread.markdownContent`.
  - `packages/threads/src/components/ReplyArticle.svelte` (#17) — renders reply `markdownContent`.
- **Boundary — what this helper is and is not:**
  - This helper renders markdown to HTML for display. It does not sanitize, normalize, extract structure, or strip syntax.
  - Write paths (thread/reply create + update APIs) store `markdownContent` verbatim. v17 does no API-side preprocessing — neither does v20. Any preprocessing belongs to the editor (paste handling), an explicit migration script, or an explicit user action — not to this helper.
  - Markdown-to-plain-text stripping (used in v17 for notification bodies, RSS descriptions, SEO meta) is a sibling concern. See §Sibling helpers.
- **Constraints:**
  - **No HTML sanitization.** Output is rendered into the DOM by callers via Astro `set:html` or Svelte `{@html}`. Pelilauta-17's basic helper does not sanitize, and v20 preserves that behavior verbatim. If sanitization is required (e.g. for unauthenticated user input from a new vector), it is a separate spec — file a ticket with threat-model context first.
  - **No GFM, no breaks.** The basic helper relies on `marked` defaults (CommonMark with footnotes only). The richer surface that v17 ships in `shared/getMarked.ts` enables `gfm: true` and `breaks: true`; that surface is not part of this spec.
  - **SSR-safe.** No browser globals. Safe to call from Astro server components and from client-rendered Svelte components.
  - **One helper, two contexts.** The same module is consumed by SSR Astro frontmatter and by client Svelte components. Lazy import keeps it cheap in either context.
  - **Empty / whitespace input is not an error.** Empty string returns empty string; whitespace-only input returns whitespace-only output (whatever `marked` produces — typically empty or near-empty).
  - **Canonical render path for footnote-aware HTML.** Any v20 surface that renders `markdownContent` to HTML at display time goes through this helper. v17 had three rendering call sites (`utils/marked.ts`, bare `marked()` in RSS/handouts, `getMarkedInstance` for site/wiki); the bare-`marked()` calls were drift, not intent. v20 collapses them to two surfaces: this basic helper, and a future site-aware helper. See §Sibling helpers.

### Sibling helpers (out of scope for this spec, future homes)

These concerns share the `packages/utils/` neighbourhood with `markdownToHTML` but
are deliberately **separate features**. Listed here so future tickets land in
the right package and don't get folded into thread- or site-specific code.

- **`markdownToPlainText(markdown, maxLength?)`** — markdown-to-plain-text strip for notification bodies, RSS feed `description` fields, and SEO meta tags. v17 lives in `utils/snippetHelpers.ts` as `createPlainSnippet` (regex-based stripping; not a marked call). Belongs in `packages/utils/src/markdownToPlainText.ts`. Will be needed by Stage-3 thread writes (notification messages) and by RSS / SEO surfaces. File a separate ticket when first consumer needs it.
- **`getMarkedInstance(origin, { site?, thread? })`** — site-context renderer with `gfm: true`, `breaks: true`, wikilink extensions (`[[Page]]`, `[[site/Page]]`, `[[Page|Alias]]`, `[Page]`), and the `@profile` tag extension. v17 lives in `utils/shared/getMarked.ts` and `utils/shared/marked/createProfileTagExtension.ts`. Belongs alongside `markdownToHTML` (likely `packages/utils/src/getMarkedInstance.ts`) **or** in a forthcoming `packages/sites/` if site-aware rendering becomes site-domain-only. Spec when the sites/wiki vertical lands.
- **Tag extraction from prose (`#hashtag` regex scrape)** — v17's `extractTags()` in `utils/contentHelpers.ts`. Not used by v17's create/update thread API (tags ride as an explicit form field). Likely **not needed** in v20 unless a UI surface wants to suggest tags from prose. If revived, lives in `packages/utils/`.
- **Thread tag-index document shape (`toTagData`)** — v17's tag-index Firestore doc builder in `utils/shared/toTagData.ts`. Domain-specific (knows `tags` field semantics on `Thread` and `Page`). When ported, lives in `packages/threads/` (and a future `packages/sites/`), **not** in `packages/utils/`.
- **HTML→Markdown paste handling** — v17's `cnPasteHandler.ts` (Turndown + DOMPurify, CodeMirror extension). Editor-internal; lives with the editor component when a v20 editor lands. Not a markdown-rendering concern.

## Contract

### Definition of Done

- [ ] `markdownToHTML(markdown: string): Promise<string>` is exported from `packages/utils/src/markdownToHTML.ts`.
- [ ] `marked` and `marked-footnote` are listed under `packages/utils/package.json` `dependencies`.
- [ ] `./markdownToHTML` appears in `packages/utils/package.json` `exports` map.
- [ ] `markdownToHTML('**bold**')` resolves to a string containing `<strong>bold</strong>`.
- [ ] `markdownToHTML('Footnote[^1]\n\n[^1]: note')` resolves to a string containing footnote markup (an `<a>` to a footnote ref and a `<section class="footnotes">` or equivalent).
- [ ] `markdownToHTML('')` resolves to `''` (or a string of length 0–1) without throwing.
- [ ] `markdownToHTML('   \n\n  ')` resolves without throwing.
- [ ] Each call constructs a new `Marked` instance — no module-level singleton.
- [ ] `pnpm check` and `pnpm test` are green.

### Regression Guardrails

- The function MUST NOT throw on empty or whitespace-only input — it is called from server frontmatter where a thrown error renders a 500.
- The function MUST NOT cache state across calls. Reusing a single `Marked` instance leaks parser state between unrelated renders (the v17 reason for fresh instances).
- The function MUST remain async. Callers await it; switching to sync would silently change render order under SSR streaming.
- HTML output MUST NOT be sanitized inside this helper. Adding sanitization changes v17 byte-for-byte parity and is out of scope; file a separate ticket.
- The module MUST NOT import any browser globals at module load — it ships into both SSR and client bundles.

### Testing Scenarios

#### Scenario: renders basic markdown emphasis

```gherkin
Given the input string "**bold**"
When markdownToHTML is awaited
Then the resolved string contains "<strong>bold</strong>"
```

- **Vitest Unit Test:** `packages/utils/src/markdownToHTML.test.ts`

#### Scenario: renders a heading

```gherkin
Given the input string "# Title"
When markdownToHTML is awaited
Then the resolved string contains "<h1>Title</h1>" (allowing for trailing whitespace inside the tag)
```

- **Vitest Unit Test:** `packages/utils/src/markdownToHTML.test.ts`

#### Scenario: renders a link

```gherkin
Given the input string "[Pelilauta](https://pelilauta.fi)"
When markdownToHTML is awaited
Then the resolved string contains an <a href="https://pelilauta.fi"> tag wrapping "Pelilauta"
```

- **Vitest Unit Test:** `packages/utils/src/markdownToHTML.test.ts`

#### Scenario: renders a fenced code block

```gherkin
Given the input string "```ts\nconst x = 1;\n```"
When markdownToHTML is awaited
Then the resolved string contains a <pre><code> block whose body is the source code
```

- **Vitest Unit Test:** `packages/utils/src/markdownToHTML.test.ts`

#### Scenario: renders footnote syntax

```gherkin
Given the input string "See note[^1]\n\n[^1]: a footnote"
When markdownToHTML is awaited
Then the resolved string contains a footnote reference link
And the resolved string contains the footnote definition body "a footnote"
```

- **Vitest Unit Test:** `packages/utils/src/markdownToHTML.test.ts`

#### Scenario: empty input does not throw

```gherkin
Given the input string ""
When markdownToHTML is awaited
Then the call resolves without throwing
And the resolved string has length 0 or 1
```

- **Vitest Unit Test:** `packages/utils/src/markdownToHTML.test.ts`

#### Scenario: whitespace-only input does not throw

```gherkin
Given the input string "   \n\n  "
When markdownToHTML is awaited
Then the call resolves without throwing
```

- **Vitest Unit Test:** `packages/utils/src/markdownToHTML.test.ts`

#### Scenario: each call uses a fresh Marked instance

```gherkin
Given two consecutive calls to markdownToHTML
When the second call's input would be affected by leaked tokenizer state
Then the second call's output is identical to calling it in isolation
```

- **Vitest Unit Test:** `packages/utils/src/markdownToHTML.test.ts`

## Migration debt

These items were observed in the v17 source during reverse-spec and are
**deliberately not** carried forward into this spec. They are recorded here
so the user can decide whether to file follow-up tickets.

1. **Three rendering call sites in v17, with drift.** v17 has the basic `markdownToHTML` (this spec's source, `marked` + `marked-footnote`), bare `marked()` calls in `pages/rss/threads.xml.ts` and `pages/api/sites/[siteKey]/handouts/[handoutKey].json.ts` (no footnote extension), and the richer `getMarkedInstance(origin, { site, thread })` in `utils/shared/getMarked.ts` (GFM + breaks + wikilinks + profile-tags). Same `markdownContent` renders differently across the three surfaces — this is drift, not intent. v20 collapses them to two: this basic helper as the canonical footnote-aware path, and a future site-aware helper. Bare `marked()` should not appear in v20 — RSS and handouts go through `markdownToHTML`.
2. **No sanitization.** None of v17's three surfaces sanitize HTML. Markdown content can include raw `<script>` tags that `marked` passes through. v17 mitigates implicitly by trusting authenticated authors; v20 inherits that trust model. If reply CRUD opens to lower-trust users, an XSS-hardening pass (DOMPurify or similar) becomes mandatory.
3. **GFM/breaks asymmetry.** Strings rendered through the rich surface use `gfm: true, breaks: true`; the same string through the basic helper renders differently (no soft-break-to-`<br>`, no GFM tables). If thread bodies were ever rendered through the rich surface in v17 and the basic surface here, output will diverge. Sample threads with tables / task lists / soft breaks should be eyeballed during #15 implementation.
4. **`marked` major-version drift risk.** v17 pins `marked@^15`. Both `marked` and `marked-footnote` have changed default rendering subtly across majors (e.g. heading IDs, escaping). Track v17's exact minor when first wiring up to keep parity; document any deliberate upgrade.
5. **Notification `targetTitle` uses raw substring, not plain-text strip.** v17's `add-reply` API and client both build `targetTitle` as `markdownContent.substring(0, 50) + '...'` — leaks raw markdown syntax into the notification UI (e.g. `**bold**`, `[link](url)`). The neighbouring `message` field correctly uses `createPlainSnippet`. v20 should route both through `markdownToPlainText` (see §Sibling helpers) when notifications are wired in Stage 3.
