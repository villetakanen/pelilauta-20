# Layout: AppShell

## Description

The `AppShell` provides the absolute HTML root for all applications in the workspace. It owns the `<html>`, `<head>`, and `<body>` boilerplate, loads global CSS semantics, and orchestrates the semantic UI regions (`<header>`, `<aside>`, `<main>`) based on layout modes.

By orchestrating these internally, down-stream applications can remain entirely stateless regarding layout management. AppShell uses `display: grid` driven by `.layout-*` classes on the `<body>` to precisely position content without CSS collisions.

## Properties

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | `string` | Yes | - | Document `<title>` (browser tab / SEO) title string. |
| `appTitle` | `string` | No | `title` | Optional UI title for the `<AppBar>`. Allows context decoupling (e.g., "Mekanismi" or "Cyan Design System"). |
| `shortTitle` | `string` | No | - | Optional short title for the `<AppBar>` on narrow screens. |
| `layout` | `"view" \| "sidebar" \| "editor" \| "modal"` | No | `"view"` | Core structural layout variation determining UI elements present. |
| `trayLabel` | `string` | No | `"Menu"` | Aria-label for the `<Tray>` component. |
| `backHref` | `string` | No | `"/"` | Provide a specific return URL for the `<AppBar>` when `layout='modal'`. |
| `noun` | `string` | No | — | Forwarded to `<AppBar>` as the leading noun-icon glyph. |
| `asPageHeading` | `boolean` | No | `false` | Forwarded to `<AppBar>`. When `true`, the AppBar title renders as `<h1>` instead of `<h3>` so the shell owns the page's single top-level heading. |

## Slots

| Slot | Purpose | Notes |
|---|---|---|
| (default) | Page content rendered inside `<main>`. | Required. |
| `actions` | Trailing actions in the AppBar. | Forwarded to `<AppBar>`. |
| `tray` | Tray contents (sidebar layout only). | Rendered iff `layout="sidebar"`. |
| `app-background-poster` | Singleton decorative background. | See `CnBackgroundPoster`. |
| `footer` | Footer content rendered inside [`<SiteFooter>`](../../components/site-footer/spec.md). | Rendered iff `layout !== "modal"`. |

## Layout Variants & Semantics

1. **`layout="view"`**
   - Core tags: `<body>`, `<header>`, `<main>`
   - State: The standard, uncluttered view. `<AppBar>` lives in the `<header>` block, content flows into `<main>`. 
   
2. **`layout="sidebar"`**
   - Core tags: `<body>`, `<aside>`, `<header>`, `<main>`
   - State: Primary application view. It spawns the `<Tray>` inside the `<aside>`. Body acts as a CSS Grid where the aside is anchored left on desktop and `main` fills the void.

3. **`layout="editor"`**
   - Core tags: `<body>`, `<header>`, `<main>`
   - State: Focus mode. The `<main>` container sheds all internal padding and max-widths, relying on `100dvh` and hidden overflow to allow an application canvas to fill all available pixel space.

4. **`layout="modal"`**
   - Core tags: `<body>`, `<header>`, `<main>`
   - State: Contextual interaction. The `<AppBar>` receives the `mode="modal"` prop. The `<main>` section restricts its `max-width` and enforces centering, graying out unused background space.

## Testing Maps

We adhere strictly to behavioral mapping for UI assurance.

### Unit Tests (Vitest)
File: `packages/cyan/src/layouts/app-shell.test.ts`
- Must assert the `AppShell` component outputs `<html>`, `<body>`, and a globally correct `<title>` node.
- Must verify that `layout="sidebar"` spawns the `<Tray>` module into the DOM.
- Must verify that `layout="modal"` assigns `mode="modal"` to the internal `<AppBar>` output.

### E2E Tests (Playwright)
File: `app/cyan-ds/e2e/layouts/app-shell.spec.ts`
- Feature: Responsive Grid
  - Given the `sidebar` layout
  - When the viewport is `>= 64rem`
  - Then the `<main>` content should not overlap the opened `<Tray>` width.
