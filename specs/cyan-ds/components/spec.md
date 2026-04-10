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
  - `CnButton`: Interactive actions.

### Anti-Patterns
- **No Ad-hoc Styles**: Components must rely on the design system's semantic tokens (`--cn-*`) and should not use hardcoded pixel values or colors.
- **Minimal JavaScript**: Prioritize CSS-driven interactions and Astro SSR. Only use Svelte/JS for complex progressive enhancement.

## Contract

### Definition of Done
- [ ] Each component has a corresponding specification in its sub-directory.
- [ ] Each component is documented in the Living Style Book.
- [ ] Each component has unit tests for structural integrity.
