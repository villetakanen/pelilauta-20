---
feature: ThemeSplit
parent_spec: specs/cyan-ds/living-style-books/spec.md
---

# Feature: ThemeSplit

## Blueprint

### Context

The Living Style Book shows DS components in both light and dark modes
side-by-side so reviewers can validate contrast, token derivation, and
theme-sensitive behaviours without toggling their OS or browser theme.
Authoring this inline forces either `<style>` blocks or inline
`style="color-scheme: …"` attributes — both forbidden by the
[living-style-books Anti-Patterns](../spec.md) ("No App-Layer
Overrides"). `ThemeSplit` is the DS-internal Astro primitive that
encapsulates the pattern so book MDX stays token-driven and inline-style
free.

### Architecture

- **Component:** `packages/cyan/src/components/living-style-books/ThemeSplit.astro`
  — an Astro component, SSR-only, no client JavaScript. Lives alongside
  other DS components so the `@cyan` alias resolves it for book
  authors; scoped under `living-style-books/` because it is a docs
  authoring primitive rather than a product-facing component.
- **API (slots):**
  - One default `<slot />`. The component renders the slot to HTML
    once via `Astro.slots.render("default")` and emits that HTML
    string into both panes via `<div set:html={html} />`. Visually
    the content appears twice — once inside a light-mode pane, once
    inside a dark-mode pane. Each pane forces `color-scheme` locally
    so `light-dark()` token values resolve to the pane-specific
    branch regardless of the reader's theme preference.
    **Why not `<slot />` twice:** Astro's JSX renderer mutates slot
    vnode props on first render (`hasTriedRenderComponentSymbol`),
    which makes a second `<slot />` call fall through to a bare
    `vnode.type(props)` invocation. Svelte 5's SSR components expect
    `($$renderer, $$props)`, so the second rendering crashes with
    `Cannot read properties of undefined (reading '…')`. Rendering
    to HTML once and duplicating the string sidesteps the double-
    invocation path entirely.
- **Rendered markup:**
  ```html
  <div class="cn-theme-split">
    <div class="cn-theme-split-pane cn-theme-split-pane-light">
      <p class="text-caption">Light</p>
      <!-- slotted content -->
    </div>
    <div class="cn-theme-split-pane cn-theme-split-pane-dark">
      <p class="text-caption">Dark</p>
      <!-- slotted content -->
    </div>
  </div>
  ```
- **Dependencies:**
  - `.text-caption` utility class from `packages/cyan/src/tokens/typography-semantics.css`.
  - Tokens: `--cn-gap`, `--cn-border`, `--cn-border-radius-large`,
    `--cn-border-radius-medium`, `--cn-surface`, `--cn-on-surface`,
    `--cn-on-surface-secondary`.
- **Constraints:**
  - All layout and colour values resolve from `--cn-*` tokens; no
    hardcoded pixels, colours, or fonts.
  - Component emits no `style="..."` attributes in its rendered HTML.
  - SSR-only — no `client:*` directive. Because both panes are
    populated from the same rendered HTML string, `client:*` islands
    inside the slot would only hydrate for the first occurrence; use
    static content only. Book pages demoing interactive components
    should do so outside of `ThemeSplit`.

### Book Page

ThemeSplit is a meta-primitive used within other book pages. It does
not require its own book entry, but the living-style-books parent spec
references it as the canonical pattern for dual-theme demos.

## Contract

### Definition of Done

- [ ] `packages/cyan/src/components/living-style-books/ThemeSplit.astro`
      exists and renders two `.cn-theme-split-pane` blocks in a
      two-column CSS grid.
- [ ] The left pane declares `color-scheme: light`; the right pane
      declares `color-scheme: dark`.
- [ ] Each pane renders a `.text-caption` label ("Light" / "Dark") and
      then the slotted content.
- [ ] No inline `style="..."` attribute appears in the rendered HTML.
- [ ] `--cn-*` tokens supply all spacing, colour, and radius values.
- [ ] `app/cyan-ds/src/content/components/cn-loader.mdx` uses
      `<ThemeSplit>` for its dual-theme demo block.

### Regression Guardrails

- Markup emitted by ThemeSplit contains no `style=` attributes.
  Reintroducing inline styles would violate the book's "No App-Layer
  Overrides" rule.
- Both panes force `color-scheme` locally. Removing either declaration
  regresses the component to OS-theme-only behaviour, breaking the
  comparison.
- The component stays SSR-only. Adding a `client:*` directive would
  create unnecessary runtime cost for a documentation primitive.

### Testing Scenarios

#### Scenario: Dual-theme rendering

```gherkin
Given a book page uses <ThemeSplit> with <CnLoader /> in its default slot
When the page is rendered
Then the markup contains exactly two `.cn-theme-split-pane` elements
And the left pane has computed `color-scheme: light`
And the right pane has computed `color-scheme: dark`
And both panes contain a rendered `.cn-loader` subtree
And neither pane's rendered HTML contains a `style="..."` attribute
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/theme-split.spec.ts`

#### Scenario: Tokens drive all visual values

```gherkin
Given a rendered <ThemeSplit>
When computed styles are inspected for padding, gap, background,
  border-radius, and border-color
Then each resolved value corresponds to a DS custom property
  (--cn-gap, --cn-surface, --cn-border, etc.)
And no literal pixel or colour value is introduced by the component
```
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/theme-split.spec.ts`
