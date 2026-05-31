---
feature: CnChatBar
parent_spec: ../spec.md
stylebook_url: /components/cn-chat-bar
status: alpha
maturity: implementation
last_major_review: 2026-05-28
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
  - Tokens: `--cn-reply-dock-bg`, `--cn-reply-dock-border`, `--cn-reply-dock-shadow`, `--cn-input`, `--cn-text`, `--cn-border-radius-large`, `--cn-grid`.
- **Constraints:**
  - **Auto-expanding height:** The inner textarea dynamically expands to fit content.
    - **Desktop:** Expands up to a maximum of 4 lines (scrolls beyond that).
    - **Mobile:** Expands downward up to a maximum height defined in terms of viewport percentage (e.g., 40% of viewport) to avoid overlapping the top content area.
  - **Keyboard Handling:**
    - Pressing `Enter` key alone invokes the `onsend` callback prop and prevents the default action (newline insertion).
    - Pressing `Shift+Enter` inserts a standard newline character.
    - On mobile soft keyboards, the system uses standard text input behaviors (carriage return triggers newline or send depending on configuration, default is newline unless submit action is focused).

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
- [x] Inherits color tokens from the `--cn-input` and `--cn-reply-dock-*` namespace.

### Regression Guardrails

- **No default form submissions.** Pressing Enter in the textarea must not cause a standard page refresh/submit; the keydown event's default action must be prevented.
- **No manual height calculations in pixels.** Height changes must be driven reactively (e.g., using Svelte's scrollHeight binding or standard CSS auto-expand patterns) and must be capped using relative units (`em` or `rem`) corresponding to font size and grid tokens.

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
