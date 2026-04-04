# Feature: Book Layout

Parent: [Cyan DS App](../spec.md)

## Blueprint

### Context

The Book layout wraps MDX documentation pages (principles, components, patterns) inside the app shell. It provides consistent page chrome — navigation, title, and content area — so MDX files only contain their actual content.

### Architecture

- **Target path:** `app/cyan-ds/src/layouts/Book.astro`
- **Composes:** `@shell/layouts/Base.astro` (HTML shell) + `@shell/nav/TopNav.svelte` (top bar)
- **Consumers:** all MDX pages under `src/pages/principles/`, and future collections

### Structure

```
Base.astro
├── slot="nav" → TopNav (appName="Cyan DS")
└── default slot → Book chrome
    ├── Page title (from frontmatter)
    └── <article> → default slot (MDX content)
```

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | yes | Page title, displayed as heading and passed to Base for `<title>` |
| `description` | `string` | no | Page description for meta/subtitle |

### MDX Usage

MDX pages declare the layout in frontmatter:

```mdx
---
layout: ../../layouts/Book.astro
title: 'Units & Grid'
description: 'Spacing, layout, and grid systems.'
---

Content goes here...
```

Astro automatically renders the MDX body into the layout's default slot.

### Anti-Patterns

- **Don't duplicate Base.astro's responsibilities** — Book doesn't set `<html>`, `<head>`, or global styles; Base handles that
- **Don't add sidebar navigation yet** — keep it minimal; sidebar can be a future enhancement
- **Don't import tokens directly** — Base.astro already imports the global token CSS

## Contract

### Definition of Done

- [ ] Layout exists at `app/cyan-ds/src/layouts/Book.astro`
- [ ] Composes Base.astro with TopNav in the nav slot
- [ ] Renders MDX content inside an `<article>` element
- [ ] Title prop renders as both `<h1>` on the page and `<title>` in the head
- [ ] An MDX page using this layout renders correctly at `pnpm dev`

### Regression Guardrails

- Every MDX page must use this layout (or a future variant) — no bare HTML documents
- Layout must not contain page-specific content; it's structural only
