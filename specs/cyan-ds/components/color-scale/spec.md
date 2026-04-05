---
feature: ColorScale Documentation Component
stylebook_url: https://localhost:4322/principles/color-system
---

# Feature: ColorScale Documentation Component

## Blueprint

### Context
`ColorScale` is an internal documentation component used to visualize tonal palettes (1 to 13 steps). It allows designers and developers to verify luminance consistency across different branding hue-shifts by providing a one-click grayscale toggle.

### Architecture
- **Component:** `app/cyan-ds/src/components/ColorScale.svelte` (Svelte 5).
- **Interactivity:** Uses `$state` for local `isGrayscale` toggle.
- **Visuals:** 
  - **Color Boxes:** Renders horizontally (or flex-wrapping) with fixed heights.
  - **Contrast Labels:** Each box contains its step number (e.g., "10", "95") or a manual label.
  - **Luminance Button:** A floating or header action that applies `filter: grayscale(1)` to the entire component via a CSS class.

### Properties
- `colors`: `string[]` (Required) — Array of CSS color values (tokens, HSL, or Hex).
- `labels`: `string[]` (Optional) — Array of labels corresponding to each color. If omitted, uses standard step indices or nothing.

### Anti-Patterns
- **Do NOT put in the DS Package:** This is a documentation helper, not a system component.
- **Do NOT use for production branding:** It is specifically for the Living Style Book.

## Contract

### Definition of Done
- [ ] Renders 1 to 13 color swatches correctly.
- [ ] Text contrast inside swatches is automatically calculated (White for dark steps, Black for light steps).
- [ ] "Luminance" button successfully toggles grayscale filter.
- [ ] Responsive design (swatches wrap on mobile).

### Testing Scenarios

#### Scenario: Visual Luminance Check
```gherkin
  Given a ColorScale rendering a Primary Tonal Palette
  When the "Luminance" button is clicked
  Then the entire swatch group must turn grayscale
  And the perceived brightness of each step must remain distinguishable
```
- **Manual Verification:** Visit `/principles/color-system` and toggle the "Luminance" button on the Primary/Surface galleries.
