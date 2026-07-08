---
feature: CnBubble
parent_spec: ../spec.md
stylebook_url: /components/cn-bubble
status: draft
last_major_review: 2026-05-06
---

# Feature: CnBubble

> Reversed from `.tmp/cyan-design-system-4/packages/cyan-lit/src/cn-bubble/cn-bubble.ts` (cyan-4 Lit web component). v20 ships as a Svelte 5 component per ADR-001.

## Blueprint

### Context

A speech-bubble container used to render a single message in a discussion: thread replies, comments, chat-like exchanges. Provides the visual shape (rounded rectangle with a directional tail), an own-vs-other variant, and slot-aware spacing so a header or footer toolbar sits flush with the bubble edge instead of leaving a gap. The only consumer in scope today is the threads vertical's `ReplyArticle.svelte`, but the primitive is reusable in any chat-shaped surface (DMs, post threads, support chat).

### Architecture

- **Component:** `packages/cyan/src/components/CnBubble.svelte` — Svelte 5 leaf, no client logic, pure render. Renders an `<article>` element as its root — a bubble is semantically an independent block of content, shareable and copyable as a single unit.
- **Props:**
  - `reply?: boolean` — when `true`, renders the own-message variant (right-aligned tail, alternate background). Default `false` (other-message variant: left-aligned tail).
- **Slots:**
  - Default slot — bubble body. Consumers place markdown HTML, images, toolbars, and any other inline structure here.
- **Dependencies:**
  - Tokens: `--cn-bubble`, `--cn-on-bubble`, `--cn-reply-bubble`, `--cn-on-reply-bubble`, `--cn-border-radius-medium`, `--cn-grid`, `--cn-gap`.
  - The four bubble colour tokens are independent semantic tokens defined directly from chroma colour-tokens (`--chroma-*` scales). They are NOT aliases of `--cn-surface-*` or any other existing semantic token — bubble palette evolves independently of surface palette.
  - No JS dependencies. No DS-component dependencies.
- **Constraints:**
  - SSR-safe — renders identically on server and client; no browser-only globals, no `client:*` directive required at composition sites.
  - Asymmetric border-radius: the corner adjacent to the tail is unrounded; the other three corners are `--cn-border-radius-medium`.
  - Bubble padding is `var(--cn-gap) var(--cn-gap) var(--cn-grid)`.
  - Minimum height: `calc(var(--cn-gap) * 4)`. Empty bubbles still render visibly (the shape is preserved).
  - A leading `<header>` (first slotted child) collapses its top margin by `-var(--cn-gap)` so it sits flush with the bubble's top edge. A trailing `<footer>` (last slotted child) collapses its bottom margin by `-var(--cn-grid)` so it sits flush with the bottom edge. The bubble is an `<article>`, so `<header>` and `<footer>` are HTML5's natural byline/meta bands; no class hook is needed.
  - First slotted element has `margin-top: 0` regardless of element type.
  - Styling uses Svelte's default scoped CSS. Inside cyan/ packages, scoped CSS is the correct boundary; the "apps never override DS" rule applies to app-layer code, not to DS-internal styling.

### Visual Variants

| Variant | Tail position | Margin offset | Background token | Foreground token |
|---|---|---|---|---|
| Default (`reply` false) | Top-left, points outward to the left of the bubble | `margin-left: var(--cn-gap)` | `--cn-bubble` | `--cn-on-bubble` |
| Reply (`reply` true) | Top-right, points outward to the right of the bubble | `margin-right: var(--cn-gap)` | `--cn-reply-bubble` | `--cn-on-reply-bubble` |

The tail is a CSS pseudo-element (`::after`) using `border-style: solid` with three transparent edges and one tinted edge to produce the triangle. Tail tint matches the bubble background.

### Book Page

- **Target path:** `app/cyan-ds/src/content/components/cn-bubble.mdx`
- **Structure:**
  - Single bubble demo (default variant) with a paragraph of text.
  - Reply bubble demo with a paragraph of text.
  - Side-by-side conversation demo alternating default and reply variants — shows the tail orientation and margin offsets together.
  - Bubble with a leading `<header>` containing an author byline — demonstrates the header-flush behaviour (no visible gap above the header strip).
  - Bubble with a trailing `<footer>` containing a timestamp / actions row — same on the bottom edge.
  - Bubble containing a `cn-lightbox` image strip — confirms the primitive composes with the sibling reply primitive.
  - Empty bubble demo — confirms the minimum-height contract.
  - Props table.
  - CSS token reference listing all `--cn-*` tokens consumed.

## Contract

### Definition of Done

- [ ] `CnBubble.svelte` ported from the cyan-4 Lit source to Svelte 5; lives at `packages/cyan/src/components/CnBubble.svelte`.
- [ ] Exported from `packages/cyan/src/index.ts`.
- [ ] Root element is `<article>`; no `role` attribute is needed because the element supplies it natively.
- [ ] Renders the default variant when `reply` is omitted or false; renders the reply variant when `reply` is true.
- [ ] Tokens consumed are exclusively in the `--cn-*` namespace. New `--cn-bubble`, `--cn-on-bubble`, `--cn-reply-bubble`, `--cn-on-reply-bubble` semantic tokens added under `packages/cyan/src/tokens/`, defined directly from `--chroma-*` colour-tokens.
- [ ] Toolbar-flush slot behaviour matches cyan-4: a `.toolbar` element as the first or last slotted child sits edge-to-edge with the bubble.
- [ ] First slotted element's top margin is reset to zero.
- [ ] Asymmetric border-radius matches the variant's tail corner.
- [ ] Documented in the Living Style Book at `app/cyan-ds/src/content/components/cn-bubble.mdx` with all demos listed in §Book Page.
- [ ] Unit tests cover the variant render paths, the article element contract, and the slot behaviour.

### Regression Guardrails

- **The `reply` prop is the only API.** No `variant` enum, no orientation override, no theme prop. New variants land as new specs, not as expanded props.
- **Asymmetric border-radius is load-bearing.** The unrounded corner indicates the tail position; rounding all four corners breaks the visual contract.
- **The tail is decorative.** It MUST be implemented via `::after` (or equivalent CSS) and MUST NOT appear in the accessibility tree or alter the slot's content layout.
- **The bubble is an `<article>`.** A bubble is a self-contained unit of content that should round-trip as a single article landmark in assistive tech, share/copy actions, and feed readers. A wrapping `<div role="article">` is not equivalent and MUST NOT replace it.
- **Token namespace.** Only `--cn-*` tokens. No `--color-*` (deprecated), no `--cyan-*` (deprecated). The legacy cyan-4 tokens (`--color-bubble`, `--color-on-bubble`, `--color-reply-bubble`, `--color-on-reply-bubble`) are renamed to `--cn-*` as part of this migration.
- **Bubble tokens are not aliases.** `--cn-bubble` and friends derive from `--chroma-*` colour-tokens directly. They MUST NOT be defined as `var(--cn-surface-*)` or any other semantic-token alias — bubble palette is independent.
- **SSR-safe by construction.** No `connectedCallback`, no `customElements.whenDefined` waits, no `onMount` work needed for the visual contract.
- **Empty content still renders.** A `CnBubble` with no children renders the shape at minimum height — does not collapse to zero.

### Testing Scenarios

#### Scenario: Default bubble renders the left-tail variant

```gherkin
Given a CnBubble with no reply prop
When rendered
Then the root element is <article>
And the article does NOT carry the reply attribute or class
And the computed background-color resolves from var(--cn-bubble)
And the article has a left margin of var(--cn-gap)
And the top-left border-radius is 0
And the other three corners use var(--cn-border-radius-medium)
```

#### Scenario: Reply bubble renders the right-tail variant

```gherkin
Given a CnBubble with reply={true}
When rendered
Then the root element is <article>
And the article carries the reply attribute or class
And the computed background-color resolves from var(--cn-reply-bubble)
And the article has a right margin of var(--cn-gap)
And the top-right border-radius is 0
And the other three corners use var(--cn-border-radius-medium)
```

#### Scenario: Reply prop toggles cleanly

```gherkin
Given a rendered CnBubble with reply={false}
When the reply prop is changed to true
Then the article updates to the reply variant on the next render
And the variant attribute / class reflects the new state

When the reply prop is changed back to false
Then the article returns to the default variant on the next render
```

#### Scenario: Slot renders default-slot content

```gherkin
Given a CnBubble with a paragraph child
When rendered
Then the paragraph is visible inside the article
And the paragraph is a direct DOM descendant of the article (no shadow boundary)
```

#### Scenario: First slotted child has no top margin

```gherkin
Given a CnBubble with an h3 element as its first child
When rendered
Then the h3's computed margin-top is 0
And subsequent siblings retain their natural margins
```

#### Scenario: Leading header slot sits flush with the top edge

```gherkin
Given a CnBubble with <header> as its first child
When rendered
Then the header's computed top edge aligns with the article's outer top edge
```

#### Scenario: Trailing footer slot sits flush with the bottom edge

```gherkin
Given a CnBubble whose last child is <footer>
When rendered
Then the footer's computed bottom edge aligns with the article's outer bottom edge
```

#### Scenario: Empty bubble preserves shape

```gherkin
Given a CnBubble with no slotted children
When rendered
Then the article's computed height is at least calc(var(--cn-gap) * 4)
And the bubble shape (background, tail, border-radius) is visible
```

#### Scenario: Tail decoration is not in the accessibility tree

```gherkin
Given a CnBubble in either variant
When the accessibility tree is inspected
Then the tail decoration is not exposed as a separate node
And the bubble appears as a single article landmark
```
