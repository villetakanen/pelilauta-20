# Feature: Tray Component Documentation Page

Parent: [Cyan DS App](../spec.md)

## Blueprint

### Context

A living documentation and demo page for the Tray and TrayButton components. Part of the **Components** collection. Showcases the tray's layout behavior, responsive modes, and the button's visual states. This is where TrayButton is demoed standalone.

### Architecture

- **Target path:** `app/cyan-ds/src/pages/components/tray.mdx`
- **Format:** MDX using [Book layout](../book-layout/spec.md)
- **Collection:** Components
- **Dependencies:** `Tray.astro`, `TrayButton.astro` from `packages/cyan/`, `--cn-z-*` tokens, unit tokens

### Page Structure

1. **Overview** — what the tray is, its role in app navigation, and that it's a controlled component (app owns state)
2. **TrayButton demo** — standalone TrayButton rendered in isolation, showing:
   - Idle state (hamburger)
   - Expanded state (X)
   - Hover state
   - Focus state (keyboard focus ring)
   - Click animation transition
3. **Tray demo** — embedded tray with sample nav content, toggle to expand/collapse. Shows:
   - Mobile layout (left-side overlay, 95cqw)
   - Wide layout (fixed sidebar below app bar)
   - Slide animation
4. **Props table** — documents `Tray` props (`expanded`) and `TrayButton` props (`expanded`, `label`)
5. **Integration guidance** — how the consuming app wires state (reference to preferences store pattern, not implementation details)
6. **Accessibility notes** — `aria-expanded` behavior, keyboard interaction, focus management

### Inline Demos

- TrayButton: multiple instances rendered side-by-side in different states (collapsed, expanded). Interactive toggle on click
- Tray: a contained demo (not full-viewport) showing the slide behavior. May use a bounded container to simulate viewport
- All demos use DS tokens for styling, never hardcoded values

### Anti-Patterns

- **Don't bake persistence into demos** — demos toggle state in-page, they don't touch localStorage
- **Don't demo app-level orchestration** — this page shows the DS components, not the Pelilauta preferences store
- **Don't hardcode z-index or sizing values** — use `var(--cn-z-*)` and unit tokens

## Contract

### Definition of Done

- [ ] Page exists at `app/cyan-ds/src/pages/components/tray.mdx`
- [ ] Page uses Book layout via frontmatter
- [ ] TrayButton demoed standalone in all visual states (idle, expanded, hover, focus)
- [ ] Tray demoed with sample content, toggleable
- [ ] Props tables for both Tray and TrayButton
- [ ] Accessibility section covering aria-expanded and keyboard interaction
- [ ] All demos use DS tokens, never hardcoded values

### Regression Guardrails

- TrayButton standalone demo must work without a parent Tray
- Demos must not read or write localStorage
- All demo styling via `var()` token references
