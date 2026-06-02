---
feature: CnChatBar
parent_spec: ../spec.md
stylebook_url: /components/cn-chat-bar
status: alpha
maturity: implementation
last_major_review: 2026-06-02
---

# Feature: CnChatBar

## Blueprint

### Context

The primary user entry point for thread replies. Designed to resemble modern chat interfaces, it is a single-line capsule that auto-expands vertically as the user types, supports keyboard shortcuts (Enter to send), and provides slots for attachment and send actions.

### Architecture

- **Component:** `packages/cyan/src/components/CnChatBar.svelte` — Svelte 5 input component.
- **Props:**
  - `value: string` — two-way bound string representing the input content.
  - `placeholder?: string` — prompt hint.
  - `disabled?: boolean` — disables inputs and buttons.
- **Callbacks:**
  - `onsend?: (value: string) => void` — called when the user submits via the Enter key (non-empty value).
- **Slots:**
  - `start` — contains leading actions (e.g., attach button).
  - `end` — contains trailing actions (e.g., send button, format button).
- **Dependencies:**
  - Tokens: `--cn-input`, `--cn-on-input`, `--cn-grid`. The dock surface (background, border, shadow, radius) is painted by `CnReplyAnchor` — see [`../cn-reply-anchor/spec.md`](../cn-reply-anchor/spec.md) §Chrome ownership.
- **Constraints:**
  - **Transparent wrapper.** The component's root element renders no background, border, border-radius, or box-shadow. The visible surface is owned by `CnReplyAnchor` when docked, or by the host when used elsewhere. The bar contributes only its layout (flex, padding for spacing the slots) and the textarea's text/caret colors.
  - **Auto-expanding height.** The textarea uses `field-sizing: content` (with `rows="1"` fallback). Desktop caps at 4 lines (`max-height: calc(4 * 1.5em)`); mobile caps at `40vh`. Overflow scrolls.
  - **Keyboard.** `Enter` (no modifier) invokes `onsend` with the current value and prevents default newline insertion. `Shift+Enter` falls through to the browser's default newline behavior.

### Book Page

- **Target path:** `app/cyan-ds/src/content/components/cn-chat-bar.mdx`
- **Structure:**
  - Default chat bar demo.
  - Expanded height demo (showing scrollbar behavior after 4 lines).
  - Disabled state demo.
  - Interactive event logger demonstrating Enter vs Shift+Enter.

## Contract

### Definition of Done

- [x] `CnChatBar.svelte` implemented in Svelte 5; lives at `packages/cyan/src/components/CnChatBar.svelte`.
- [x] Exported from `packages/cyan/src/index.ts`.
- [x] Input element uses a borderless, backgroundless `<textarea>` that grows dynamically on input.
- [x] Listens to `keydown` events to catch `Enter` and `Shift + Enter` combinations.
- [x] Invokes the `onsend` callback prop when `Enter` is pressed without `Shift` (and the value is non-empty).
- [ ] The component's root wrapper has computed `background: transparent`, no `border`, no `border-radius`, and no `box-shadow`. Only the inner `<textarea>` carries text/caret styling.

### Regression Guardrails

- **No default form submissions.** Pressing Enter in the textarea must not cause a standard page refresh/submit; the keydown event's default action must be prevented.
- **No manual height calculations in pixels.** Height changes must be driven reactively (e.g., using Svelte's scrollHeight binding or standard CSS auto-expand patterns) and must be capped using relative units (`em` or `rem`) corresponding to font size and grid tokens.
- **No wrapper chrome.** The bar must not paint background, border, border-radius, or shadow on its root. Adding chrome here doubles up the dock surface owned by `CnReplyAnchor` and is a regression.

### Testing Scenarios

#### Scenario: Textarea grows with input
```gherkin
Given a mounted CnChatBar with value ""
When value is updated to a long paragraph containing multiple lines
Then the textarea's height increases to fit the content
And does not exceed the 4-line max-height on desktop
And displays a vertical scrollbar when content exceeds 4 lines
```

#### Scenario: Enter triggers send event
```gherkin
Given a mounted CnChatBar with value "Hello world"
When the user presses the "Enter" key
Then the `onsend` callback prop is invoked with the current value
And the default newline insertion is prevented
```

#### Scenario: Shift+Enter inserts newline
```gherkin
Given a mounted CnChatBar with value "Hello"
When the user presses the "Shift + Enter" keys
Then a newline is inserted in the textarea
And the `onsend` callback prop is not invoked
```
