---
name: spec
description: Create or update a living spec for a feature domain. Specs are the permanent source of truth for a feature — they define how the system works (Blueprint) and how we know it works (Contract).
---

# Spec Command

Create or update a **living spec** for a feature domain.

## Arguments

- `$ARGUMENTS` — the feature domain path (kebab-case, supports nesting), e.g. `user-authentication`, `cyan-ds/tokens`, `cyan-ds/tokens/colors`. If empty, ask the user what feature to spec.

## Workflow

### 1. Determine if creating or updating

Check if `/specs/$ARGUMENTS/spec.md` exists.

- **If it exists:** Read the current spec. Ask the user what changed, then update the spec in place. Follow the Same-Commit Rule — spec updates should accompany code changes.
- **If it does not exist:** Create a new spec using the template below.

### 2. Gather context

Before writing, understand the feature using **locally available information only**:

- Read relevant source files already in the codebase (components, schemas, stores, utils)
- Check for existing tests that define expected behavior
- Review recent git history for the feature area
- Check for parent/child specs that already exist under `/specs/`

**Do NOT fetch external URLs or explore upstream repos** — use only what is in the working tree or has already been provided in the conversation. If critical context is missing, ask the user rather than going on a research tangent.

### 3. Write the spec file

Write the spec to `/specs/$ARGUMENTS/spec.md`. DO NOT invent a template structure. You MUST read `specs/TEMPLATE.md` in the repository root and output the spec using exactly that structure, ensuring test mapping lines are filled out properly. Omit sections that don't apply — keep it minimal and high-signal.

### 4. Spec principles

- **Spec-anchored, not spec-as-source** — the spec defines intent and boundaries, code remains the runtime truth
- **Assume engineering competence** — document constraints and decisions, not tutorials
- **Reference, don't duplicate** — point to canonical file paths instead of copying code
- **One spec per independently evolvable feature** — don't create monolithic specs
- **Gherkin scenarios are optional** — only add them when the feature has meaningful behavioral contracts
- **Keep it maintainable** — a spec that's too detailed becomes a burden and goes stale
- **UI Architecture Boundaries:**
  - Astro (`.astro`): CSS-only components, structural layouts, server-side data fetching.
  - Svelte 5 (`.svelte`): Complex, client-side reactive state only (progressive enhancement).

### 5. File placement

Specs support hierarchical nesting. A parent spec covers the domain; child specs cover sub-features.

```
/specs/{domain}/spec.md                    # parent spec
/specs/{domain}/{sub-feature}/spec.md      # child spec
/specs/{domain}/{sub-feature}/{leaf}/spec.md  # deeper nesting
```

**Rules:**
- A child spec should reference its parent: `Parent: [Cyan DS](../spec.md)`
- A parent spec should list its children in the Architecture section
- Create directories as needed

### 6. Cyan DS Spec & Docs Rule

For Cyan work, specs and docs pages are maintained compactly. The `.mdx` doc pages act as the interactive representation of the Design System Specs.

**Mapping Rule:**

- DS component implementation (`.svelte` or `.astro`): `packages/cyan/src/components/`
- **Main Spec**: `specs/cyan-ds/components/{component}/spec.md` (Contains both engineering spec and docs context)
- App demo/docs page: `app/cyan-ds/src/pages/components/{component}.mdx`

There is **no** separate `specs/cyan-app/` component spec needed. The `specs/cyan-ds` spec serves as the single source of truth for both implementation and documentation semantics.

Verify consistency across the implementation, the MDX demo page, and the single `specs/cyan-ds` spec.

### 7. After writing

- Show the user the spec for review
- If this accompanies a code change, remind them of the Same-Commit Rule
- Do NOT auto-commit — let the user decide when to commit
