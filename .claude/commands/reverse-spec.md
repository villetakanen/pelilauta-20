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

### 5. Write the spec file to disk

**You MUST write the spec to a file** — do not just output analysis to chat. Create the spec at the path determined in step 3, using the template below. Create parent directories as needed.

If a parent spec should exist but doesn't (e.g. writing `cyan-ds/tokens/units/spec.md` without `cyan-ds/tokens/spec.md`), create a skeleton parent with Context, Architecture (listing children), and basic Contract sections.

````markdown
# Feature: [Feature Name]

> Reversed from: [GitHub URL]

## Blueprint

### Context
[Why does this feature exist? What problem does it solve? 1-3 sentences.]

### Architecture
- **Components:** [Key files/modules — use v20 target paths where known, note original paths]
- **Data Models:** [Schemas, types]
- **API Contracts:** [Endpoints, events, public interfaces]
- **Dependencies:** [What this depends on / what depends on this]

### Migration Notes
- [What changes for v20 — e.g. "Lit component → Svelte 5", "Remove X dependency"]
- [Bugs or tech debt from the original that should NOT be carried forward]

### Anti-Patterns
- [What agents must avoid when implementing this in v20]

## Contract

### Definition of Done
- [ ] [Observable success criterion]

### Regression Guardrails
- [Critical invariant that must never break]

### Scenarios
```gherkin
Scenario: [Name]
  Given [Precondition]
  When [Action]
  Then [Expected outcome]
```
````

### 6. Present for review

After writing the file, show the user a brief summary highlighting:

- Anything that looks like a bug in the original (not just "how it works" but "is this what we want?")
- Decisions the user needs to make for v20
- Missing context that only the user can provide

**Do NOT auto-commit.** The user must review and approve before the spec becomes truth.
