---
description: Bootstrap a living spec by reverse-engineering intent from existing source code.
---

# Reverse-Spec Command

Bootstrap a **living spec** by reverse-engineering intent from existing source code. Use this when migrating features from prior versions (pelilauta-17, cyan, etc.) into v20, or when speccing brownfield code that has no documentation.

## Arguments

- `$ARGUMENTS` — a GitHub URL pointing to a file or directory to reverse-spec. Examples:
  - `https://github.com/villetakanen/pelilauta-17/tree/main/src/components/client/threads`
  - `https://github.com/villetakanen/pelilauta-17/blob/main/src/schemas/ThreadSchema.ts`

If empty, ask the user for the URL.

## Workflow

### 1. Fetch the source

Fetch the raw file content from GitHub. Use the `raw.githubusercontent.com` URL pattern:
- Convert the GitHub URL to its raw equivalent and fetch with WebFetch
- **For a directory:** List contents via `gh api repos/{owner}/{repo}/contents/{path}`, then fetch key files (prioritize: schemas/types, main component, index/barrel exports, tests)
- **Don't fetch everything** — focus on the files that carry architectural intent. Skip assets, generated files, and boilerplate.

### 2. Analyze the code

Read the fetched source and identify:

- **Intent** — What does this feature do? What problem does it solve?
- **Architecture** — Components, data models, API contracts, dependencies
- **Behavioral contracts** — What invariants does the code enforce? What are the edge cases?
- **Anti-patterns in the code** — Bugs, tech debt, or patterns we should NOT carry forward to v20

**Directives:**
- **Don't trust the code blindly** — the code may contain bugs. Document what the code *does*, but flag anything that looks like a bug vs. intended behavior.
- **Describe behavior, not implementation** — "Retry limit is 5" not "variable x is assigned 5"
- **Stay high-level** — capture intent and contracts, not line-by-line narration

### 3. Determine spec placement

Map the source URL to a spec path in this project:

- Source from `pelilauta-17/src/components/client/threads` → `/specs/pelilauta/threads/spec.md`
- Source from `pelilauta-17/src/schemas/ThreadSchema.ts` → `/specs/pelilauta/threads/spec.md` (or child spec if threads parent exists)
- Source from a cyan/DS repo → `/specs/cyan-ds/{component}/spec.md`

Ask the user to confirm the spec path if the mapping is ambiguous.

### 4. Check for existing specs

If a spec already exists at the target path, read it and **merge** the reversed findings — don't overwrite. Add new sections, update architecture, extend scenarios.

#### 4.1 Cyan DS Unified Spec Rule

When reverse-speccing Cyan DS features, map documentation and implementation specs into a single DS spec path:

- DS Component execution:
  - DS spec (Single source of truth): `specs/cyan-ds/components/{component}/spec.md`
  - Docs route target: `app/cyan-ds/src/pages/components/{component}.mdx`
- Principles/Layouts/CSS:
  - DS spec: `specs/cyan-ds/{category}/{topic}/spec.md`
  - Docs route target: `app/cyan-ds/src/pages/{category}/{topic}.mdx`

Do NOT create separate `specs/cyan-app/` variants. Ensure UI Components adhere to the Lit → Astro/Svelte 5 architecture boundaries (Astro for CSS-only/SSR, Svelte for active CSR state).

### 5. Write the spec file to disk

**You MUST write the spec to a file** — do not just output analysis to chat. Create the spec at the path determined in step 3. Create parent directories as needed.

You MUST follow the structure defined in `specs/TEMPLATE.md`. Read the template and use it exactly. Ensure all test mapping logic is addressed correctly.

If a parent spec should exist but doesn't (e.g. writing `cyan-ds/tokens/units/spec.md` without `cyan-ds/tokens/spec.md`), create a skeleton parent with Context, Architecture (listing children), and basic Contract sections.

### 6. Present for review

After writing the file, show the user a brief summary highlighting:

- Anything that looks like a bug in the original (not just "how it works" but "is this what we want?")
- Decisions the user needs to make for v20
- Missing context that only the user can provide

**Do NOT auto-commit.** The user must review and approve before the spec becomes truth.
