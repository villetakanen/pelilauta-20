---
feature: Core
parent_spec: specs/cyan-ds/spec.md
---

# Feature: Core

## Blueprint

### Context

`packages/cyan/src/core/` is the home for **atomic element-level CSS**
— stylesheets that target raw HTML elements globally (not scoped Svelte
or Astro components). The DS loads these from the CSS entry so a bare
`<button>`, `<a class="button">`, or future primitive element adopts
correct DS styling with zero component overhead and full SSR-before-
hydration fidelity (ADR-001).

Distinct from:

- `components/` — scoped Svelte/Astro components (CnCard, CnIcon,
  CnLoader, AppBar, Tray, …).
- `tokens/` — custom-property declarations; no selectors beyond `:root`
  / `@media` branches.
- `utilities/` — opt-in utility classes for cross-cutting visual
  concerns (`.elevation-*`, typography helpers).
- `layouts/` — Astro structural shells that wrap pages.

### Sub-Specs

- [Buttons](buttons/spec.md) — atomic CSS for `<button>` / `<a class="button">`.
- [Dividers](dividers/spec.md) — atomic CSS for `<hr>`.

## Contract

### Definition of Done

- [ ] Every file in `packages/cyan/src/core/` targets raw HTML elements
      (no scoped component selectors).
- [ ] Each stylesheet has a matching spec under `specs/cyan-ds/core/`
      with a book page under `app/cyan-ds/src/content/core/`, so
      URL / spec / source paths mirror each other.
- [ ] Only `--cn-*` tokens are referenced; no `--color-*` / `--cyan-*`.

### Regression Guardrails

- A spec moving from `core/` to `components/` (or vice versa) must
  reflect a real architectural change — not a classification drift.
  Atomic CSS layers stay in `core/`.
