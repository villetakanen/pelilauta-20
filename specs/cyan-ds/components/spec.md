---
feature: Components
---

# Feature: Components

## Blueprint

### Context
This is the root specification for all UI components in the Cyan design system. Components are building blocks designed for reuse across the Pelilauta platform and other consumer applications.

### Architecture
- **Sub-features:**
  - `AppBar`: Top navigation shell.
  - `Tray`: Side navigation drawer.
  - `CnCard`: Content container.
  - `CnAvatar`: User representation.
  - `CnIcon`: Vector iconography.
  - `CnTag`: Taxonomy indicators.
  - `CnLoader`: Async progress indicator (dual-ring spinner + context icon). Consumed inside buttons and as a standalone block.

  Interactive actions (`<button>` / `<a class="button">`) are **not**
  a component — they are atomic CSS shipped by [Core > Buttons](../core/buttons/spec.md).
- **Constraints:**
  - Components draw all visual values from `--cn-*` semantic tokens. Hardcoded pixel values, colors, or durations have no place in a component.
  - CSS and Astro SSR drive interaction. Svelte/JS appears only for high-fidelity progressive enhancements beyond what CSS can express.

## Contract

### Definition of Done
- [ ] Each component has a corresponding specification in its sub-directory.
- [ ] Each component is documented in the Living Style Book.
- [ ] Each component has unit tests for structural integrity.
