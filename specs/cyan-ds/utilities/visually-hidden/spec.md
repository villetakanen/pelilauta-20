---
feature: Visually Hidden (.sr-only)
status: draft
maturity: design
last_major_review: 2026-04-30
parent_spec: ../spec.md
stylebook_url: /principles/visually-hidden
---

# Feature: Visually Hidden (`.sr-only`)

Parent: [Utilities](../spec.md)

## Blueprint

### Context

`.sr-only` hides content visually while keeping it in the accessibility tree for assistive technologies (screen readers, voice control). It is the design-system primitive behind skip-navigation links, accessible names for icon-only buttons, redundant form labels, and live-region status announcements.

This is a contract carried forward from cyan-4 (`packages/cyan-css/src/atomics/hidden.css`). v20 ships the modern `.sr-only` only; the legacy `.screen-reader-only` alias from cyan-4 is dropped during the port (see Migration Debt).

### Architecture

- **Components:** A single CSS rule shipped from `packages/cyan/src/utilities/visually-hidden.css`, included into the utilities barrel at `packages/cyan/src/utilities/index.css`.
- **Data Models:** N/A (CSS utility class).
- **API Contracts:** Authors apply `class="sr-only"` to any HTML element. The element is removed from the visual layout but remains discoverable by assistive technologies. When the element receives keyboard focus or activation, it returns to the visible viewport — supporting skip-link UX.
- **Dependencies:** None. Uses standard CSS only (`position`, `clip`, `clip-path`, `overflow`, `white-space`). No `--cn-*` tokens are needed; the contract is pure visibility manipulation, not theme-driven.
- **Constraints:**
  - **Modern engine target.** Uses `clip-path: inset(50%)` as the primary hiding mechanism, paired with the legacy `clip: rect(0 0 0 0)` for older engines. The project targets evergreen browsers (per `CLAUDE.md`), so the `clip-path` line is the load-bearing rule and `clip` is a cheap belt-and-braces line.
  - **Focus and activation reveal the element.** The selector is `.sr-only:not(:focus):not(:active)` so that keyboard focus or pointer activation lifts the element back into view. This is required for the skip-link pattern, where the link is normally invisible but appears the moment a keyboard user tabs to it.
  - **Single canonical name.** v20 ships `.sr-only` only. No `.screen-reader-only` alias, no `.visually-hidden` alias. One name per concept.
  - **No `!important`.** The rule wins by specificity (the `:not(:focus):not(:active)` compound selector) and by being a leaf utility consumers don't typically override.
  - **Inert at runtime when unstyled.** If the utility is ever absent from the bundle (e.g. a partial CSS import), the marked element renders normally. Authors using `class="sr-only"` are signing up for "should be hidden"; they cannot also rely on the class as a structural marker. Pair with semantic HTML (e.g. `<h1 class="sr-only">`), not with the class alone.

### Book Page

- **Target path:** `app/cyan-ds/src/content/principles/visually-hidden.mdx`
- **Structure:**
  - Standalone demos:
    - Skip-navigation link example (`<a href="#main" class="sr-only">Skip to main content</a>` — focus the demo to reveal).
    - Icon button with screen-reader-only label (`<button><CnIcon noun="delete" /><span class="sr-only">Delete item</span></button>`).
    - Redundant form label (`<label><span class="sr-only">Email</span><input type="email" placeholder="Email" /></label>`).
    - Live region announcement (`<div aria-live="polite" class="sr-only">Item added</div>`).
  - Inline guidance: when to use `.sr-only` vs. `aria-label` (use `.sr-only` when the text needs to be in the DOM for assistive tech that doesn't read all `aria-label`s; use `aria-label` when no element needs to be present).
  - Note: focus the skip-link demo to show the keyboard-reveal behaviour.

## Contract

### Definition of Done

- [ ] `.sr-only` rule exists in `packages/cyan/src/utilities/visually-hidden.css` and is imported by `packages/cyan/src/utilities/index.css`.
- [ ] An element with `class="sr-only"` occupies zero visual space (1×1 px clipped).
- [ ] An element with `class="sr-only"` is announced by screen readers as part of normal content order.
- [ ] When `.sr-only` content receives keyboard focus, it becomes visible on screen.
- [ ] When `.sr-only` content is activated (e.g. a clicked or held link), it becomes visible on screen.
- [ ] The cyan-ds book page at `app/cyan-ds/src/content/principles/visually-hidden.mdx` documents the four use cases above.

### Regression Guardrails

- The selector MUST remain `.sr-only:not(:focus):not(:active)`. Removing the `:not(:focus)` clause breaks skip-link keyboard UX; removing `:not(:active)` breaks pointer-activation reveal.
- The rule MUST NOT use `display: none` or `visibility: hidden`. Both remove the element from the accessibility tree, defeating the purpose.
- The element MUST remain in the DOM. Implementations that swap the content out (e.g. JavaScript-driven `aria-hidden` toggling) are not part of this utility.
- v20 MUST NOT ship the legacy `.screen-reader-only` alias. If usages appear in ported code, migrate them to `.sr-only` rather than re-introducing the old class.

### Testing Scenarios

#### Scenario: Element is visually hidden but in the accessibility tree

```gherkin
Given an element <h1 class="sr-only">Discussions</h1> on a rendered page
When the page is loaded
Then the element occupies a 1x1 clipped region in the viewport
And the element is in the accessibility tree with role "heading" and accessible name "Discussions"
And no sighted user can read the text in the rendered output
```

#### Scenario: Element becomes visible on keyboard focus

```gherkin
Given a skip-link <a href="#main" class="sr-only">Skip to main content</a>
When the user tabs to the link
Then the link receives focus
And the link is no longer clipped to 1x1
And the visible bounding box of the link is greater than the clipped size
```

#### Scenario: Element becomes visible on activation

```gherkin
Given a focusable element <a href="#" class="sr-only">Reveal</a>
When the user mouse-presses (`:active`) the element
Then the element is no longer clipped
And its visible bounding box is greater than the clipped size
```

## Migration Debt and Decisions

> Captured for the user during the v20 port. NOT part of the v20 contract.

### Notes from the cyan-4 source

- **Two implementations existed in cyan-4.** `packages/cyan-css/src/atomics/hidden.css` shipped both `.screen-reader-only` (older, no focus/active reveal, `clip: rect(0,0,0,0)` only) and `.sr-only:not(:focus):not(:active)` (modern, focus-aware, `clip-path: inset(50%)`). `docs/pbi/beta.010-sr-only-accessibility-class.md` documented `.sr-only` as the de-facto standard the project was migrating toward.
- **v20 decision: ship `.sr-only` only.** The legacy `.screen-reader-only` name carries no contract that `.sr-only` doesn't already cover. Dropping the alias is consistent with v20's "modern engines, single canonical name" posture.
- **`hidden.css` kitchen-sink anti-pattern.** cyan-4's `hidden.css` bundled `.sr-only`, `.screen-reader-only`, AND breakpoint utilities (`.sm-hidden`, `.md-hidden`, `.lg-hidden`, `.sm-only`, `.md-only`, `.lg-only`) plus `.wide-flex-col`. v20 splits these by concept: this spec covers only the visually-hidden contract. Breakpoint hidden utilities would belong in a separate spec if they are ever ported.

### Decisions for v20

1. **Canonical class name** — `.sr-only`. No alias.
2. **No tokens.** Visibility manipulation is engine-level, not theme-level. The rule does not need `--cn-*` tokens and should not invent any.
3. **File location** — `packages/cyan/src/utilities/visually-hidden.css` (descriptive filename), not `hidden.css` (cyan-4 kitchen-sink filename). The class name stays `sr-only` to preserve industry convention.
4. **No JS.** The reveal-on-focus behaviour is pure CSS. No `cn-loader`-style wrapper component is required.

### Known consumers in v20

- `packages/threads/src/components/ChannelsApp.astro:41` — `<h1 class="sr-only">` on the channels directory page. The class is currently inert (no backing CSS) — implementing this spec resolves that gap.
