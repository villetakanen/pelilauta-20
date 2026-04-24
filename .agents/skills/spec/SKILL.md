---
name: spec
description: Create or update a living spec for a feature domain. Spec-anchored (not spec-as-source) — the spec is authority for intent and contracts; code remains authority for execution logic. For reverse-engineering an existing feature's spec, use the `reverse-spec` skill instead.
---

# Spec

Create or update a **living spec** at `specs/$ARGUMENTS/spec.md`. `$ARGUMENTS` is the feature domain path in kebab-case and may nest, e.g. `user-authentication`, `cyan-ds/tokens`, `cyan-ds/components/cn-card`. If empty, ask the user which feature to spec.

Aligned with the ASDLC Spec Engineer recipe (https://asdlc.io/recipes/spec-engineer/). For methodology depth, the ASDLC MCP knowledge base is available — `get_article('the-spec')`, `get_article('living-specs')`, `get_article('spec-driven-development')` — use it only when a judgment call about spec scope or phrasing genuinely needs it, not by default.

## Modes

1. **Create** (default) — `specs/$ARGUMENTS/spec.md` does not exist. Write a new spec.
2. **Update** — the spec exists. Ask the user what changed, then update in place per the Same-Commit Rule (spec and code change ship together).

## Pipeline

### 1. Context loading

- Read `specs/TEMPLATE.md` — the spec MUST use its structure exactly, filling in test-mapping lines. Omit sections that add no information; do not invent new ones.
- If updating, read the existing spec first.
- Read parent specs along the path (e.g. `specs/cyan-ds/spec.md` when writing `specs/cyan-ds/tokens/spec.md`).
- Check sibling/child specs that may need bidirectional references.

### 2. Research (local only)

Use only what is in the working tree or already in the conversation. **Do not fetch external URLs or explore upstream repos.** If critical context is missing, ask the user — don't go on a research tangent.

- Read source files in the feature area: components, schemas, stores, utils.
- Read existing tests — they often encode unstated contracts.
- Skim recent git history for the feature area if relevant.

### 3. Authoring

Write to `specs/$ARGUMENTS/spec.md`. Create directories as needed. Apply these principles:

- **State constraints positively.** Do not add an "Anti-Patterns" section (the project's older specs have one — it is deprecated; `specs/TEMPLATE.md` has been updated to drop it). Telling the agent what *not* to do puts the wrong approach in its context window (the pink-elephant problem). Write `All real-time updates use the WebSocket at /api/ws/events`, not `Don't poll`. Where a negative rule is genuinely necessary (security, compliance), state it as a fact under **Architecture → Constraints**.
- **Let Gherkin absorb failure modes.** Edge cases and error behaviour belong in scenarios, not in prose warnings. `Then the system does NOT store credentials in localStorage` is a verifiable contract.
- **Be specific about file paths.** `src/schemas/user.schema.ts validated against src/types/User.ts` is actionable; "the user model" is not. Agents work with files, not concepts.
- **Match depth to complexity.** A config-level feature may need one scenario and three lines of architecture. A complex integration may need many. The template gives structure, not mandatory overhead — omit sections that add no information.
- **Assume engineering competence.** Document decisions and constraints, not general knowledge. "Use React hooks" is not a spec constraint. "All component state must use `useAppState` from `src/hooks/` to persist across navigation" is.
- **Reference, don't duplicate.** Point to canonical file paths instead of copying code.
- **One spec per independently evolvable feature.** Don't create monolithic specs; nest instead.

### 4. UI architecture rules (project-specific)

Per `AGENTS.md` and ADR-001:

- **Astro (`.astro`)** — structural shells, layouts, page-level data fetching. Tray toggle is pure CSS — no JS.
- **Svelte 5 (`.svelte`)** — default for Design System components. Required for anything that may appear inside a Svelte-managed collection.
- Components must be 100% SSR-compatible and work without client-side JS; JS is reserved for high-fidelity enhancement.
- Only `--cn-*` tokens are canonical. `--cyan-*` and `--color-*` are migration debt — flag when encountered, do not propagate.

### 5. File placement

Specs nest hierarchically:

```
specs/{domain}/spec.md
specs/{domain}/{sub-feature}/spec.md
specs/{domain}/{sub-feature}/{leaf}/spec.md
```

- A child spec references its parent via `parent_spec:` in frontmatter.
- A parent spec lists its children under Architecture.

### 6. Cyan DS mapping

For Cyan work, the spec is the single source of truth for both implementation and docs semantics — there is **no** separate `specs/cyan-app/` component spec.

- Implementation: `packages/cyan/src/components/{component}.{svelte,astro}`
- Spec: `specs/cyan-ds/components/{component}/spec.md`
- Demo/docs page: `app/cyan-ds/src/pages/components/{component}.mdx`

Verify consistency across all three before finishing.

### 7. Update-mode rules

- **Same-Commit Rule.** If code changes behaviour, the spec update ships in the same commit. A spec describing yesterday's behaviour is worse than no spec — it actively misleads.
- **Deprecation over deletion.** Mark outdated sections `[DEPRECATED yyyy-mm-dd]` with rationale rather than silently removing them. This preserves the "why" of system evolution.
- Check that file paths referenced in the spec still exist in the codebase.

### 8. Validation

Before finishing, verify:

- [ ] Every Definition of Done item is independently verifiable — not vague, not compound.
- [ ] Gherkin scenarios cover the happy path, at least one error case, and relevant edge cases.
- [ ] Every scenario has a Vitest and/or Playwright test mapping filled in (or an explicit rationale for why none applies).
- [ ] Constraints are stated positively — no "Anti-Patterns" section; no "avoid X" warnings.
- [ ] Architecture references specific file paths, not abstract descriptions.
- [ ] Spec depth matches feature complexity — no 500-line spec for a config change.
- [ ] If updating: stale sections are `[DEPRECATED yyyy-mm-dd]` with rationale, not silently deleted.
- [ ] Parent/child references are bidirectional where features depend on each other.

### 9. Finish

- Show the spec to the user for review.
- If this accompanies a code change, remind them of the Same-Commit Rule.
- Do **not** auto-commit.

## Boundaries

- **Does** read source extensively to inform spec accuracy.
- **Does** create and update files under `specs/`.
- **Does not** write implementation code.
- **Does not** create issues in project trackers (may suggest PBI breakdowns).
- **Does not** modify source outside `specs/`.
- **Does not** run build, lint, or test commands.
