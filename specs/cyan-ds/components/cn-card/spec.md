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
    - `elevation`: 0-4 (0 = flat/bordered, 1-4 = increasing shadow). Default: 1.
    - `href`: Optional URL. If present, the root container is an `<a>` element.
    - `cover`: Optional URL for the poster image.
    - `srcset`: Optional responsive image source set.
    - `sizes`: Optional browser hints for image selection.
    - `noun`: Icon name (e.g., 'star', 'books').
    - `notify`: Boolean. Shows a blue indicator dot (top-right).
    - `alert`: Boolean. Shows a red indicator dot (top-right).
- **API Contracts:** 
  - **Slots:**
    - `title`: Primary heading (rendered as `h4` with 2-line truncation).
    - `description`: Secondary content snippet.
    - `actions`: Footer area for buttons/links (typically using `.toolbar`).
    - `default`: Main body content.
- **Dependencies:** 
  - `CnIcon`: Used for the `noun` prop.
  - `--cn-shadow-elevation-*` tokens.
  - CSS custom properties for theming (background, radius).

### Book Page
- **Target path:** `app/cyan-ds/src/content/components/cn-card.mdx`
- **Structure:** 
  - Default card demo.
  - Elevation scale (0-4).
  - Poster/Cover variant (with and without icons).
  - Responsive image demos (`srcset`).
  - Notification and Alert states.
  - Interactive actions (slots).

### Anti-Patterns
- **Nested Interactivity**: Avoid placing clickable elements inside a card that has an `href` prop.
- **Over-contenting**: Cards should be concise (recommendation: 1-3 short paragraphs).

## Contract

### Definition of Done
- [ ] Component is implemented in Svelte 5 (`CnCard.svelte`).
- [ ] Root element is `<a>` if `href` prop is provided, otherwise `article`.
- [ ] Long titles are truncated to exactly 2 lines with ellipsis (`-webkit-line-clamp: 2`).
- [ ] `notify` and `alert` badges appear as distinct dots in the top-right corner.
- [ ] Component remains responsive and accessible (aria-labels for badges).

### Regression Guardrails
- **Theming**: Must use `--cn-card-background` and `--cn-card-box-shadow` which are grounded in semantic tokens.
- **Typography Integration**: Headline must default to `Heading 4` styles via `--cn-font-size-headline-card`.

### Behavioral Contracts: Position & Visuals
| Prop | Behavior |
|------|----------|
| `noun` | Positioned adjacent to title if no `cover`. Overlaid/integrated if `cover` is present. |
| `elevation` | Maps directly to `--cn-shadow-elevation-[value]`. Elevation 0 removes shadow and adds a subtle border. |
| `srcset` | Applied to the internal `<img>` element for responsive optimization. |

### Testing Scenarios

#### Scenario: Svelte 5 Reactivity
```gherkin
Given a CnCard component
When the [elevation] prop changes from 1 to 3
Then the container class/style should update to reflect the new shadow elevation token
```
- **Vitest Unit Test:** `packages/cyan/src/components/CnCard.test.ts`

#### Scenario: Visual Indicators
```gherkin
Given a CnCard with [notify=true] and [alert=true]
When rendered
Then both a blue indicator and a red indicator should be visible in the top-right corner
And they should be positioned so as not to overlap
```
- **Vitest Unit Test:** `packages/cyan/src/components/CnCard.test.ts`

#### Scenario: Linked Card Accessibility
```gherkin
Given a CnCard with href="/path"
When rendered
Then the root element should be an <a> tag
And it should have a focus ring matching the Cyan design system design
```
- **Playwright E2E Test:** `app/pelilauta/e2e/card.spec.ts`
