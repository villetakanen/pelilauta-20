---
feature: CnReplyAnchor
parent_spec: ../spec.md
stylebook_url: /components/cn-reply-anchor
status: alpha
maturity: implementation
last_major_review: 2026-05-28
---

# Feature: CnReplyAnchor

## Blueprint

### Context

A structural layout container that anchors the reply interface. To accommodate mobile virtual keyboards without obscuring them, this anchor dynamically positions the reply controls: pinned to the top of the screen (growing down) on mobile, and docked at the bottom of the content container (growing up with scroll limits) on desktop.

### Architecture

- **Component:** `packages/cyan/src/components/CnReplyAnchor.svelte` — Svelte 5 layout primitive. Renders a structural `<aside>` container.
- **Props:**
  - `fixed?: boolean` — when `true` (default), behaves as a layout overlay fixed to its target position. When `false`, renders inline in the flow of the document at the bottom of the thread.
- **Slots:**
  - Default slot — contains the main interactive input bar (`CnChatBar` or `CnRichComposer`).
  - `overhead` slot — contains floating contextual elements (like `CnReplyContext` or action chips) positioned adjacent to the bar.
- **Dependencies:**
  - Tokens: `--cn-reply-dock-bg`, `--cn-reply-dock-border`, `--cn-reply-dock-shadow`, `--cn-grid`, `--cn-gap`.
- **Constraints:**
  - SSR-safe — renders markup cleanly on the server; handles dynamic responsive states on the client.
  - **Desktop layout:** When detected via breakpoint (viewport `>= 768px`) and `fixed` is true:
    - Pinned to the bottom of the thread/container context (`position: absolute` or `position: sticky; bottom: 0`).
    - The input container grows upwards as content is added.
  - **Mobile layout:** When detected via breakpoint (viewport `< 768px`) and `fixed` is true:
    - Pinned to the top of the screen below the app bar (`position: fixed; top: var(--cn-height-app-bar, 3.5rem); left: 0; right: 0; bottom: auto;`).
    - The input grows downwards as content is added, ensuring the bottom half of the screen remains completely free for the OS virtual keyboard.
  - Uses CSS media queries for primary layout switching, falling back to JS-based viewport observations only if container-relative constraints apply.

### Book Page

- **Target path:** `app/cyan-ds/src/content/components/cn-reply-anchor.mdx`
- **Structure:**
  - Layout demonstration in desktop viewport context (bottom of container).
  - Mock mobile viewport demonstration (simulating the top-of-screen top pinning).
  - Props table.

## Contract

### Definition of Done

- [x] `CnReplyAnchor.svelte` implemented in Svelte 5; lives at `packages/cyan/src/components/CnReplyAnchor.svelte`.
- [x] Exported from `packages/cyan/src/index.ts`.
- [x] Renders an `<aside>` element as its root.
- [x] Swaps layout orientation cleanly between desktop (bottom sticky) and mobile (top fixed) modes using media queries or container queries.
- [x] Positions the `overhead` slot adjacent to the input bar based on the orientation (above on desktop, below on mobile if appropriate, or stacked logically).
- [x] Standard styling integrated into Cyan's core stylesheets.

### Regression Guardrails

- **Keyboard-safety is absolute.** Pinned mobile input must not use bottom fixed positioning (`position: fixed; bottom: 0`) due to virtual keyboard occlusion issues. It must remain top-pinned on viewports `< 768px`.
- **SSR compatibility.** Server-rendered HTML must place the element correctly in the DOM without depending on window-width checks that would flash or break layout on hydration.

### Testing Scenarios

#### Scenario: Desktop layout is bottom-sticky
```gherkin
Given a CnReplyAnchor with fixed={true}
When rendered on a desktop viewport (>= 768px)
Then the container is positioned at the bottom of its parent context
And it grows upwards as contents are added
```

#### Scenario: Mobile layout is top-fixed
```gherkin
Given a CnReplyAnchor with fixed={true}
When rendered on a mobile viewport (< 768px)
Then the container is positioned fixed at the top of the viewport below the app bar
And it grows downwards as contents are added
And it leaves the bottom of the viewport entirely clear for the keyboard
```

#### Scenario: Inline layout does not stick
```gherkin
Given a CnReplyAnchor with fixed={false}
When rendered
Then it sits in the normal document layout flow
And carries no fixed/sticky position styling
```
