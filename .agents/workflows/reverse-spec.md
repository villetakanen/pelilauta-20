---
description: Bootstrap a living spec by reverse-engineering intent from existing source code.
---

# Reverse-Spec Command

Reverse-engineer a **living spec** from existing source code and write it to `specs/{domain}/spec.md`. Aligned with the ASDLC Spec Engineer recipe (https://asdlc.io/recipes/spec-engineer/) — specifically its Reverse mode.

## Arguments

`$ARGUMENTS` is one of:
- A **GitHub URL** to a file or directory in a prior-version repo.
- A **local path** inside this repo.

If empty, ask the user for the source location.

## Pipeline

### 1. Fetch / read the source
- **GitHub URL:** Convert to `raw.githubusercontent.com` and fetch. For directories, list via `gh api` then fetch architectural files (schemas, components, tests).
- **Local path:** Read directly from the repo.
- Read existing tests to uncover unstated contracts.

### 2. Analyse
- **Intent** — What problem does this solve?
- **Architecture** — Components, models (paths), API contracts, integration points.
- **Behavioural contracts** — Invariants, error handling, edge cases.
- **Constraints** — State positively as facts (e.g., "Permissions are checked at the edge").
- **Migration debt** — Patterns that should NOT carry forward. Record separately for the user.

### 3. Determine spec placement
Map the source to a path in `specs/`:
- `pelilauta-17/src/components/threads` → `specs/pelilauta/threads/spec.md`
- `packages/cyan/src/components/cn-card.svelte` → `specs/cyan-ds/components/cn-card/spec.md`

### 4. Merge, don't overwrite
If the spec exists, read and merge. Use `[DEPRECATED yyyy-mm-dd]` for superseded sections instead of deleting.

### 5. Write to disk
**You MUST write to a file.** Follow `specs/TEMPLATE.md` exactly.
- Fill in Vitest / Playwright test mappings.
- Create parent skeleton specs if needed.
- Reference original source paths for provenance.

### 6. UI Architecture Constraints (Per AGENTS.md)
- **Astro (`.astro`)** for structural shells and layouts.
- **Svelte 5 (`.svelte`)** for Design System components.
- JS reserved for high-fidelity progressive enhancement only.
- Only `--cn-*` tokens are canonical.

### 7. Finish
- Show the analysis and spec to the user.
- Highlight bugs found in original source, required v20 decisions, and migration debt.
- Do **not** auto-commit.
