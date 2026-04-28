---
feature: Pelilauta (Application)
---

# Feature: Pelilauta (Application)

## Blueprint

### Context

Pelilauta is the RPG community platform: an Astro-rendered host that composes a small set of feature **packages** (each owning its own schema, UI, data access, and locale strings) into a single SSR-first site. The host orchestrates routing, layout, authentication context, and the i18n composition seam; it owns very little domain logic of its own.

### Architecture

- **Host app:** `app/pelilauta/` — Astro pages, layouts, the i18n composition seam, the auth/session boundary, and any "core" cross-cutting wiring not large enough to warrant a package.
- **Feature packages** (workspace modules, not independently published — they share a single release cycle; boundaries exist for code organization and explicit dependency direction, not for distribution). Each ships its own `./i18n` sub-export:
  - [`packages/threads`](threads/spec.md) — Discussions vertical.
  - `packages/sites` — Game-site vertical (campaign pages, libraries, character sheets). _Spec TBD._
  - Future verticals follow the same shape.
- **Shared infrastructure packages** (listed bottom-up by dependency stack):
  - [`packages/models`](models/spec.md) — Zod schemas + TS types shared across packages.
  - [`packages/firebase`](firebase/spec.md) — Firebase initialization, env-backed config, server (admin) and client SDK accessors, `firebase/auth` re-exports.
  - `packages/i18n` — translation engine consumed by the host. See [`i18n/spec.md`](i18n/spec.md).
  - [`packages/auth`](auth-package/spec.md) — CSR auth machinery: session store, `authedFetch`, login/logout UX islands, and `AuthHandler`. Behavioral contracts live in [`auth/`](auth/spec.md) and [`session/`](session/spec.md).
  - [`packages/cyan`](../cyan-ds/spec.md) — design system, including `AppShell`. DS components do **not** carry locale-bound strings; they accept text via props/slots from the host.
- **Sub-specs:**
  - [`auth/`](auth/spec.md) — login/logout UX and `/login` page.
  - [`auth-package/`](auth-package/spec.md) — `@pelilauta/auth` workspace package: shell, sub-exports, dependency direction, staged extraction DoD.
  - [`firebase/`](firebase/spec.md) — Firebase workspace + auth.
  - [`front-page/`](front-page/spec.md) — landing page composition.
  - [`i18n/`](i18n/spec.md) — translation engine and host composition.
  - [`migrations/`](migrations/spec.md) — data migrations from prior versions.
  - [`models/`](models/spec.md) — shared schemas.
  - [`preferences/`](preferences/spec.md) — user preference store.
  - [`session/`](session/spec.md) — session cookie, SSR identity, token repair, store.
  - [`threads/`](threads/spec.md) — discussions vertical.
- **Constraints:**
  - **Host owns the seams, not the domain.** Domain logic lives in feature packages. Host code is composition: routing, layout, registry assembly, session boundary.
  - **AppShell is part of the design system**, not the host. Locale-bound text inside AppShell is supplied by the host via props/slots — DS components are i18n-agnostic.
  - **Apps never override the DS.** No `<style>` blocks, inline styles, or local classes that patch DS behavior in `app/pelilauta/`. Missing DS capability is a DS bug.
  - **SSR-first, progressive enhancement.** Per ADR-001 and `CLAUDE.md`.

## Contract

### Definition of Done

- [ ] Each feature vertical is a workspace package under `packages/*` with its own spec under `specs/pelilauta/<vertical>/spec.md`.
- [ ] The host app contains no domain schemas — only composition, routing, and the i18n / auth seams.
- [ ] DS components consumed by the host carry no hard-coded user-facing strings.

### Regression Guardrails

- A new feature vertical MUST be introduced as a package, not as a folder inside `app/pelilauta/src/`.
- The host MUST NOT import internals of a feature package — only its public exports (`.`, `./i18n`, etc.).
