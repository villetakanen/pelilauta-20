---
feature: Markdown to Plain Text Strip
status: draft
maturity: design
last_major_review: 2026-04-27
parent_spec: ../spec.md
---

# Feature: Markdown to Plain Text Strip

> Reverse-engineered from `.tmp/pelilauta-17/src/utils/snippetHelpers.ts` (`createPlainSnippet`). Sibling to the rendering helper specced at `../spec.md` (`markdownToHTML`). Renamed for v20 — see §Migration debt.

## Blueprint

### Context

Several v20 surfaces need a plain-text projection of `markdownContent`: SEO `<meta name="description">` (per `specs/cyan-ds/layouts/seo/spec.md` Stage-1 DoD), thread-card snippets in stream lists (`packages/threads/src/components/ThreadCard.svelte:21`), and future notification bodies and RSS feed `description` fields. v17 served all of these from one helper — `createPlainSnippet` — implemented as a regex-based stripper rather than a marked round-trip.

v20 has no shared helper yet. ThreadCard ships an inline copy at `ThreadCard.svelte:25–52` (byte-for-byte the v17 logic, with `…` substituted for `...`). The seo spec assumes a shared helper at `@pelilauta/utils/markdownToPlainText` and Stage-1 makes it required. This spec defines that shared helper so the inline drift collapses and the SEO path has a deterministic source of truth.

### Architecture

- **v20 target:** `packages/utils/src/markdownToPlainText.ts`.
- **Co-located test:** `packages/utils/src/markdownToPlainText.test.ts`.
- **Sub-export:** add `./markdownToPlainText` to `packages/utils/package.json` `exports` (mirrors the existing `./markdownToHTML`, `./log`, `./sanitizeNext` shape).
- **API:**
  - `markdownToPlainText(markdown: string, maxLength?: number): string`
  - `maxLength` defaults to `220` (v17 verbatim).
  - Synchronous. Pure function — no side effects, no module-level state.
- **Implementation contract** (v17 verbatim, port the regex order exactly):
  1. Strip ATX headers: `^#{1,6}\s+` (multiline).
  2. Collapse images to alt text: `!\[([^\]]*)\]\([^)]+\)` → `$1`. **Must run before link collapse** because the image syntax `![alt](url)` shares the trailing `[…](…)` shape.
  3. Collapse links to text: `\[([^\]]+)\]\([^)]+\)` → `$1`.
  4. Strip bold (`**…**` / `__…__`) and italic (`*…*` / `_…_`) markers, in that order.
  5. Remove fenced code blocks (` ```…``` `, multiline) entirely.
  6. Strip inline code: `` `([^`]+)` `` → `$1`.
  7. Strip list markers: unordered (`-`, `*`, `+`) and ordered (`\d+\.`).
  8. Strip blockquote markers: `^\s*>\s+`.
  9. Strip horizontal rules: `^[-*_]{3,}$`.
  10. Strip raw HTML tags: `<[^>]*>`.
  11. Collapse `\n\n+` → ` `, `\n` → ` `, `\s+` → ` `, then `.trim()`.
  12. Truncation: if `text.length > maxLength`, take `text.substring(0, maxLength)`; if the last space inside that window is past `maxLength * 0.8`, cut there; otherwise hard-cut at `maxLength`. Append ellipsis (see §Constraints — ellipsis style).
- **Dependencies:** none. Pure regex; no `marked`, no DOM, no Node built-ins.
- **Consumers:**
  - `app/pelilauta/src/pages/threads/[threadKey]/index.astro` — derives `description` for SEO via `markdownToPlainText(thread.markdownContent, 160)` (per seo spec Stage-1 DoD).
  - `packages/threads/src/components/ThreadCard.svelte` — replaces the inline `plainSnippet` function at lines 25–52 with an import from `@pelilauta/utils/markdownToPlainText`.
  - Future: notification body builders, RSS feed `description` fields, any other surface that needs prose-from-markdown without HTML.
- **Constraints:**
  - **Pure, synchronous, dependency-free.** The helper is regex-only by design. No `marked` round-trip — the regex path is faster and avoids loading the parser into bundles that just need a description string.
  - **SSR-safe.** No browser globals, no DOM. Safe to call from Astro frontmatter and from Svelte components.
  - **Empty / whitespace-only input is not an error.** Empty string and whitespace-only strings return `''` (no ellipsis, no throw).
  - **Output contains no markdown syntax characters and no HTML tags.** Heads, list markers, emphasis, links, images, code fences, inline code, blockquotes, horizontal rules, and `<…>` tags are all stripped.
  - **Whitespace is normalized to single ASCII spaces.** Newlines, tabs, and runs of spaces collapse to one space; leading/trailing whitespace is trimmed.
  - **Truncation prefers a word boundary.** If the last space within the truncation window is past 80% of `maxLength`, cut at the space; otherwise hard-cut at `maxLength`. Append the ellipsis token.
  - **Ellipsis style: Unicode `…` (U+2026, single horizontal-ellipsis character).** Per `ARCHITECTURE.md` §Text conventions — `…` is the universal v20 elision glyph across UI snippets, SEO meta descriptions, RSS, and notification bodies. The helper appends `…`; callers that need ASCII for a specific destination override at the call site, not at the helper. v17 used ASCII `...`; v20 deliberately diverges from v17 on this single glyph (the migration note covers it).
  - **Order of regex application is part of the contract.** Specifically, image stripping MUST run before link stripping — otherwise `![alt](url)` collapses to `alt` via the link regex but leaves a stray `!`.
  - **Module-level state is forbidden.** No memoization, no caches. Each call is independent.
  - **No sanitization claim.** This helper strips visible markdown/HTML syntax for display; it is not an XSS sanitizer. Output is plain text; if a caller embeds it in HTML, the caller still escapes for the destination context.

## Contract

### Definition of Done

- [ ] `markdownToPlainText(markdown: string, maxLength?: number): string` is exported from `packages/utils/src/markdownToPlainText.ts`.
- [ ] `./markdownToPlainText` appears in `packages/utils/package.json` `exports` map.
- [ ] Calling `markdownToPlainText('')` returns `''` without throwing.
- [ ] Calling `markdownToPlainText('   \n\n  ')` returns `''` without throwing.
- [ ] All §Testing Scenarios are green in `packages/utils/src/markdownToPlainText.test.ts`.
- [ ] `packages/threads/src/components/ThreadCard.svelte` deletes its inline `plainSnippet` function (lines 25–52) and imports from `@pelilauta/utils/markdownToPlainText`. No visual change — ThreadCard already emits `…`, and the helper now matches.
- [ ] `pnpm check` and `pnpm test` are green for `packages/utils` and `packages/threads`.

### Regression Guardrails

- The function MUST NOT throw on empty or whitespace-only input — it is called from server frontmatter where a thrown error renders a 500.
- The function MUST remain synchronous. Callers in Astro frontmatter and Svelte `$derived` blocks rely on a sync return; switching to async would silently change render order and break the Svelte reactive graph.
- The output MUST NOT contain `<` or `>` characters that originated from raw HTML in the input — the strip-HTML regex is non-negotiable for SEO surfaces (raw `<script>` tags in thread content reaching `<meta name="description">` would be a security/SEO regression).
- The function MUST NOT depend on `marked` or any markdown parser — adding a parser dependency makes the helper too expensive to call from SSR routes that emit metadata only.
- The truncation MUST always append the ellipsis token when truncation occurs, and MUST never append it when truncation does not occur.

### Testing Scenarios

#### Scenario: empty and whitespace-only input return empty string

```gherkin
Given an empty string input
When markdownToPlainText is called
Then the result is ''

Given a whitespace-only string '   \n\n  '
When markdownToPlainText is called
Then the result is ''
```

- **Vitest Unit Test:** `packages/utils/src/markdownToPlainText.test.ts`

#### Scenario: ATX headers are stripped

```gherkin
Given the input '# Header 1\n## Header 2'
When markdownToPlainText is called
Then the result is 'Header 1 Header 2'
```

- **Vitest Unit Test:** `packages/utils/src/markdownToPlainText.test.ts`

#### Scenario: links collapse to their visible text

```gherkin
Given the input '[Example](https://example.com)'
When markdownToPlainText is called
Then the result is 'Example'
```

- **Vitest Unit Test:** `packages/utils/src/markdownToPlainText.test.ts`

#### Scenario: images collapse to alt text without leaving a stray '!'

```gherkin
Given the input '![Alt text](image.png)'
When markdownToPlainText is called
Then the result is 'Alt text'
And the result does not contain '!'
```

- **Vitest Unit Test:** `packages/utils/src/markdownToPlainText.test.ts`

#### Scenario: bold and italic markers are removed without losing inner text

```gherkin
Given the input 'This is **bold** and *italic* text'
When markdownToPlainText is called
Then the result is 'This is bold and italic text'
```

- **Vitest Unit Test:** `packages/utils/src/markdownToPlainText.test.ts`

#### Scenario: fenced code blocks are removed entirely

```gherkin
Given the input '```javascript\nconst x = 1;\n```'
When markdownToPlainText is called
Then the result is ''
```

- **Vitest Unit Test:** `packages/utils/src/markdownToPlainText.test.ts`

#### Scenario: inline code keeps its content

```gherkin
Given the input 'Use `console.log()` for debugging'
When markdownToPlainText is called
Then the result is 'Use console.log() for debugging'
```

- **Vitest Unit Test:** `packages/utils/src/markdownToPlainText.test.ts`

#### Scenario: list markers and blockquote markers are stripped

```gherkin
Given the input '- Item 1\n- Item 2\n+ Item 3'
When markdownToPlainText is called
Then the result is 'Item 1 Item 2 Item 3'

Given the input '1. First\n2. Second\n3. Third'
When markdownToPlainText is called
Then the result is 'First Second Third'

Given the input '> This is a quote'
When markdownToPlainText is called
Then the result is 'This is a quote'
```

- **Vitest Unit Test:** `packages/utils/src/markdownToPlainText.test.ts`

#### Scenario: raw HTML tags are stripped

```gherkin
Given the input 'This is <strong>bold</strong>'
When markdownToPlainText is called
Then the result is 'This is bold'
And the result does not contain '<' or '>'
```

- **Vitest Unit Test:** `packages/utils/src/markdownToPlainText.test.ts`

#### Scenario: whitespace is normalized to single spaces

```gherkin
Given the input 'Text\n\nWith\n\n\nMultiple\n\n\n\nNewlines'
When markdownToPlainText is called
Then the result is 'Text With Multiple Newlines'
```

- **Vitest Unit Test:** `packages/utils/src/markdownToPlainText.test.ts`

#### Scenario: default maxLength is 220 with Unicode ellipsis appended on truncation

```gherkin
Given an input string of 300 'A' characters
When markdownToPlainText is called with no maxLength argument
Then the result has length 221
And the result ends with '…' (U+2026)
```

- **Vitest Unit Test:** `packages/utils/src/markdownToPlainText.test.ts`

#### Scenario: truncation cuts at the last space when within 80% window

```gherkin
Given the input 'The quick brown fox jumps over the lazy dog'
When markdownToPlainText is called with maxLength=20
Then the result is 'The quick brown fox…'
And the result has length 20
```

- **Vitest Unit Test:** `packages/utils/src/markdownToPlainText.test.ts`

#### Scenario: truncation hard-cuts when no good word boundary exists

```gherkin
Given the input 'Supercalifragilisticexpialidocious'
When markdownToPlainText is called with maxLength=20
Then the result has length 21
And the result ends with '…' (U+2026)
```

- **Vitest Unit Test:** `packages/utils/src/markdownToPlainText.test.ts`

#### Scenario: shorter-than-limit input does not gain an ellipsis

```gherkin
Given the input 'Short text'
When markdownToPlainText is called with maxLength=100
Then the result is 'Short text'
And the result does not contain '…'
```

- **Vitest Unit Test:** `packages/utils/src/markdownToPlainText.test.ts`

#### Scenario: complex multi-block markdown collapses to a clean prose snippet

```gherkin
Given the input:
  """
  # Welcome

  This is **bold** and *italic* with [a link](https://example.com).

  - List item
  - Another item

  > A quote
  """
When markdownToPlainText is called
Then the result is 'Welcome This is bold and italic with a link. List item Another item A quote'
```

- **Vitest Unit Test:** `packages/utils/src/markdownToPlainText.test.ts`

#### Scenario: thread detail page populates SEO description from markdown content

```gherkin
Given a thread document at stream/{key} with non-empty markdownContent
When an anonymous user GETs /threads/{key}
Then the rendered <head> contains <meta name="description"> with a plain-text snippet of length <= 160
And the snippet contains no markdown syntax characters (#, *, _, [, ], `, etc.)
And the snippet contains no HTML tags
```

- **Playwright E2E:** `app/pelilauta/e2e/thread-detail.spec.ts` (shared with `specs/cyan-ds/layouts/seo/spec.md` Stage-1 e2e — single browser run covers both contracts).

## Migration debt

Items observed during reverse-spec, recorded so the user can decide on follow-ups:

1. **v17 name `createPlainSnippet` is renamed to `markdownToPlainText`** in v20. Rationale: parallel to the sibling `markdownToHTML` in `packages/utils/src/markdownToHTML.ts`, which already established the v20 naming convention. The seo spec at `specs/cyan-ds/layouts/seo/spec.md` (Stage-1 DoD line 159, migration notes) currently references the v17 name `createPlainSnippet` — those references should be updated to `markdownToPlainText` when this spec is approved. Both ThreadCard's inline helper (named `plainSnippet`) and the v17 source will collapse into the v20 import.
2. **ThreadCard.svelte:25–52 is drift to delete.** The function is byte-for-byte the v17 implementation with `…` (Unicode) substituted for v17's `...`. v20's universal Unicode-ellipsis convention (per `ARCHITECTURE.md` §Text conventions) ratifies ThreadCard's existing behavior, so importing the helper produces no visual change in card snippets — pure deduplication.
3. **`createRichSnippet` and its HTML-truncation helpers are not carried forward.** v17's `snippetHelpers.ts` also exports `createRichSnippet`, `addHeaderClasses`, `addParagraphClasses`, `getVisibleTextLength`, `smartTruncateHtml`, and `addEllipsisToHtml`. v20 has no consumer and no planned consumer; treat as legacy and ignore.
4. **Regex-based stripping is brittle for adversarial markdown.** Inputs like ` ```code with [link](url) inside``` ` go through code-block stripping first (the entire block is removed), so the link regex never sees them — fine. But mismatched fences, nested emphasis, or `<p attr="]>` raw HTML can still produce surprising output. v17 lived with this for years; v20 inherits it. If a future caller (RSS feed validators, Schema.org `Article.description` JSON-LD) needs stricter guarantees, swap the regex pipeline for a marked-tokenize-and-collect-text pass — that's a bigger change and a separate spec.
5. **No locale-aware truncation.** Word-boundary detection uses ASCII space only. Languages without spaces (Japanese, Chinese) hard-cut at `maxLength` always. v17 did the same; Pelilauta is FI-first so this is acceptable. Document if a CJK locale is ever added.
6. **No sanitization story.** The `<[^>]*>` regex strips tag-shaped substrings but does not handle malformed HTML (`<a href=">"` etc.). v17 trusted authenticated authors; v20 inherits that trust model. If anonymous-input surfaces gain a description path, file an XSS-hardening pass.

## Provenance

Reverse-engineered on 2026-04-27 from:

- `.tmp/pelilauta-17/src/utils/snippetHelpers.ts` lines 122–174 (`createPlainSnippet`)
- `.tmp/pelilauta-17/test/util/snippetHelpers.test.ts` lines 158–272 (`describe('createPlainSnippet')` block — defines the v17 behavioral contract that this spec preserves verbatim)
- `packages/threads/src/components/ThreadCard.svelte` lines 25–52 (v20 inline drift to be replaced)
- `specs/cyan-ds/layouts/seo/spec.md` Stage-1 DoD (the immediate v20 consumer that drives this spec)
- `specs/pelilauta/markdown/spec.md` §Sibling helpers (the v20 sibling-helper pointer that this spec fulfills)
