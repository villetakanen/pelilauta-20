---
feature: CnCard
parent_spec: specs/cyan-ds/components/spec.md
stylebook_url: https://cyan-4.netlify.app/custom-elements/cn-card/
---

# Feature: CnCard

## Blueprint

### Context
A flexible content container used to group related information. Optimized for Svelte-based reactivity and server-side rendering, enabling its use in sortable lists and interactive grids.

### Architecture
- **Components:** 
  - `CnCard.svelte`: Svelte 5 component (Runes-based).
- **Data Models:**
  - `CnCardProps`:
    - `elevation`: 0-4 (0 = flat, 1-4 = increasing shadow **and** background surface). Default: 1.
    - `href`: Optional URL. Wraps the **title row** (icon + title text) in an `<a>` link. When `cover` is also present, the cover image is also wrapped in a link. The root element is always `<article>`.
    - `cover`: Optional URL for the poster image.
    - `srcset`: Optional responsive image source set.
    - `sizes`: Optional browser hints for image selection.
    - `title`: **String** prop. Rendered as `h4` with 2-line truncation.
    - `description`: **String** prop. Rendered as `<p>` below the title.
    - `noun`: Icon name (e.g., 'star', 'books').
    - `notify`: Boolean. Shows a blue triangular corner flag (top-right, via `::after`).
    - `alert`: Boolean. Shows an amber/warning triangular corner flag (top-right, via `::after`). Overrides `notify` visually when both are set.
- **API Contracts:** 
  - **Props (string):**
    - `title`: Primary heading text (rendered as `h4` with 2-line truncation). If `href` is also set, wrapped in an `<a>` tag alongside the inline icon (if any).
    - `description`: Secondary content snippet (rendered as `<p>`).
  - **Slots (Snippet):**
    - `actions`: Bottom nav area for buttons/links. Rendered in `<nav>`, bleeds to card edges via negative margins.
    - `default`: Main body content (use sparingly — 1-3 paragraphs max).
- **Dependencies:** 
  - `CnIcon`: Used for the `noun` prop.
  - `elevation.css` utility classes (handles background, shadow, and relative nesting).
  - `--chroma-primary-95` / `--chroma-primary-30` tokens for cover tint gradient (`light-dark()` aware, `hard-light` blend).
  - CSS custom properties for theming (border-radius, typography).

### Book Page
- **Target path:** `app/cyan-ds/src/content/components/cn-card.mdx`
- **Structure:** 
  - Basic usage demo.
  - Properties table.
  - Slots table.
  - Elevation scale (0-4).
  - UI states (notify, alert).
  - Cover image variant (with and without icon).
  - Responsive image demos (`srcset`).
  - Actions slot demo.
  - Linked title demo.
  - Long title truncation demo.
  - CSS custom properties reference.
  - Typography tokens reference.

### Anti-Patterns
- **Over-contenting**: Cards should be concise (recommendation: 1-3 short paragraphs).
- **Whole-card clickable**: The card surface must not be an `<a>`. Only the title (and cover if present) are linked via `href`.

## Contract

### Definition of Done
- [x] Component is implemented in Svelte 5 (`CnCard.svelte`).
- [x] Root element is always `<article>`. Never `<a>`.
- [x] `title` is a **string** prop, not a Snippet slot.
- [x] `description` is a **string** prop, not a Snippet slot.
- [x] If `href` is set, the title text (inside `<h4>`) is wrapped in an `<a>` link.
- [x] If `href` and `cover` are both set, the cover image is also wrapped in an `<a>` link.
- [x] Long titles are truncated to exactly 2 lines with ellipsis (`-webkit-line-clamp: 2`).
- [x] `notify` and `alert` are triangular corner flags (top-right, `::after` pseudo-element with `clip-path`), not dots.
- [x] `noun` icon positioned adjacent to title without cover; top-right with cover.
- [x] Cover images have a branded tint gradient overlay (`light-dark()` chroma-primary, `hard-light` blend).
- [x] Elevation uses `.elevation-N` utility class from `elevation.css` (elevation 1 is shadowless).
- [x] Card uses `flex-direction: column` with a spacer to push `actions` to the bottom.
- [x] Card has `min-height: calc(7 * var(--cn-line))`.
- [x] Card uses `container-type: inline-size` and `cqw` units for cover sizing.
- [x] Actions nav bleeds to card edges via negative margins.
- [x] Body text uses `--cn-text-low` for low-emphasis color.
- [x] Component remains responsive and accessible (focus-visible on title link).

### Regression Guardrails
- **Theming**: Must use `.elevation-N` utility classes from `elevation.css` (handles background + shadow + relative nesting).
- **Typography Integration**: Headline must default to `Heading 4` styles via `--cn-font-size-headline-card`.
- **Indicators**: Must use `clip-path: polygon(100% 0, 0 0, 100% 100%)` for the triangular shape, not round dots.

### Behavioral Contracts: Position & Visuals
| Prop | Behavior |
|------|----------|
| `noun` | Positioned adjacent to title if no `cover`. Repositioned to top-right (absolute) if `cover` is present. Icon gets `size="large"` with cover, `size="small"` without. |
| `elevation` | Applies `.elevation-N` utility class from `elevation.css`. Elevation 1 is shadowless per spec. |
| `href` | Wraps title row (icon + text) in `<a>`. If `cover` is also set, wraps cover image in `<a>` too. Cover link has `tabindex="-1"` to avoid double focus. |
| `srcset` | Applied to the internal `<img>` element for responsive optimization. |
| `notify` | Blue triangular corner flag, top-right via `::after`. Uses `--cn-color-info`. |
| `alert` | Red triangular corner flag, top-right via `::after`. Uses `--cn-color-warning`. Overrides notify when both set. |

### Testing Scenarios

#### Scenario: Elevation utility class
```gherkin
Given a CnCard component
When the [elevation] prop is set to 0-4
Then the .elevation-N utility class should be applied
And elevation 1 (default) should be shadowless per elevation.css spec
```
- **Vitest Unit Test:** `packages/cyan/src/components/CnCard.test.ts`

#### Scenario: Triangular corner indicators
```gherkin
Given a CnCard with [notify=true]
When rendered
Then the .cn-card element should have class "has-notify"
And the ::after pseudo-element provides the triangular flag
```
- **Vitest Unit Test:** `packages/cyan/src/components/CnCard.test.ts`

#### Scenario: Linked Title (not Linked Card)
```gherkin
Given a CnCard with href="/path" and title="Session"
When rendered
Then the root element should be an <article> tag
And the <h4> should contain an <a> linking to "/path"
And the <a> should have a focus ring matching the Cyan design system design
```
- **Playwright E2E Test:** `app/pelilauta/e2e/card.spec.ts`

#### Scenario: Cover linked with href
```gherkin
Given a CnCard with href="/path" and cover="/img.jpg"
When rendered
Then the cover image should be wrapped in an <a> linking to "/path"
And the cover link should have tabindex="-1"
```
- **Vitest Unit Test:** `packages/cyan/src/components/CnCard.test.ts`

#### Scenario: Description as string
```gherkin
Given a CnCard with description="Some text"
When rendered
Then a <p class="description"> should contain "Some text"
```
- **Vitest Unit Test:** `packages/cyan/src/components/CnCard.test.ts`
