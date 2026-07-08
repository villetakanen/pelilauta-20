---
feature: Text Caption (.text-caption)
status: approved
last_major_review: 2026-05-02
parent_spec: ../spec.md
stylebook_url: /principles/typography
---

# Feature: Text Caption (`.text-caption`)

Parent: [Utilities](../spec.md)

## Blueprint

### Context

`.text-caption` is the design-system utility for **uppercase, tracked label
text** — the small editorial overline used for category badges, system /
edition tags, footer credits, theme labels, and pre-title eyebrows above
card headlines. It is the single source of truth for "label" typography
across cyan, cyan-ds, and consumer packages.

For v20, `.text-caption` is also the rendered output for the parent
typography spec's `overline` semantic role. The parent spec
([`specs/cyan-ds/tokens/typography/spec.md` §UI Scale](../../tokens/typography/spec.md))
keeps `caption` and `overline` as separate **semantic** names so authors
can pick the one that matches their authoring intent, but they collapse
to one **visual** rule — this one. There is no `.text-overline` utility
and no visual divergence planned for v20.

It is reverse-specced from
[`packages/cyan/src/tokens/typography-semantics.css`](../../../../packages/cyan/src/tokens/typography-semantics.css)
(rule body at `:root .text-caption`), where it is defined inline alongside
`.text-h1..h4`, `.text-body`, `.text-small`, and the colour utilities.

### Architecture

- **Source:** a single ruleset in
  `packages/cyan/src/tokens/typography-semantics.css` under the *Text Sizes*
  block. Co-located with the other prose-tier utilities, not in
  `packages/cyan/src/utilities/`. This co-location reflects the fact that
  `.text-caption` is a typography-semantic utility, not a layout or
  visibility utility.
- **API contract:** authors apply `class="text-caption"` to any inline-level
  or block-level element (`<p>`, `<span>`, `<code>`, `<div>`, `<a>`). The
  element renders with the label-typography triple plus uppercasing. The
  class composes freely with colour utilities (`.text-low`, `.text-high`,
  semantic `--cn-text-*` tokens applied at the parent), and with custom
  `letter-spacing` / `font-size` overrides at the call site when a host
  needs to deviate.
- **Computed properties (current implementation):**
  - `font-size: 0.75rem` (12px at the 16px root)
  - `line-height: 1.5` (unitless)
  - `letter-spacing: 0.05em`
  - `text-transform: uppercase`
  - `font-weight: var(--cn-font-weight-medium)` (500)
- **Inherited properties:** `color`, `font-family`, `margin`, `padding`. The
  utility does not stamp any of these. Authors set colour via a sibling
  utility (`.text-low`) or a parent rule; spacing is the host's concern.
- **Dependencies:** consumes `--cn-font-weight-medium` from
  `packages/cyan/src/tokens/typography.css`. All other declared values are
  literal (see Migration Debt for the implication of that).
- **Constraints:**
  - **Stable name across the platform.** `.text-caption` is the canonical
    class name for label-typography across cyan, cyan-ds, and consumer
    packages. There is no alias and no per-app rename. Components that
    need this typography compose the class (e.g. `<div class="eyebrow
    text-caption">`) rather than redefining the values inline.
  - **Globally available.** The class lives in the always-loaded typography
    semantics stylesheet, so it is reachable from Svelte component scoped
    styles, Astro template `class=` attributes, and MDX content alike. No
    import is required at the call site.
  - **i18n-agnostic.** The utility ships no locale-bound strings; uppercase
    transformation is a CSS effect applied to whatever text the consumer
    supplies. Locales whose orthography rejects mechanical uppercasing
    (e.g. German `ß`, Greek `ΐ`) inherit standard CSS `text-transform:
    uppercase` behaviour — the utility takes no special steps for them.
  - **No `!important`.** The rule wins by being a leaf utility consumers
    do not typically override; specificity is base.

### Book Page

- **Target path:** `app/cyan-ds/src/content/principles/typography.mdx`
  (existing — `.text-caption` appears in the *Reading Scale & Utilities*
  table at line 41 and in the *Semantic vs. Utility Labs* demo at lines
  92-93).
- **Structure (existing demo set, captured here for spec coverage):**
  - **Utility table row.** One-line description: *"Uppercase, tracking +5
    (12px). For labels, category badges, navigation headers."*
  - **Live label demo.** A `<p class="text-caption">` rendering inline.
  - **Contrast pairing demo.** `<p class="text-caption text-low">` showing
    that `.text-caption` composes cleanly with the `.text-low` colour
    utility.
  - **Dark-mode override demo.** `<p class="text-caption" style="color:
    white; opacity: 0.8;">` illustrating the Elevation 4 contrast rule
    (white-on-step-40 in dark mode).

## Contract

### Definition of Done

- [x] `.text-caption` is defined exactly once in
      `packages/cyan/src/tokens/typography-semantics.css` and is loaded on
      every cyan-built page (cyan-ds, pelilauta) via the typography
      semantics import chain.
- [x] An element with `class="text-caption"` renders with `font-size:
      0.75rem`, `line-height: 1.5`, `letter-spacing: 0.05em`,
      `text-transform: uppercase`, and `font-weight: 500`.
- [x] The `.text-caption` rule references `--cn-font-weight-medium` for
      its weight (so a future re-tune of the medium weight token
      propagates to all label text).
- [x] `.text-caption` composes with `.text-low`, `.text-high`,
      `.text-default`, and per-site `color` overrides without specificity
      conflicts.
- [x] Production callers — `packages/cyan/src/components/AppFooter.astro`
      (footer credits) and
      `packages/cyan/src/components/living-style-books/ThemeSplit.astro`
      (Light / Dark labels) — render with the utility's typography
      contract intact.
- [x] cyan-ds demo callers under `app/cyan-ds/src/content/principles/`
      (`typography.mdx`, `iconography.mdx`, `units-and-grid.mdx`) and
      `app/cyan-ds/src/content/core/buttons.mdx` continue to render with
      uppercase tracked label typography.

### Regression Guardrails

- **One source of truth.** Only the rule body in
  `typography-semantics.css` may define `.text-caption`. Component-scoped
  Svelte `<style>` blocks and Astro page `<style>` blocks must not
  redeclare its values; they compose the class instead. (This is the
  load-bearing reason that motivates the spec — silent duplication is the
  most common failure mode.)
- **`text-transform: uppercase` is part of the contract.** Consumers who
  want the size + tracking without the uppercasing must override
  `text-transform: none` at the call site rather than picking a different
  utility — there is no "lowercase caption" alternate.
- **Letter-spacing override exception.** The
  `living-style-books/ThemeSplit.astro:58` selector
  (`.cn-theme-split-pane .text-caption`) increases letter-spacing on the
  Light / Dark labels for visual identity. This is a narrow scoped
  override, not a contract violation, and is permitted because it
  augments rather than replaces the utility's other declarations.
- **Not for `<code>`, `<pre>`, or `<kbd>`.** Code elements have their own
  monospace identity from the prose stylesheet; uppercasing token names
  (`--cn-grid`) or unit strings (`0.25rem (4px)`) is wrong. If a small
  monospace annotation is needed, use `<code>` plain — do not borrow
  label-typography styling. This guardrail rules out the
  `<code class="text-caption">…</code>` pattern.

### Testing Scenarios

#### Scenario: Utility renders the label-typography triple

```gherkin
Given an element <p class="text-caption">Category</p> in a rendered cyan host
When computed styles are read for the element
Then font-size resolves to 0.75rem (12px)
And line-height resolves to 1.5
And letter-spacing resolves to 0.05em
And text-transform resolves to "uppercase"
And font-weight resolves to 500
```

#### Scenario: Utility composes with colour utilities

```gherkin
Given an element <p class="text-caption text-low">Caption</p>
When computed styles are read
Then font-size, line-height, letter-spacing, text-transform, and font-weight match the .text-caption contract
And color resolves to var(--cn-text-low)
```

#### Scenario: Utility is reachable from a Svelte component's :global() block

```gherkin
Given a Svelte component that renders <div class="eyebrow text-caption">…</div>
And the component's scoped <style> declares no font-size, letter-spacing, text-transform, or font-weight on .eyebrow
When the component is rendered into a cyan host
Then the rendered element's computed font-size, letter-spacing, text-transform, and font-weight match the .text-caption contract
```

#### Scenario: Utility is exactly one rule

```gherkin
Given the cyan token CSS bundle
When all rulesets matching the selector ".text-caption" are enumerated
Then exactly one ruleset is found
And it lives in packages/cyan/src/tokens/typography-semantics.css
```

## Decisions for v20

1. **Caption and overline collapse to one rule.** The parent typography
   spec keeps the two names as semantic-authoring intent (caption for
   metadata-style labels; overline for pre-section labels), but for v20
   they share one rendered output: this utility. There is no
   `.text-overline` class. If a future version splits them visually,
   that's a typography-spec change with its own port.
2. **Hardcoded values stay.** `0.75rem`, `0.05em`, `1.5`, and `uppercase`
   stay as literals until a wider UI-scale tokenisation pass lands. The
   `--cn-font-size-caption` / `--cn-letter-spacing-caption` token namespace
   is aspirational in the parent typography spec; introducing it for one
   utility ahead of the rest of the UI scale isn't worth the partial
   coupling.
3. **Component composition over inline duplication.** When a component
   needs label typography on a non-prose element (e.g. `CnCard`'s eyebrow
   slot, future tag chips), it composes `class="…local-class text-caption"`
   and lets the global utility provide size, tracking, case, and weight.
   Local Svelte `<style>` blocks declare only colour, margin, and link
   decoration — never the typography quintet. (Enforced by the *One
   source of truth* regression guardrail above.)
4. **Code elements are out of scope.** `<code>`, `<pre>`, and `<kbd>` keep
   their monospace prose-stylesheet identity. They never carry
   `.text-caption`. Existing `<code class="text-caption">` instances in
   the cyan-ds docs (see *Known cleanups* below) are misuse and will be
   stripped.

### Known consumers in v20

**Production (cyan + consumer packages):**

- `packages/cyan/src/components/AppFooter.astro:16` — credits row.
- `packages/cyan/src/components/living-style-books/ThemeSplit.astro:23,27` —
  Light / Dark theme labels (with the scoped `letter-spacing` override
  noted above).
- `packages/cyan/src/components/CnCard.svelte` — eyebrow slot. After the
  R1 remedy from the 2026-04-30 critic review lands, the eyebrow `<div>`
  carries the `text-caption` class instead of duplicating the rule body.

**cyan-ds (docs surface only):**

- `app/cyan-ds/src/content/principles/typography.mdx:40-41,92-93,138,142,146`
  — utility table, semantic-vs-utility lab, contrast guardrails demo.
- `app/cyan-ds/src/content/core/buttons.mdx:32` — *Secondary Context*
  caption above a demo button.

### Known cleanups

The following `<code class="text-caption">…</code>` instances are misuse
per the *Not for `<code>` …* regression guardrail and should be reduced to
plain `<code>…</code>`:

- `app/cyan-ds/src/content/principles/iconography.mdx:50,54,58,62,66` —
  icon-size labels (`16` / `24` / `36` / `72` / `128`).
- `app/cyan-ds/src/content/principles/units-and-grid.mdx:29,33,37,41,45,49`
  — unit labels (`0.25rem (4px)`, `--cn-grid / 0.5rem (8px)`, etc.).
