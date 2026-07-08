---
feature: CnLightbox
parent_spec: ../spec.md
stylebook_url: /components/cn-lightbox
status: draft
last_major_review: 2026-05-06
---

# Feature: CnLightbox

> Reversed from `.tmp/cyan-design-system-4/packages/cyan-lit/src/cn-lightbox/index.ts` and `.tmp/cyan-design-system-4/packages/cyan-lit/src/cn-lightbox/styles.css` (cyan-4 Lit web component). v20 ships as a Svelte 5 component per ADR-001.

## Blueprint

### Context

A responsive image gallery used inline in content where one or more images need to be presented compactly with progressive disclosure: thread bodies, reply bubbles, site pages. A single image renders as a 16:9 figure; multiple images render as a horizontally scrollable strip of square thumbnails. Activating any image opens a full-screen modal overlay for close viewing.

### Architecture

- **Component:** `packages/cyan/src/components/CnLightbox.svelte` — Svelte 5 leaf. Inline render is purely presentational and SSR-safe; the modal overlay is interactive and engages only on the client (open/close, focus, keyboard handling).
- **Props:**
  - `images: Image[]` — required input. Each entry: `{ src: string; caption: string }`. Caption is the alt text and the visible figcaption.
- **Internal state:**
  - `selectedImage: Image | null` — drives modal visibility. Set by image-figure click; cleared by modal close.
- **Markup:**
  - Single image — `<figure class="single-figure">` containing `<img loading="lazy">` and `<figcaption class="caption">`.
  - Multi image — `<div class="flex-container">` containing one `<figure class="square-figure">` per image; each figure has an absolutely positioned `<figcaption class="caption">` overlay at the bottom edge.
  - Modal — `<dialog>` element (native HTML5 modal). Contains the close button (`<cn-icon noun="close">`) and a constrained `<img>`. v20 promotes the cyan-4 `<div class="modal">` to `<dialog>` so focus trap, ESC-to-close, and the dialog landmark come from the platform instead of bespoke wiring.
  - Empty (`images.length === 0`) — renders nothing.
- **Dependencies:**
  - `CnIcon` — modal close button uses `<cn-icon noun="close">`.
  - Tokens: `--cn-lightbox-background`, `--cn-lightbox-color`, `--cn-lightbox-border-radius`, `--cn-lightbox-image-border-radius`, `--cn-lightbox-inner-spacing`, `--cn-border-radius-small`, `--cn-grid`, `--z-index-modal`.
  - The five `--cn-lightbox-*` tokens are local semantic tokens defined under `packages/cyan/src/tokens/`. They derive directly from chroma colour-tokens (`--chroma-*` scales) and base spacing/radius primitives — they are NOT aliases of `--cn-surface-*` or any other higher-level semantic token. Lightbox palette evolves independently.
  - `--z-index-modal` is a new platform token added in this milestone (does not exist in v20 yet) and lives alongside other layering tokens.
- **Constraints:**
  - SSR-safe by construction: inline render is HTML+CSS only, no `client:*` directive required for the gallery to display. The modal opens on user interaction post-hydration.
  - The host element renders inline as a `display: block` container with `aspect-ratio: 16 / 9` and `container-type: inline-size` so child layout responds to the host's width.
  - All `<img>` elements use `loading="lazy"`. Captions provide the alt text — the spec contract is that every image has a caption (empty captions are accepted but degrade alt-text quality; the consumer is responsible for supplying useful captions).
  - Single-image figures use `object-fit: cover` with `aspect-ratio: 16 / 9`. Multi-image figures use `object-fit: cover` with `aspect-ratio: 1 / 1`.
  - Multi-image container is `display: flex; flex-wrap: nowrap; overflow-x: scroll` and relies on native horizontal scroll. No wheel-event interception — trackpad two-finger swipe, shift+scroll, touch swipe, and scrollbar drag all work via the platform.
  - Multi-image container shows a right-edge fade gradient as a discoverability affordance whenever there is content scrolled off-screen to the right. Implementation: a CSS mask or layered linear-gradient fixed to the container's right edge, sized to fade out roughly the last `--cn-grid` of width.
  - Modal uses `position: fixed`, full viewport coverage, `z-index: var(--z-index-modal)`, `rgba(0, 0, 0, 0.8)` backdrop, image at `object-fit: contain` with `max-width: 90%` and `max-height: 90%`.
  - Block spacing: both the single-figure and the multi-figure container carry `margin-block-end: var(--cn-line)` so content following the lightbox in source flow has standard vertical rhythm without per-instance margins on consumers.
  - Styling uses Svelte's default scoped CSS. Inside cyan/ packages, scoped CSS is the correct boundary; the "apps never override DS" rule applies to app-layer code only.

### Book Page

- **Target path:** `app/cyan-ds/src/content/components/cn-lightbox.mdx`
- **Structure:**
  - Single-image demo (16:9 figure + figcaption).
  - Multi-image horizontal scroll demo (3+ images with overlaid captions).
  - Modal interaction demo — click any image to open, observe close behaviour.
  - Keyboard demo — open modal, press ESC to close, demonstrate focus trap.
  - Native horizontal scroll demo on the multi-image strip — trackpad gesture, mouse shift+scroll, touch swipe.
  - Right-edge fade affordance demo — strip with overflow content showing the gradient.
  - Empty-array demo — confirms void render.
  - Props table (`images: Image[]` with `Image = { src, caption }`).
  - CSS token reference listing all `--cn-*` tokens consumed.
  - Accessibility note covering caption-as-alt-text contract, the `<dialog>` element's native focus trap, and ESC-to-close.

## Contract

### Definition of Done

- [ ] `CnLightbox.svelte` ported from the cyan-4 Lit source to Svelte 5; lives at `packages/cyan/src/components/CnLightbox.svelte`.
- [ ] Exports from `packages/cyan/src/components/index.ts`.
- [ ] Empty `images` renders nothing — no figure, no flex-container, no modal markup.
- [ ] Single image renders a `<figure class="single-figure">` with 16:9 image and figcaption.
- [ ] Multiple images render a `<div class="flex-container">` of `<figure class="square-figure">` entries with overlaid captions.
- [ ] Clicking any image figure opens a modal containing that image.
- [ ] Modal is a `<dialog>` element. Closing the modal closes the dialog (native `close()` method); ESC-to-close and focus trap come from the platform.
- [ ] Close button (`<cn-icon noun="close">`) closes the modal.
- [ ] Multi-image container scrolls via native `overflow-x: scroll`; no wheel-event interception.
- [ ] Right-edge fade gradient appears on the multi-image container as a scroll affordance.
- [ ] Tokens consumed are exclusively in the `--cn-*` namespace (plus `--z-index-modal`). New `--cn-lightbox-*` semantic tokens added under `packages/cyan/src/tokens/`, defined directly from chroma colour-tokens and base primitives.
- [ ] `--z-index-modal` token added to the platform layering tokens.
- [ ] Documented in the Living Style Book at `app/cyan-ds/src/content/components/cn-lightbox.mdx` with all demos listed in §Book Page.
- [ ] Unit tests cover empty / single / multi render paths and modal open/close.

### Regression Guardrails

- **Empty input renders nothing.** No DOM, no console output, no error. Empty is a valid state.
- **Captions are alt text.** The component does not split caption from alt — the same string serves both. Consumers MUST supply meaningful captions.
- **Single-image is never horizontally scrolled.** A length-1 array always renders `.single-figure`, never `.flex-container`.
- **Modal is a `<dialog>`.** A wrapping `<div role="dialog">` is not equivalent. Native `<dialog>` provides focus trap, ESC-to-close, top-layer rendering, and the dialog landmark for assistive tech — none of which a `<div>` provides.
- **Token namespace.** Only `--cn-*` tokens (plus `--z-index-modal`). The cyan-4 source uses `--color-surface-2`, `--color-on-surface`, `--color-shadow`, `--cn-color-on-primary` — all renamed to `--cn-*` equivalents. No `--color-*` (deprecated), no `--cyan-*` (deprecated).
- **Lightbox tokens are not surface aliases.** `--cn-lightbox-background` derives from `--chroma-*` directly; it MUST NOT be defined as `var(--cn-surface-*)` or any other higher-level semantic-token alias.
- **No wheel-event interception.** Horizontal scroll is the platform's job. Re-introducing a `wheel` listener that translates `deltaY` to `scrollLeft` is a UX regression: it breaks trackpad diagonal gestures and turns the container into a page-scroll trap. The cyan-4 wheel handler is intentionally NOT carried forward.
- **SSR-safe by construction.** No `connectedCallback`, no `customElements.whenDefined` waits, no top-level browser globals. The modal logic runs in `onMount` / event handlers, not during SSR.

### Behavioural Contracts: Layout & Interaction

| Mode | Behaviour |
|------|----------|
| `images.length === 0` | Renders no DOM (no figures, no container, no dialog). |
| `images.length === 1` | `<figure class="single-figure">` containing a 16:9 lazy `<img>` and a `<figcaption class="caption">`. Clicking the figure opens the modal. |
| `images.length > 1` | `<div class="flex-container">` (horizontal scroll) with one `<figure class="square-figure">` per image. Each figure is 1:1 aspect ratio with an absolutely positioned `.caption` at the bottom. Clicking any figure opens the modal showing that image. |
| Modal open | `<dialog>` opened via `showModal()`. Image at `object-fit: contain`, max 90% viewport, 80%-black backdrop. Close button (cn-icon close) at top-right. Focus is trapped inside the dialog by the platform. |
| Modal close | Triggered by: close-button click, ESC keypress (native), backdrop click on the dialog's `::backdrop` pseudo-element. Sets `selectedImage = null` and calls `close()` on the dialog. |
| Horizontal scroll | Native `overflow-x: scroll` on the `.flex-container`. Trackpad two-finger swipe, mouse shift+scroll, touch swipe, scrollbar drag, and keyboard arrow keys (when focused) all work via the platform. No wheel-event listener. A right-edge fade gradient indicates content scrolled off-screen. |

### Testing Scenarios

#### Scenario: Empty gallery renders nothing

```gherkin
Given a CnLightbox with images = []
When rendered
Then no .single-figure, no .flex-container, and no <dialog> are present in the DOM
And no console error is emitted
```

#### Scenario: Single image renders as full-width figure

```gherkin
Given a CnLightbox with one image { src: "test.jpg", caption: "test caption" }
When rendered
Then a .single-figure element is present
And its <img> has src="test.jpg", alt="test caption", and loading="lazy"
And the <img> has computed aspect-ratio 16 / 9 and object-fit: cover
And a figcaption.caption contains "test caption"
```

#### Scenario: Multiple images render as horizontal scroll strip

```gherkin
Given a CnLightbox with two or more images
When rendered
Then a .flex-container is present with display: flex, flex-wrap: nowrap, overflow-x: scroll
And each image is wrapped in a .square-figure with computed aspect-ratio 1 / 1
And each figure has an absolutely positioned .caption at the bottom edge
```

#### Scenario: Clicking an image opens the modal

```gherkin
Given a CnLightbox with images and the modal closed
When the user clicks any image figure
Then the <dialog> element is opened (open attribute present)
And the dialog contains an <img> with src and alt matching the clicked image
And the modal image computed style has object-fit: contain, max-width: 90%, max-height: 90%
And focus moves into the dialog (native focus trap)
```

#### Scenario: Modal closes on close-button click

```gherkin
Given a CnLightbox with the modal open
When the user clicks the close button (cn-icon noun="close")
Then the <dialog> element is closed (open attribute absent)
And selectedImage is null
```

#### Scenario: Modal closes on ESC

```gherkin
Given a CnLightbox with the modal open
When the user presses the ESC key
Then the <dialog> element is closed (native dialog behaviour)
And selectedImage is null
```

#### Scenario: Modal closes on backdrop click

```gherkin
Given a CnLightbox with the modal open
When the user clicks the dialog backdrop (the area outside the modal content)
Then the <dialog> element is closed
And selectedImage is null
```

#### Scenario: Multi-image container scrolls horizontally via the platform

```gherkin
Given a CnLightbox with multiple images that overflow the container width
When the user scrolls the container horizontally (trackpad swipe, shift+scroll, touch swipe, or arrow keys with focus)
Then the container's scrollLeft updates via native overflow-x: scroll
And no JavaScript wheel listener intercepts the event
And page scroll is not affected when the user vertically scrolls the wheel over the container
```

#### Scenario: Right-edge fade indicates more content

```gherkin
Given a CnLightbox with multiple images that overflow the container width
When rendered
Then a right-edge fade gradient is visible on the .flex-container
And the gradient fades to the lightbox background colour over roughly the last var(--cn-grid) of width
```

#### Scenario: Caption serves as alt text

```gherkin
Given a CnLightbox with images = [{ src: "x.jpg", caption: "Sunset over the lake" }]
When rendered
Then the <img> has alt="Sunset over the lake"
And the <figcaption> contains "Sunset over the lake"
```
