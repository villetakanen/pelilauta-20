# DS Spec Clearing Plan

## Goal

Align current implementation and specs with the new mandatory DS mapping rule:

- one dedicated docs page per DS component (`.svelte` / `.astro`)
- same rule for principles, layouts, and CSS styling sets
- exceptions only when explicitly stated in spec text

## Truth Model (Authoritative Rule)

- Specs are the source of truth.
- If implementation exists without a corresponding required spec, treat that implementation as non-compliant (hallucinated) until the spec exists.
- Remediation order is always: define/update spec first, then align implementation.

## Scan Summary (Current State)

- DS components found in `packages/cyan/src/components/`:
  - `Button.svelte`
  - `Tray.astro`
  - `TrayButton.astro`
- DS layouts in `packages/cyan/src/layouts/`: none
- DS CSS sets in `packages/cyan/src/css/`: none
- DS principles docs pages exist under `app/cyan-ds/src/pages/principles/`:
  - `units-and-grid.mdx`
  - `chroma.mdx`
  - `semantic-colors.mdx`
  - `z-index.mdx`

## Gaps To Amend

### 1) Component mapping gaps (highest priority)

- Missing dedicated component page specs under `specs/cyan-app/components/` for all current components (current implementation is non-compliant until these specs exist).
- Missing dedicated component routes under `app/cyan-ds/src/pages/components/` for all current components.
- Current tray docs spec is not in the new canonical location:
  - exists: `specs/cyan-app/tray/spec.md`
  - should move/split to: `specs/cyan-app/components/tray/spec.md`

### 2) DS component spec structure gaps

- Current DS component spec location is partially grouped:
  - exists: `specs/cyan-ds/components/tray/spec.md`
- Missing DS specs for implemented components (non-compliant until spec is created):
  - `specs/cyan-ds/components/button/spec.md`
  - `specs/cyan-ds/components/tray-button/spec.md`

### 3) Front page content drift

- `app/cyan-ds/src/pages/index.astro` currently embeds tray demos.
- With dedicated `/components/*` pages now required, index should become a landing page and link to component docs instead of acting as a component demo surface.

### 4) Principles naming consistency

- Principle specs currently live flat under `specs/cyan-app/` (for example `specs/cyan-app/chroma/spec.md`), while rule now expects `specs/cyan-app/principles/{topic}/spec.md`.
- Principle app routes already match (`/principles/*.mdx`), but spec paths should be normalized.

### 5) Layouts and CSS sets (currently empty domains)

- No current DS layouts under `packages/cyan/src/layouts/`.
- No current DS CSS sets under `packages/cyan/src/css/`.
- No immediate implementation gaps, but rule should be treated as mandatory when first layout/CSS set appears.

## Action Plan

1. Create canonical DS component specs:
   - `specs/cyan-ds/components/button/spec.md`
   - `specs/cyan-ds/components/tray/spec.md` (keep/update)
   - `specs/cyan-ds/components/tray-button/spec.md`

2. Create canonical cyan-app component page specs:
   - `specs/cyan-app/components/button/spec.md`
   - `specs/cyan-app/components/tray/spec.md`
   - `specs/cyan-app/components/tray-button/spec.md`

3. Migrate/replace old tray page spec path:
   - deprecate `specs/cyan-app/tray/spec.md`
   - move content into `specs/cyan-app/components/tray/spec.md`
   - keep explicit exception only if tray + tray-button intentionally share one page

4. Implement missing component docs routes:
   - `app/cyan-ds/src/pages/components/button.mdx`
   - `app/cyan-ds/src/pages/components/tray.mdx`
   - `app/cyan-ds/src/pages/components/tray-button.mdx`

5. Amend index page behavior:
   - remove component demo blocks from `app/cyan-ds/src/pages/index.astro`
   - keep index as orientation/entry page with links to `/principles/*` and `/components/*`

6. Normalize principles spec paths:
   - move to:
     - `specs/cyan-app/principles/units-and-grid/spec.md`
     - `specs/cyan-app/principles/chroma/spec.md`
     - `specs/cyan-app/principles/semantic-colors/spec.md`
     - `specs/cyan-app/principles/z-index/spec.md`
   - update references in `specs/cyan-app/spec.md`

7. Add forward guardrails:
   - when adding new `packages/cyan/src/layouts/*` item, require matching:
     - `specs/cyan-app/layouts/{layout}/spec.md`
     - `app/cyan-ds/src/pages/layouts/{layout}.mdx`
   - when adding new `packages/cyan/src/css/*` set, require matching:
     - `specs/cyan-app/css/{set}/spec.md`
     - `app/cyan-ds/src/pages/css/{set}.mdx`

## Suggested Execution Order

1. Specs migration (paths + parent references)
2. Create missing DS/component/docs specs (close hallucination gaps)
3. Create or amend implementation pages to match specs
4. Clean up index page
5. Run docs app and verify routes
