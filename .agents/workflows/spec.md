---
description: Create or update a living spec for a feature domain.
---

# Spec Command

Create or update a **living spec** at `specs/$ARGUMENTS/spec.md`. `$ARGUMENTS` is the feature domain path in kebab-case and may nest, e.g. `user-authentication`, `cyan-ds/tokens`, `cyan-ds/components/cn-card`. If empty, ask the user which feature to spec.

Aligned with the ASDLC Spec Engineer recipe (https://asdlc.io/recipes/spec-engineer/). For methodology depth, the ASDLC MCP knowledge base is available — `get_article('the-spec')`, `get_article('living-specs')`, `get_article('spec-driven-development')` — use it only when a judgment call about spec scope or phrasing genuinely needs it, not by default.

## Pipeline

### 1. Context loading

- Read `specs/TEMPLATE.md` — the spec MUST use its structure exactly, filling in test-mapping lines. Omit sections that add no information; do not invent new ones.
- If updating, read the existing spec first.
- Read parent specs along the path (e.g. `specs/cyan-ds/spec.md` when writing `specs/cyan-ds/tokens/spec.md`).
- Check sibling/child specs that may need bidirectional references.

### 2. Research (local only)

- Read source files in the feature area: components, schemas, stores, utils.
- Read existing tests — they often encode unstated contracts.
- Skim recent git history for the feature area if relevant.

### 3. Authoring

Write to `specs/$ARGUMENTS/spec.md`. Create directories as needed. Apply these principles:

- **State constraints positively.** Do not add an "Anti-Patterns" section. Write `All real-time updates use the WebSocket at /api/ws/events`, not `Don't poll`.
- **Let Gherkin absorb failure modes.** Edge cases and error behaviour belong in scenarios.
- **Be specific about file paths.** `src/schemas/user.schema.ts` is actionable; "the user model" is not.
- **Match depth to complexity.** Omit sections that add no information.
- **Assume engineering competence.** Document decisions and constraints, not general knowledge.
- **Reference, don't duplicate.** Point to canonical file paths instead of copying code.
- **One spec per independently evolvable feature.** Nest instead of creating monoliths.

### 4. UI architecture rules (project-specific)

Per `AGENTS.md` and ADR-001:

- **Astro (`.astro`)** — structural shells, layouts, page-level data fetching. Tray toggle is pure CSS — no JS.
- **Svelte 5 (`.svelte`)** — default for Design System components. 
- Components must be 100% SSR-compatible and work without client-side JS.
- Only `--cn-*` tokens are canonical. `--cyan-*` and `--color-*` are migration debt.

### 5. Validation

Before finishing, verify:
- [ ] Every Definition of Done item is independently verifiable.
- [ ] Gherkin scenarios cover happy path, error cases, and edge cases.
- [ ] Every scenario has a Vitest and/or Playwright test mapping.
- [ ] Constraints are stated positively — no "Anti-Patterns" section.
- [ ] Architecture references specific file paths.
- [ ] Spec depth matches feature complexity.
- [ ] If updating: stale sections are `[DEPRECATED yyyy-mm-dd]` with rationale.

### 6. Finish

- Show the spec to the user for review.
- If this accompanies a code change, remind them of the Same-Commit Rule.
- Do **not** auto-commit.
