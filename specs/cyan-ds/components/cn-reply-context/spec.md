---
feature: CnReplyContext
parent_spec: ../spec.md
stylebook_url: /components/cn-reply-context
status: draft
last_major_review: 2026-05-28
---

# Feature: CnReplyContext

## Blueprint

### Context

A visual banner that overlays the reply input, indicating that the current reply is directed at a specific post or user. It displays the target author's name, their avatar, a snippet of their message, and a close button to clear the reply context.

### Architecture

- **Component:** `packages/cyan/src/components/CnReplyContext.svelte` — Svelte 5 presentational component.
- **Props:**
  - `user: string` — username of the person being replied to.
  - `avatarUrl?: string` — optional URL to the target user's avatar.
  - `text: string` — snippet of the text being replied to.
- **Callbacks:**
  - `ondismiss?: () => void` — called when the user clicks the close/dismiss button.
- **Dependencies:**
  - Components: `CnAvatar` (always rendered; falls back to initials derived from `user` when no `avatarUrl` is supplied).
  - Tokens: `--cn-reply-context-bg`, `--cn-reply-context-text`, `--cn-grid`, `--cn-gap`.

### Book Page

- **Target path:** `app/cyan-ds/src/content/components/cn-reply-context.mdx`
- **Structure:**
  - Context banner with avatar and text snippet.
  - Context banner without an `avatarUrl` (CnAvatar falls back to initials derived from `user`).
  - Simulating dismissal action with a toast readout.

## Contract

### Definition of Done

- [x] `CnReplyContext.svelte` implemented in Svelte 5; lives at `packages/cyan/src/components/CnReplyContext.svelte`.
- [x] Exported from `packages/cyan/src/index.ts`.
- [x] Renders the username prefixed with `@` (e.g. `@tapa`).
- [x] Truncates the `text` snippet to a single line with ellipsis when it exceeds the container bounds.
- [x] Provides a clear interactive dismiss button (close icon) on the right side.
- [x] Invokes the `ondismiss` callback prop upon clicking the close button.

### Regression Guardrails

- **Content truncation is required.** Long text snippets must never wrap or expand the height of the banner; they must use `text-overflow: ellipsis; overflow: hidden; white-space: nowrap;`.
- **Stateless design.** The component must not mutate any parent state or clear itself from the DOM; it calls `ondismiss` and relies on the parent consumer to reactively unmount or clear the props.

### Testing Scenarios

#### Scenario: Renders username and text snippet
```gherkin
Given a CnReplyContext with user="tapa" and text="Let's start the game"
When rendered
Then the text "@tapa" is visible
And the text snippet "Let's start the game" is visible
And the close button is visible
```

#### Scenario: Renders avatar when provided
```gherkin
Given a CnReplyContext with avatarUrl="https://example.com/avatar.jpg"
When rendered
Then the internal CnAvatar is instantiated with the avatarUrl prop
```

#### Scenario: Clicking close triggers dismiss event
```gherkin
Given a rendered CnReplyContext
When the close button is clicked
Then the `ondismiss` callback prop is invoked
```
