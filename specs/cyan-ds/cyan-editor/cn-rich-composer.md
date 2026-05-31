---
feature: CnRichComposer
parent_spec: ./spec.md
stylebook_url: /components/cyan-editor#cn-rich-composer
status: alpha
maturity: implementation
last_major_review: 2026-05-28
---

# Feature: CnRichComposer

## Blueprint

### Context

The full-featured rich text composer for forum-style replies. It expands from the docked chat input to provide markdown formatting buttons, side-by-side or tabbed live HTML previewing, drag-and-drop file attachments with upload indicators, and save/cancel actions. It packages the CodeMirror-based `CnEditor` to keep core DS bundles light.

### Architecture

- **Component:** `packages/cyan-editor/src/CnRichComposer.svelte` — Svelte 5 component.
- **Props:**
  - `value: string` — two-way bound string representing the markdown text.
  - `placeholder?: string` — prompt hint.
  - `attachments: Array<{ id: string; name: string; size: number; status: 'uploading' | 'success' | 'error'; progress?: number; previewUrl?: string }>` — array of file attachments.
  - `saving?: boolean` — disables controls and shows saving loader state on submit.
  - `open?: boolean` — two-way bound visibility. When `true`, the composer is presented (modal on desktop, full-screen sheet on mobile); when `false`, the underlying `<dialog>` is closed. Consumers drive open/close in response to triggers (e.g. a thread page's "Reply" button) and react to dismissal events.
- **Callbacks:**
  - `onsave?: () => void` — called when the user clicks the primary submit button.
  - `oncancel?: () => void` — called when the user cancels or closes the composer.
  - `onupload?: (files: File[]) => void` — called with the dropped or chosen files.
- **Dependencies:**
  - Components: `CnEditor` (CodeMirror factory wrapper, mounted internally via `createCnEditor` for direct handle access), `CnLoader` (for upload/saving spinner states). `CnLightbox` is optional — when integrated, it renders previews of attachments with `previewUrl`; current implementation renders inline `<img>` thumbnails as a fallback.
  - Markdown rendering: `markdownToHTML` from `@pelilauta/utils`. This is a DS → platform-utility dependency; the choice acknowledges that markdown parsing is generic enough to live in `@pelilauta/utils` for now. Revisit if the DS later needs to ship to other consumers.
  - Tokens: `--cn-surface-1`, `--cn-surface-2`, `--cn-border`, `--cn-text`, `--cn-shadow-elevation-3`, `--cn-backdrop` (dialog scrim), `--cn-z-reply-dialog` (stacking slot), `--cn-z-dialog-overlay` (drop-overlay inside the dialog), `--cn-color-error`, `--cn-color-success` (attachment status indicators).

### Constraints

- **Responsive Visual Container:**
  - **Desktop:** Renders as a centered dialog modal overlay with backdrop.
  - **Mobile:** Renders as a full-screen sheet overlay (`position: fixed; inset: 0`).
- **Drag-and-Drop Dropzone:**
  - Listens to drag-and-drop events on its container.
  - Displays a visual dropzone overlay when files are dragged over the composer.
  - Intercepts file drops and forwards them via the `onupload` callback prop.
- **Tabs / Modes:**
  - Provides a toggle to switch between **Write** (CodeMirror editor active) and **Preview** (renders sanitized Markdown content parsed into HTML).
- **Formatting Toolbar:**
  - Includes a toolbar with formatting shortcut buttons (e.g. Bold, Italic, Link, Quote, Code, List).
  - Pressing a formatting button inserts the appropriate markdown notation at the editor's cursor selection using `handle.insertText()`.

### Book Page

- **Target path:** `app/cyan-ds/src/content/components/cyan-editor.mdx` (as a sub-section demo).
- **Structure:**
  - Interactive composer demo including dummy files upload state.
  - Switchable preview mode demo.
  - Props and callbacks API table.

## Contract

### Definition of Done

- [x] `CnRichComposer.svelte` implemented in Svelte 5; lives under `packages/cyan-editor/src/CnRichComposer.svelte`.
- [x] Exported via `packages/cyan-editor/src/index.ts` (or subpath).
- [x] Connects formatting toolbar buttons to the underlying CodeMirror instance via `CnEditor` handle functions.
- [x] Implements dragover/dragleave/drop file handling and invokes the `onupload` callback prop.
- [x] Renders attachment progress pills or list items based on the `attachments` prop.
- [x] Implements a markdown parser to render HTML in the "Preview" tab.

### Regression Guardrails

- **CodeMirror separation.** This composer MUST live in `packages/cyan-editor` to ensure CodeMirror dependencies are not bundled into `packages/cyan`.
- **Keyboard navigation.** Focus trap must be established when the composer opens as a modal overlay on desktop or full screen on mobile.

### Testing Scenarios

#### Scenario: Toggling write and preview tabs
```gherkin
Given a mounted CnRichComposer with value "# Hello"
When the user clicks the "Preview" tab
Then the markdown editor is hidden
And the parsed HTML "<h1>Hello</h1>" is rendered in a preview container
And clicking the "Write" tab restores the markdown editor view
```

#### Scenario: Formatting buttons modify text
```gherkin
Given a mounted CnRichComposer with selection "world" in value "Hello world"
When the user clicks the "Bold" toolbar button
Then the editor selection is replaced with "**world**"
And the cursor is placed after the markdown wrapper
```

#### Scenario: File dropping invokes onupload callback
```gherkin
Given a mounted CnRichComposer
When a user drags and drops a file "screenshot.png" onto the dropzone
Then a visual file drop overlay appears during dragover
And dropping the file invokes the `onupload` callback prop with the File object
And the drag overlay is dismissed
```
