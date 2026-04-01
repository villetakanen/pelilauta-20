# Feature: Shell Package

## Blueprint

### Context

The shell package (`packages/shell/`) provides the shared HTML document shell and navigation primitives used by all Pelilauta apps (cyan-ds, pelilauta). It owns the `<html>`/`<head>`/`<body>` boilerplate, global style imports, and reusable navigation components. Apps compose these into app-specific layouts.

### Architecture

- **Source:** `packages/shell/src/`
- **Alias:** `@shell` (configured per-app in `astro.config.mjs`)
- **Consumers:** `app/cyan-ds/`, `app/pelilauta/`

### Components

#### `layouts/Base.astro`

The root HTML document layout. All app pages ultimately render inside this.

- Sets `<!doctype html>`, `<html lang="en">`, `<head>`, `<body>`
- Imports global token CSS (`@cyan/tokens/index.css`) and fonts (`@cyan/fonts/fonts.css`)
- Applies global reset (`box-sizing`, margin reset)
- Sets body font, color, and background from `--cyan-*` tokens
- Wraps content in `<main>` with max-width and inline padding

**Slots:**

| Slot | Purpose |
|---|---|
| `nav` (named) | Navigation component (e.g. TopNav) |
| default | Page content inside `<main>` |

**Props:**

| Prop | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | yes | Document `<title>` |

#### `nav/TopNav.svelte`

Top navigation bar with app branding.

- Displays app name as a home link
- Styled with `--cyan-*` tokens for surface, outline, and primary colors

**Props:**

| Prop | Type | Required | Description |
|---|---|---|---|
| `appName` | `string` | yes | App name displayed in the brand link |

### Anti-Patterns

- **Don't put app-specific layout logic in shell** — shell is shared infrastructure; app-specific layouts (e.g. Book.astro) live in the consuming app
- **Don't import shell components without the `@shell` alias** — keeps the dependency explicit and consistent across apps
- **Don't add page routing or content concerns to Base.astro** — it's a document shell, not a page template

## Contract

### Definition of Done

- [ ] Base.astro renders a valid HTML5 document with global tokens and fonts loaded
- [ ] TopNav renders app name as a clickable home link
- [ ] Both components are importable via `@shell/` alias from any consuming app
- [ ] Global reset applies `box-sizing: border-box` and margin reset

### Regression Guardrails

- Base.astro must always import token CSS — removing it breaks all downstream pages
- TopNav must remain a Svelte component (requires `client:load` for hydration)
