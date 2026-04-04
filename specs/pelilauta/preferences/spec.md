# Feature: User Preferences Store

## Blueprint

### Context

App-level user preferences that persist across page loads. Backed by a nanostores store with `localStorage` persistence. The DS components are stateless — they render what the app tells them. This store is the app-side counterpart that feeds state into DS components like the tray.

### Architecture

- **Store:** nanostores `persistentAtom` (or `persistentMap`)
- **Storage key:** `cn-pelilauta-prefs`
- **Location:** `app/pelilauta/src/stores/preferences.ts`

#### Preferences

| Key | Type | Default | Purpose |
|---|---|---|---|
| `trayExpanded` | `boolean` | `false` | Whether the navigation tray is open |

Additional preferences (theme, locale, etc.) can be added to this store as needed.

#### Tray State Logic

The app owns all tray state decisions:

- **On mount (wide viewport):** Read `trayExpanded` from store, pass to `<Tray expanded={...}>`
- **On mount (narrow viewport):** Ignore stored value, pass `expanded=false`
- **On toggle:** Update store, which persists to `localStorage`
- **On resize to narrow:** Override to `expanded=false` (don't write to store — the wide-viewport preference is preserved)
- **On resize to wide:** Restore from store

### Dependencies

- **nanostores** + `@nanostores/persistent` for `localStorage` sync
- Consumed by shell layout (passes `expanded` prop to `Tray`)
- Viewport mode determined by DS breakpoint token

### Anti-Patterns

- Do not read/write `localStorage` directly — go through the store
- Do not put preference logic in DS components — the DS is stateless
- Do not clear the stored wide-viewport preference when collapsing on narrow — that's a temporary override, not a user choice

## Contract

### Definition of Done

- [ ] `trayExpanded` persists to `localStorage` under `cn-pelilauta-prefs`
- [ ] Tray starts collapsed on narrow viewports regardless of stored value
- [ ] Tray restores stored state on wide viewports
- [ ] Resizing to narrow collapses without overwriting the stored preference
- [ ] Store is reactive — components re-render when preferences change

### Regression Guardrails

- Stored preference must survive page reload on wide viewports
- Narrowing the viewport must not destroy the stored wide-viewport preference
- Store key must not collide with other apps (`cn-pelilauta-prefs`, not a generic key)

### Scenarios

```gherkin
Scenario: Persist tray preference on wide viewport
  Given the user is on a wide viewport
  And they expand the tray
  When they reload the page
  Then the tray is expanded

Scenario: Ignore preference on narrow viewport
  Given the stored preference is trayExpanded=true
  And the viewport is narrow
  When the page loads
  Then the tray is collapsed

Scenario: Resize narrow to wide restores preference
  Given the stored preference is trayExpanded=true
  And the viewport is narrow (tray collapsed)
  When the viewport widens past the breakpoint
  Then the tray expands

Scenario: Resize wide to narrow preserves preference
  Given the tray is expanded on a wide viewport
  When the viewport narrows
  Then the tray collapses
  But the stored preference remains trayExpanded=true
```
