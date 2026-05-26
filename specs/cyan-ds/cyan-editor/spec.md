---
feature: CyanEditor
status: draft
maturity: design
last_major_review: 2026-05-26
parent_spec: specs/cyan-ds/spec.md
---

# Feature: CyanEditor

## Blueprint

### Context

The cyan design system needs a markdown text editor primitive for authenticated authoring surfaces (thread replies, profile bios, site pages). The v17/v18 editor at [`villetakanen/cn-editor`](https://github.com/villetakanen/cn-editor) is a Lit web component wrapping CodeMirror 6 with markdown syntax, HTML-to-markdown paste, and `--cn-*` typography theming. v20 ports this functionality into a new workspace package `packages/cyan-editor/` as a **framework-agnostic factory** over pre-configured CodeMirror 6 — dropping the Lit dependency and the `<cn-editor>` custom element. Svelte islands and Astro demos consume the factory directly. This keeps base `packages/cyan/` free of CodeMirror/turndown weight while keeping the editor in the DS family.

### Architecture

- **Package:** new sibling workspace package `packages/cyan-editor/`.
  - `src/createCnEditor.ts` — public factory; constructs a configured `EditorView` and returns a typed handle.
  - `src/cnEditorTheme.ts` — `EditorView.theme(...)` + `HighlightStyle` driven by `--cn-*` tokens (no `--color-*`, no `--chroma-*`, no module-load DOM reads).
  - `src/cnPasteHandler.ts` — paste extension: DOMPurify → Turndown (GFM) on `text/html`, plaintext fallback.
  - `src/cnEditorConfig.ts` — `createEditorState` assembling keymaps, history, markdown lang, gutter compartment, placeholder compartment, readOnly compartment.
  - `src/styles.css` — base CSS layer scoped to a host class (`.cn-editor`), exposing `--cn-editor-*` instance tokens.
  - `src/index.ts` — barrel exporting `createCnEditor`, `cnEditorTheme`, `cnMarkdownHighlightStyle`, `pasteHtmlAsMarkdown`, `CnEditorOptions`, `CnEditorHandle`.

  Reverse-spec source pointer (migration reference only): upstream `villetakanen/cn-editor@v2.0.0-beta.3`.

- **Data Models:**
  - `CnEditorOptions`:
    - `value: string` — initial document (default `''`).
    - `placeholder?: string` — empty-state hint.
    - `disabled?: boolean` — read-only mode (default `false`).
    - `gutter?: boolean` — show line-number gutter (default `false`).
    - `onChange?: (value: string) => void` — fires on every doc change.
    - `onBlur?: (value: string) => void` — fires only when value changed since focus.
  - `CnEditorHandle`:
    - `view: EditorView` — escape hatch for advanced consumers.
    - `getValue(): string`
    - `setValue(next: string): void` — no-op if equal to current.
    - `setPlaceholder(next: string): void`
    - `setDisabled(next: boolean): void`
    - `setGutter(next: boolean): void`
    - `focus(): void`
    - `select(): void` — select-all and scroll into view.
    - `insertText(text: string): void` — replace current selection.
    - `destroy(): void` — disposes the `EditorView` and detaches listeners.

- **API Contracts:**
  - `createCnEditor(target: HTMLElement, options?: CnEditorOptions): CnEditorHandle`.
  - The factory **does not** register any custom element and **does not** read from `document` / `window` at module load.
  - Theme module is side-effect-free at import time. Dark-mode detection is resolved at editor construction via the `target`'s computed style or an explicit option, not via `document.body.classList`.

- **Dependencies:**
  - Runtime: `codemirror`, `@codemirror/state`, `@codemirror/view`, `@codemirror/commands`, `@codemirror/language`, `@codemirror/language-data`, `@codemirror/lang-markdown`, `@lezer/highlight`, `dompurify`, `turndown`, `turndown-plugin-gfm`.
  - **No** `lit`, no `@webcomponents/*`, no framework runtime.
  - CSS-only dep on `packages/cyan/` tokens (consumer apps already load cyan's token sheet; cyan-editor does not import cyan as a JS dep).

- **Constraints:**
  - Module evaluation is SSR-safe: no `document`, `window`, `navigator`, or custom-element registration runs at import time.
  - All theming reads from `--cn-*` tokens. References to `--color-*`, `--chroma-*`, and `--background-editor` from the upstream theme are migrated to `--cn-*` equivalents during the port. Token gaps surface as DS escalations under `specs/cyan-ds/tokens/`.
  - The editor mounts only inside authenticated CSR islands. Anonymous SSR surfaces never include the cyan-editor bundle.
  - No custom element is shipped in this iteration. If a `<cn-editor>` element is added later, it lives as a separate sub-spec and wraps the factory rather than reimplementing it.

### Book Page

- **Target path:** `app/cyan-ds/src/content/components/cyan-editor.mdx`.
- **Structure:**
  - Context: when to use the editor vs. a `<textarea>`.
  - Basic demo: a Svelte host component mounting the factory in `$effect`, with a live value readout.
  - Options table (`CnEditorOptions`).
  - Handle table (`CnEditorHandle`).
  - State demos: `placeholder`, `disabled`, `gutter` (toggleable).
  - Paste demo: copy from a styled HTML block, paste produces markdown.
  - Markdown highlighting demo: headings (H1–H4), strong, emphasis, link, inline code, fenced code, blockquote.
  - Token reference: `--cn-editor-*` instance tokens and the `--cn-*` typography/color tokens consumed.
  - Anti-patterns section (see below).

### Anti-Patterns

- **Using the editor on anonymous SSR pages.** It is CSR-only; on anonymous pages, present a login prompt linking back to the authoring surface.
- **Two-way binding via attribute mutation.** Consumers drive value updates through `setValue()`, not by mutating a hidden attribute.
- **Importing CodeMirror directly in consumer code.** Consumers depend on `cyan-editor`'s factory and exported extensions, not on `@codemirror/*` directly, so the editor can evolve its internal extension set.
- **Theming via inline styles or app-local CSS.** Editor visuals are owned by `cyan-editor`'s theme module and `--cn-*` tokens. App overrides are a DS bug (see [[feedback_apps_never_override_ds]]).

## Contract

### Definition of Done

- [ ] `packages/cyan-editor/` exists as a pnpm workspace package with `workspace:*` consumers wired (initial consumer: `app/cyan-ds` book page only).
- [ ] `createCnEditor(target, options)` returns a working `CnEditorHandle` that mounts a CodeMirror 6 instance with markdown language, history, line wrapping, multi-selection, active line + gutter highlights.
- [ ] `setValue`, `setPlaceholder`, `setDisabled`, `setGutter` reconfigure the running editor via CodeMirror compartments without rebuilding state.
- [ ] `destroy()` disposes the `EditorView` and removes all listeners; calling other handle methods after destroy is a no-op (does not throw).
- [ ] HTML paste is converted to markdown via DOMPurify-sanitized Turndown (GFM enabled); plaintext paste passes through unchanged.
- [ ] All theme rules use `--cn-*` tokens only. No `--color-*`, no `--chroma-*`, no `--background-editor` references remain.
- [ ] No module under `packages/cyan-editor/src/` reads `document`, `window`, or `navigator` at top level. Import-time evaluation succeeds in a Node SSR context.
- [ ] No `lit`, `@customElement`, or `customElements.define` occurs anywhere in the package source.
- [ ] Book page at `app/cyan-ds/src/content/components/cyan-editor.mdx` renders all demos and option/handle tables.
- [ ] `pnpm verify` is clean across `packages/cyan-editor/`, `packages/cyan/`, and `app/cyan-ds/`.

### Regression Guardrails

- The editor never appears in an SSR HTML payload. Anonymous renders of pages that host an authenticated editor produce a login prompt, not an empty editor shell.
- The `cyan` package's bundle does not transitively import `@codemirror/*`, `turndown`, `dompurify`, or `lit`. Adding cyan-editor as a sibling does not inflate the base DS payload.
- `createCnEditor` is idempotent w.r.t. cleanup: `destroy()` followed by re-mount on the same `target` works without leaks.
- `setValue(current)` is a no-op (no dispatched transaction, no `onChange` fire).
- Paste handler never executes scripts from pasted HTML (DOMPurify runs before Turndown).

### Testing Scenarios

#### Scenario: Factory mounts a working editor

```gherkin
Given a detached <div> in a JSDOM document
When createCnEditor(div, { value: '# hello' }) is called
Then the div contains a CodeMirror editor whose document text is "# hello"
And handle.getValue() returns "# hello"
```

#### Scenario: setValue updates the running editor without rebuilding state

```gherkin
Given a mounted editor with value "a"
When handle.setValue("b") is called
Then handle.getValue() returns "b"
And the EditorView instance is the same object as before the call
```

#### Scenario: setValue with current value is a no-op

```gherkin
Given a mounted editor with value "a" and an onChange spy
When handle.setValue("a") is called
Then onChange is not invoked
```

#### Scenario: destroy disposes the editor

```gherkin
Given a mounted editor
When handle.destroy() is called
Then the target element no longer contains a CodeMirror DOM subtree
And subsequent calls to handle.getValue() return the last known value without throwing
```

#### Scenario: Paste of HTML produces markdown

```gherkin
Given a mounted editor with an empty document
When a paste event delivers text/html "<h1>Title</h1><p><strong>bold</strong></p>"
Then handle.getValue() contains "# Title" and "**bold**"
And no <script> or event-handler attribute from the pasted HTML reaches the document
```

#### Scenario: Plaintext paste passes through

```gherkin
Given a mounted editor with an empty document
When a paste event delivers only text/plain "raw text"
Then handle.getValue() contains "raw text" verbatim
```

#### Scenario: Disabled state is reconfigurable at runtime

```gherkin
Given a mounted editor with disabled: false
When handle.setDisabled(true) is called
Then user input via keyboard does not change the document
And handle.setDisabled(false) restores editability
```

#### Scenario: Gutter visibility is reconfigurable at runtime

```gherkin
Given a mounted editor with gutter: false
When handle.setGutter(true) is called
Then the editor DOM contains a .cm-gutters element
And handle.setGutter(false) removes it
```

#### Scenario: Module import is SSR-safe

```gherkin
Given a Node process with no document/window globals
When the cyan-editor barrel is imported
Then the import resolves without throwing
And no global side effects (custom element registration, document reads) occur
```

#### Scenario: No deprecated tokens in theme output

```gherkin
Given the cyan-editor source tree
When the theme and CSS modules are searched for token references
Then no --color-*, --chroma-*, or --background-editor identifier is found
And every CSS custom property read resolves under the --cn-* namespace
```

#### Scenario: Base cyan bundle stays editor-free

```gherkin
Given a production build that imports only from packages/cyan
When the resulting bundle is analyzed
Then it contains no module from @codemirror/*, turndown, dompurify, or lit
```

## Out of Scope

- A `<cn-editor>` custom element wrapping the factory. Deferred; would be a sibling sub-spec if demand emerges.
- Live markdown decorations (the upstream Phase 3 inline-render). Deferred to a follow-up sub-spec under `specs/cyan-ds/cyan-editor/live-markdown.md`.
- Toolbar / formatting buttons. Consumers compose their own toolbar around `handle.insertText()`.
- Image upload, mention autocomplete, slash commands. Out of scope for the primitive; belong in domain packages.
- Mobile-specific gesture handling beyond CodeMirror's defaults.
