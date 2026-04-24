---
name: reverse-spec
description: Bootstrap a living spec by reverse-engineering intent from existing source code — either a GitHub URL (v17/cyan migration) or a path in this repo. Use when migrating features from prior versions into v20, or when establishing a spec for brownfield code that has none.
---

# Reverse-Spec

Reverse-engineer a **living spec** from existing source code and write it to `specs/{domain}/spec.md`. Aligned with the ASDLC Spec Engineer recipe (https://asdlc.io/recipes/spec-engineer/) — specifically its Reverse mode. See also the `spec-reversing` article in the ASDLC MCP knowledge base if deeper methodology is needed.

## Arguments

`$ARGUMENTS` is one of:

- A **GitHub URL** to a file or directory in a prior-version repo (e.g. `https://github.com/villetakanen/pelilauta-17/tree/main/src/components/client/threads`).
- A **local path** inside this repo (e.g. `packages/cyan/src/components/cn-card.svelte`).

If empty, ask the user for the source location.

## Pipeline

### 1. Fetch / read the source

- **GitHub URL:** list contents and fetch the files that carry architectural intent: schemas/types, main component, index/barrel exports, tests. Skip assets, generated files, and boilerplate.
- **Local path:** read directly with Read/Grep/Glob.
- Read existing tests when present — they often encode unstated contracts the implementation alone doesn't reveal.

### 2. Analyse

Reconstruct architectural intent from implementation patterns. Identify:

- **Intent** — what does this feature do? What problem does it solve?
- **Architecture** — components, data models (file paths), API contracts, dependency directions, integration points.
- **Behavioural contracts** — invariants the code enforces; error handling; edge cases.
- **Constraints** — security/compliance rules encoded in the code (stated positively as facts, not as warnings).
- **Migration debt** — bugs or patterns that should NOT carry forward to v20. Record these separately as notes for the user, not inside the spec as "Anti-Patterns".

**Directives:**

- **Describe behaviour, not implementation.** "Retry limit is 5" beats "variable `x` is assigned 5".
- **Don't trust the code blindly.** Distinguish "what the code does" from "what we want". Flag anomalies for the user.
- **Stay high-level.** Capture intent and contracts, not line-by-line narration. Agents can re-read the code; they can't re-derive intent.
- **Be specific about file paths.** `src/schemas/ThreadSchema.ts` is actionable; "the thread schema" is not.

### 3. Determine spec placement

Map the source to a spec path in this repo:

- `pelilauta-17/src/components/client/threads` → `specs/pelilauta/threads/spec.md`
- `pelilauta-17/src/schemas/ThreadSchema.ts` → `specs/pelilauta/threads/spec.md` (or a child spec if a parent already exists)
- cyan / DS source → `specs/cyan-ds/{area}/spec.md`
- local path → mirror the source's feature domain

If the mapping is ambiguous, ask the user before writing.

### 4. Merge, don't overwrite

If `specs/{domain}/spec.md` already exists, **read it and merge**. Add new findings, extend scenarios, refine architecture. Preserve existing content by default; where the reversed analysis contradicts the existing spec, raise it with the user rather than silently overwriting.

Mark superseded sections `[DEPRECATED yyyy-mm-dd]` with rationale per the deprecation-over-deletion rule — don't silently delete.

### 5. Write the spec to disk

**You MUST write the spec to a file** — do not just output analysis to chat.

- Read `specs/TEMPLATE.md` and use its structure exactly. Fill in Vitest / Playwright test-mapping lines where scenarios exist. Omit sections that add no information.
- If a parent spec should exist but doesn't (e.g. writing `specs/cyan-ds/tokens/units/spec.md` without `specs/cyan-ds/tokens/spec.md`), create a skeleton parent with Context, Architecture (listing children), and a minimal Contract.
- Create directories as needed.

### 6. Authoring principles (ASDLC-aligned)

- **State constraints positively.** Do not add an "Anti-Patterns" section — the project TEMPLATE has been updated to drop it. Putting wrong approaches in the spec biases future agents toward them (pink-elephant problem). Capture constraints as facts under **Architecture → Constraints**.
- **Let Gherkin absorb failure modes.** Edge cases and error behaviour belong in scenarios. `Then the system does NOT retry after 5 attempts` is a verifiable contract.
- **Match depth to complexity.** A trivial helper needs one scenario. A complex feature needs many. The template gives structure, not mandatory overhead.
- **Assume engineering competence.** Document decisions and constraints; not tutorials or general knowledge.
- **Reference, don't duplicate.** Point to canonical file paths — including the source URL/path being reversed, so the provenance is traceable.
- **One spec per independently evolvable feature.** Nest rather than bundling.

### 7. UI architecture rules (project-specific)

Per `AGENTS.md` and ADR-001:

- **Astro (`.astro`)** — structural shells, layouts, page-level data fetching. Tray toggle is pure CSS — no JS.
- **Svelte 5 (`.svelte`)** — default for Design System components; required for anything inside a Svelte-managed collection.
- 100% SSR-compatible and progressive; JS only for high-fidelity enhancement.
- Only `--cn-*` tokens are canonical. `--cyan-*` / `--color-*` in reversed source → flag as migration debt, do not propagate into the v20 spec.

### 8. Present for review

After writing the file, summarise briefly:

- Anything that looks like a **bug** in the original (not "how it works" but "is this what we want?").
- **Decisions** the user must make for v20 (carry forward, rework, drop).
- **Missing context** only the user can supply.
- **Migration debt** discovered (deprecated tokens, tech debt patterns, etc.).

**Do NOT auto-commit.** The user reviews and approves before the spec becomes truth.

## Boundaries

- **Does** fetch and read source extensively to inform the spec.
- **Does** create and update files under `specs/`.
- **Does not** write or modify implementation code.
- **Does not** create issues in project trackers (may suggest PBI breakdowns).
- **Does not** run build, lint, or test commands.
- **Does not** auto-commit.
