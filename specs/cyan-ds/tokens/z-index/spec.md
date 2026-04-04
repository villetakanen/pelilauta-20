# Feature: Z-Index Tokens

Parent: [Tokens](../spec.md)

> Reversed from: https://github.com/villetakanen/cyan-design-system-4/blob/main/packages/cyan-css/src/tokens/z.css

## Blueprint

### Context

Z-index tokens define a stacking hierarchy for all layered UI components. They prevent z-index collisions and make the stacking order explicit and discoverable. Without them, components compete with magic numbers.

### Architecture

Six tokens on `:root`, defining a clear back-to-front ordering:

| Token | Value | Purpose |
|---|---|---|
| `--cn-z-tray` | 20000 | Side navigation tray |
| `--cn-z-rail` | 30000 | Bottom navigation rail / app icons |
| `--cn-z-tray-button` | 40000 | Tray toggle button (always above tray and rail) |
| `--cn-z-reply-dialog` | 41000 | Docked/modal reply dialog (DS component) |
| `--cn-z-modal` | 50000 | Modal dialogs and overlays |
| `--cn-z-snackbar` | 60000 | Toast notifications — always topmost |

**Stacking order:** tray < rail < tray-button < reply-dialog < modal < snackbar

### Migration Notes

- Renamed from `--z-index-*` to `--cn-z-*` for namespace consistency with the DS
- Values are intentionally high (20000–60000) with large increments for room to insert between layers
- The tray button being above the rail (40000 > 30000) is intentional — it must remain clickable even when the rail is visible

### Anti-Patterns

- Do not use raw z-index numbers in component styles — always reference a token
- Do not add new z-index values without updating the hierarchy table

## Contract

### Definition of Done

- [ ] All layered components consume z-index tokens, not raw numbers
- [ ] Stacking order is documented in a single place (this spec or the token file)
- [ ] No two components share a z-index value unless intentionally co-planar

### Regression Guardrails

- Snackbar must always be the topmost layer
- Tray button must always be above tray and rail
- Modal must be above all non-notification UI

### Scenarios

```gherkin
Scenario: Tray button remains clickable over rail
  Given the rail is visible
  And the tray button is rendered
  Then the tray button is above the rail in stacking order

Scenario: Modal overlays all navigation
  Given a modal is open
  Then the modal is above the tray, rail, and tray button

Scenario: Snackbar appears above modal
  Given a modal is open
  And a snackbar notification fires
  Then the snackbar is visible above the modal
```
