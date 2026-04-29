---
feature: CnLightbox
parent_spec: specs/cyan-ds/components/spec.md
stylebook_url: /components/cn-lightbox
status: draft
maturity: design
last_major_review: 2026-04-29
---

# Feature: CnLightbox

## Blueprint

### Context
A responsive image gallery component that presents one or more images in a compact layout. Single images render as a full-width figure; multiple images render as a horizontally scrollable strip of square thumbnails. Clicking any image opens a full-screen modal overlay for close viewing.

### Architecture
- **Components:**
  - `index.ts` — Lit web component (`cn-lightbox` custom element). **Source:** `.tmp/cyan-design-system-4/packages/cyan-lit/src/cn-lightbox/index.ts`
  - `styles.css` — Default CSS custom property overrides. **Source:** `.tmp/cyan-design-system-4/packages/cyan-lit/src/cn-lightbox/styles.css`
- **Data Models:**
  - `Image` interface:
    - `src` (string): Image URL.
    - `caption` (string): Alt text / caption text.
  - `images` (property): `Image[]`, default `[]`.
  - `_selectedImage` (private property): `Image | null`, controls modal visibility.
- **API Contracts:**
  - **Custom element:** `<cn-lightbox>`
  - **Property (array, reflected):** `images` — Array of `{ src, caption }` objects.
  - **Events:** None emitted. Modal interaction is internal state-driven.
- **Dependencies:**
  - `CnIcon`: Used for the modal close button (`<cn-icon noun="close">`).
  - `@pelilauta/utils/log` (`logError`): Emits structured errors when required data is missing.
  - `--z-index-modal` token: Modal overlay stacking context.
  - `--cn-border-radius-small` token: Image corner rounding.
  - `--cn-grid` token: Inner spacing (grid-based).
- **Constraints:**
  - Host element has `display: block` and `aspect-ratio: 16 / 9`.
  - Container uses `container-type: inline-size` for responsive sizing.
  - All images use `loading="lazy"` for progressive rendering.
  - Single image figures use `object-fit: cover` with `aspect-ratio: 16 / 9`.
  - Multi-image figures use `object-fit: cover` with `aspect-ratio: 1 / 1` inside a `flex-wrap: nowrap` horizontal scroll container.
  - Modal uses `position: fixed` covering the full viewport with `rgba(0, 0, 0, 0.8)` backdrop.
  - Modal images are constrained to `max-width: 90%` and `max-height: 90%` with `object-fit: contain`.
  - Clicking the modal backdrop (not the image or close button) closes the modal.

### Book Page
- **Target path:** `app/cyan-ds/src/content/components/cn-lightbox.mdx`
- **Structure:**
  - Single image demo.
  - Multi-image horizontal scroll demo.
  - Modal overlay demo (click interaction).
  - CSS custom properties reference.
  - Responsive behavior demo.
  - Accessibility note covering alt/caption behavior and keyboard-close interaction.
  - API table for `images` prop shape (`src`, `caption`).
  - Migration note documenting parity with cyan-4 behavior.

## Contract

### Definition of Done
- [ ] Component migrated from Lit to Svelte 5 (`CnLightbox.svelte`).
- [ ] Component is documented in the Living Style Book.
- [ ] Book page includes all required demo sections, accessibility note, and API table.
- [ ] Unit tests verify structural rendering (single image, multi-image, empty).
- [ ] Browser tests verify computed styles (aspect ratios, flex layout, scroll behavior).

### Regression Guardrails
- **Empty state:** When `images` is empty or not provided, the component renders void and emits `logError` with a `[CnLightbox]` prefix.
- **Single image:** Always renders a `.single-figure` with 16:9 aspect ratio, never enters horizontal scroll mode.
- **Multi image:** Always renders a `.flex-container` with `flex-wrap: nowrap` and `overflow-x: scroll`.
- **Modal:** Clicking the backdrop closes the modal; clicking the close button also closes it. The modal image uses `object-fit: contain`.

### Behavioral Contracts: Layout & Interaction
| Mode | Behavior |
|------|----------|
| `images.length === 0` | Renders void (no gallery figures and no modal) and emits `logError` with a `[CnLightbox]` prefix describing missing images. |
| `images.length === 1` | Renders a single `.single-figure` with a 16:9 `<img>` and a `.caption` figcaption below. Clicking the figure opens the modal. |
| `images.length > 1` | Renders a `.flex-container` (horizontal scroll) with one `.square-figure` per image. Each figure is 1:1 aspect ratio with an overlaid caption at the bottom. Clicking any figure opens the modal showing that image. |
| Modal open | Fixed overlay at `z-index: var(--z-index-modal)`. Shows the selected image at `object-fit: contain`, max 90% viewport. Close button (cn-icon close) in top-right. |
| Modal close | Clicking backdrop, close button, or setting `_selectedImage = null` closes the modal. |
| Wheel scroll | On the `.flex-container`, deltaY wheel events translate to horizontal scroll (`scrollLeft += deltaY`). |

### Testing Scenarios

#### Scenario: Empty gallery renders nothing
```gherkin
Given a cn-lightbox element with no images property set
When rendered
Then the gallery renders no figures and no modal overlay
And logError is called once with a "[CnLightbox]" prefix
```

#### Scenario: Single image renders as full-width figure
```gherkin
Given a cn-lightbox with one image { src: "test.jpg", caption: "test caption" }
When rendered
Then a .single-figure element is present
And the img has src="test.jpg", alt="test caption", and loading="lazy"
And the img has aspect-ratio: 16 / 9 and object-fit: cover
And a figcaption.caption contains "test caption"
```

#### Scenario: Multiple images render as horizontal scroll strip
```gherkin
Given a cn-lightbox with two or more images
When rendered
Then a .flex-container is present with display: flex, flex-wrap: nowrap, overflow-x: scroll
And each image is wrapped in a .square-figure with aspect-ratio: 1 / 1
And each figure has an overlaid .caption at the bottom
```

#### Scenario: Clicking an image opens the modal
```gherkin
Given a cn-lightbox with images
When the user clicks any image figure
Then a .modal overlay appears with the clicked image
And the image is rendered with object-fit: contain, max-width: 90%, max-height: 90%
And a close button (cn-icon noun="close") is visible in the top-right corner
```

#### Scenario: Modal closes on backdrop click
```gherkin
Given a cn-lightbox with the modal open
When the user clicks the modal backdrop (outside the image)
Then the modal is hidden
And _selectedImage is set to null
```

#### Scenario: Modal closes on close button click
```gherkin
Given a cn-lightbox with the modal open
When the user clicks the close button
Then the modal is hidden
And _selectedImage is set to null
```

#### Scenario: Wheel scroll on multi-image container
```gherkin
Given a cn-lightbox with multiple images
When the user scrolls the wheel on the .flex-container
Then the container scrolls horizontally by the deltaY amount
And vertical scroll (deltaX) is ignored
```
