# Spec Command

Create or update a **living spec** for a feature domain. Specs are the permanent source of truth for a feature — they define how the system works (Blueprint) and how we know it works (Contract).

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

Write the spec to `/specs/$ARGUMENTS/spec.md`. Use this template structure. Omit sections that don't apply — keep it minimal and high-signal.

````markdown
# Feature: [Feature Name]

## Blueprint

### Context
[Why does this feature exist? What problem does it solve? 1-3 sentences.]

### Architecture
- **Components:** [Key files/modules with paths]
- **Data Models:** [Schemas, types — reference file paths, don't duplicate code]
- **API Contracts:** [Endpoints, events, public interfaces]
- **Dependencies:** [What this depends on / what depends on this]

### Anti-Patterns
- [What agents must avoid when working on this feature, with rationale]

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

### 4. Spec principles

- **Spec-anchored, not spec-as-source** — the spec defines intent and boundaries, code remains the runtime truth
- **Assume engineering competence** — document constraints and decisions, not tutorials
- **Reference, don't duplicate** — point to canonical file paths instead of copying code
- **One spec per independently evolvable feature** — don't create monolithic specs
- **Gherkin scenarios are optional** — only add them when the feature has meaningful behavioral contracts
- **Keep it maintainable** — a spec that's too detailed becomes a burden and goes stale

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

### 6. DS ↔ Docs page co-spec rule

When a spec under `specs/cyan-ds/` is created or updated, check if a corresponding docs page spec exists under `specs/cyan-app/`. If it does, update it to reflect any changes (new tokens, renamed sections, removed items). If it doesn't and the DS spec is consumer-facing (tokens, components), create a skeleton docs page spec.

The reverse also applies: when a `specs/cyan-app/` docs page spec changes, verify the underlying `specs/cyan-ds/` spec is consistent.

### 7. After writing

- Show the user the spec for review
- If this accompanies a code change, remind them of the Same-Commit Rule
- Do NOT auto-commit — let the user decide when to commit
