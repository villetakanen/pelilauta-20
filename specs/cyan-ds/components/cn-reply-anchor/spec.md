---
feature: CnReplyAnchor
parent_spec: ../spec.md
stylebook_url: /components/cn-reply-anchor
status: alpha
maturity: implementation
last_major_review: 2026-06-02
---

# Feature: CnReplyAnchor

## Blueprint

### Context

The dock shell for a reply input. Owns positioning (sticky-bottom desktop, fixed-top mobile to clear the OS keyboard), the visible dock surface (background, border, elevated shadow), and an overhead slot above the input. The input slotted inside is a transparent child.

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
  - SSR-safe. Layout swaps are driven by CSS media queries — no `window` checks at render time.
  - **Desktop (≥ 768px), `fixed` true.** Outer aside is `position: sticky; bottom: 0; left: 0; right: 0` (full-bleed positioning). Inner content wrapper is `max-width: 67ch; margin-inline: auto` so the dock surface aligns to the reply column. Surface paints background `--cn-reply-dock-bg`, border `--cn-reply-dock-border`, shadow `--cn-reply-dock-shadow` (mapped to `--cn-shadow-elevation-3`), and `border-radius: var(--cn-border-radius-large)`.
  - **Mobile (< 768px), `fixed` true.** Outer aside is `position: fixed; top: var(--cn-app-bar-height); left: 0; right: 0; bottom: auto`. Inner content wrapper is full-bleed (no max-width). Surface paints the same dock chrome edge-to-edge.
  - **Chrome ownership.** This component is the only DS primitive that paints dock-surface chrome. `CnChatBar` and any other input slotted inside must render transparent (no background, border, shadow, or radius of their own) so the dock is a single visual surface.

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
- [ ] On viewports ≥ 768px the inner content wrapper has computed `max-width: 67ch` and is horizontally centered. Outer aside still spans `left: 0; right: 0`.
- [ ] The dock paints exactly one shadow. `CnChatBar` mounted as the default slot renders with computed `background: transparent`, no border, no border-radius, no box-shadow.

### Regression Guardrails

- **Keyboard-safety is absolute.** Pinned mobile input must not use bottom fixed positioning (`position: fixed; bottom: 0`) due to virtual keyboard occlusion issues. It must remain top-pinned on viewports `< 768px`.
- **SSR compatibility.** Server-rendered HTML must place the element correctly in the DOM without depending on window-width checks that would flash or break layout on hydration.
- **Single dock surface.** A descendant input (`CnChatBar`, etc.) must not paint background, border, shadow, or radius. Two layered surfaces inside one dock is a chrome regression.

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

#### Scenario: Desktop dock content is capped at 67ch
```gherkin
Given a CnReplyAnchor with fixed={true} on a viewport ≥ 768px
And a wrapping page wider than 67ch
When rendered
Then the inner dock surface measures at most 67ch wide
And is horizontally centered within the viewport
```

#### Scenario: Inline layout does not stick
```gherkin
Given a CnReplyAnchor with fixed={false}
When rendered
Then it sits in the normal document layout flow
And carries no fixed/sticky position styling
```
